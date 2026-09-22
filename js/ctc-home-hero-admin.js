// Homepage Hero uses the Gallery's ctc-media storage and site_settings.
// Upload the original file; no photo cropping, resizing, or re-encoding.
import { supabase } from './supabase-admin.js';
const $ = id => document.getElementById(id);
const preview = $('ctcHomeHeroPreview');
const input = $('ctcHomeHeroFile');
const save = $('ctcHomeHeroSave');
const reset = $('ctcHomeHeroReset');
const notice = $('ctcHomeHeroMessage');
let objectUrl = '';
let selectedFile = null;
let stored = { type: 'default' };
function alertStatus(message, error = false) {
  notice.textContent = message;
  notice.className = 'form-message ' + (error ? 'error' : 'success');
}
function releasePreview() {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = '';
}
function draw(setting, localUrl = '') {
  preview.replaceChildren();
  const type = setting?.type;
  const source = localUrl || setting?.url || '';
  if (!['video', 'image'].includes(type) || !source) {
    const original = document.createElement('video');
    original.src = '../assets/video/ctc-home-hero-hq-20260921.mp4';
    original.muted = true; original.defaultMuted = true;
    original.autoplay = true; original.loop = true; original.playsInline = true;
    original.setAttribute('playsinline', ''); original.setAttribute('muted',''); original.controls = true;
    original.poster = '../assets/video/ctc-home-hero-poster.jpg'; original.preload = 'auto';
    preview.append(original);
    original.play().catch(() => {});
    return;
  }
  const media = document.createElement(type === 'video' ? 'video' : 'img');
  if (type === 'video') {
    media.autoplay = true; media.loop = true; media.muted = true;
    media.defaultMuted = true; media.playsInline = true;
    media.setAttribute('playsinline', '');
    media.preload = 'auto';
  } else media.alt = 'Homepage hero preview';
  media.src = source;
  preview.append(media);
  if (type === 'video') media.play().catch(() => {});
}
function kind(file) {
  if (!file?.size) throw Error('Choose a picture or video first.');
  const name = file.name || '';
  const isImage = ['image/jpeg','image/png','image/webp','image/gif'].includes(file.type);
  const isVideo = ['video/mp4','video/quicktime','video/webm','video/x-m4v'].includes(file.type) || (/\.(mov|mp4|m4v|webm)$/i.test(name) && file.type.startsWith('video/'));
  if (!isImage && !isVideo) throw Error('Use JPG, PNG, WebP, GIF, MP4, MOV, M4V or WebM.');
  if (file.size > (isVideo ? 1024 * 1024 * 1024 : 10 * 1024 * 1024))
    throw Error(isVideo ? 'Video must be 1 GB or less.' : 'Picture must be 10 MB or less.');
  return isVideo ? 'video' : 'image';
}
async function loadCurrent() {
  const { data, error } = await supabase.from('site_settings')
    .select('setting_value').eq('setting_key','ctc_home_hero_media').maybeSingle();
  if (error) throw error;
  let parsed = {type:'default'};
  try { parsed = JSON.parse(data?.setting_value || '{"type":"default"}'); } catch {}
  stored = parsed;
  if (!selectedFile) draw(stored);
}
input?.addEventListener('change', () => {
  releasePreview();
  selectedFile = input.files?.[0] || null;
  if (!selectedFile) { draw(stored); return; }
  try {
    const type = kind(selectedFile);
    objectUrl = URL.createObjectURL(selectedFile);
    draw({type}, objectUrl);
    alertStatus('Preview only. Press SAVE HERO to publish. Full original file will be uploaded.');
  } catch (error) {
    selectedFile = null; input.value = ''; draw(stored);
    alertStatus(error.message, true);
  }
});
save?.addEventListener('click', async () => {
  try {
    if (!selectedFile) throw Error('Choose a picture or video to save.');
    const type = kind(selectedFile);
    save.disabled = true; reset.disabled = true;
    alertStatus('Uploading hero. Keep Admin open until it finishes.');
    const originalName = (selectedFile.name || 'ctc-hero').toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
    const path = `${type==='video'?'gallery-videos':'gallery'}/home-hero-${Date.now()}-${crypto.randomUUID()}-${originalName}`;
    const { error: uploadError } = await supabase.storage.from('ctc-media')
      .upload(path, selectedFile, {cacheControl:'3600',upsert:false,contentType:selectedFile.type||undefined});
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('ctc-media').getPublicUrl(path);
    if (!data?.publicUrl) throw Error('Upload completed but no public URL was returned.');
    const setting = {type,url:data.publicUrl};
    const { error: settingError } = await supabase.from('site_settings').upsert({
      setting_key:'ctc_home_hero_media', setting_value:JSON.stringify(setting),
      updated_at:new Date().toISOString()
    },{onConflict:'setting_key'});
    if (settingError) throw settingError;
    stored = setting;
    selectedFile = null; input.value = ''; releasePreview(); draw(stored);
    alertStatus('Homepage hero saved. Refresh the live homepage to see it.');
  } catch (error) { alertStatus('Hero was not published: ' + (error.message||error),true); }
  finally { save.disabled = false; reset.disabled = false; }
});
reset?.addEventListener('click', async () => {
  if (!confirm('Restore the original CTC homepage video?')) return;
  reset.disabled = true; save.disabled = true;
  try {
    const { error } = await supabase.from('site_settings').upsert({
      setting_key:'ctc_home_hero_media',setting_value:JSON.stringify({type:'default'}),
      updated_at:new Date().toISOString()
    },{onConflict:'setting_key'});
    if (error) throw error;
    stored = {type:'default'}; selectedFile = null; input.value = '';
    releasePreview(); draw(stored);
    alertStatus('Original homepage video restored. Refresh the live homepage.');
  } catch(error) { alertStatus('Reset failed: '+(error.message||error),true); }
  finally { reset.disabled = false; save.disabled = false; }
});
document.querySelector('#adminTabs [data-tab="homepage"]')?.addEventListener('click', () => {
  loadCurrent().catch(error => alertStatus('Could not load hero settings: '+error.message,true));
});
loadCurrent().catch(error => alertStatus('Could not load hero settings: '+error.message,true));
window.addEventListener('pagehide',releasePreview);
