import { supabase } from './supabase-config.js';
const DEFAULT_ADMIN='../assets/ctc-login-art.jpeg';
const DEFAULT_FIGHTER='../assets/ctc-login-art.jpeg';
let currentZoom=1;
export function applyWalkinArt(url,zoom=currentZoom){
 currentZoom=Math.max(.6,Math.min(1,Number(zoom)||1));
 const clean=String(url||'').trim();
 const allowed=(()=>{if(!clean)return '';try{const u=new URL(clean,location.href);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}})();
 for(const selector of ['.admin-walkin-art','.walkin-bg']){
  const el=document.querySelector(selector);if(!el)continue;
  el.style.setProperty('--ctc-art-zoom',String(currentZoom));
  el.style.backgroundImage=`url("${(allowed||(selector==='.admin-walkin-art'?DEFAULT_ADMIN:DEFAULT_FIGHTER)).replace(/["\\]/g,'')}")`;
 }
 const preview=document.getElementById('ctcWalkinArtPreview');
 if(preview)preview.src=allowed||DEFAULT_ADMIN;
 return allowed;
}
export async function loadWalkinArt(){
 try{
  const [{data,error},{data:zoomData,error:zoomError}]=await Promise.all([supabase.from('site_settings').select('setting_value').eq('setting_key','ctc_login_walkin_art_url').maybeSingle(),supabase.from('site_settings').select('setting_value').eq('setting_key','ctc_login_walkin_art_zoom').maybeSingle()]);
  if(error)throw error;if(zoomError)console.warn('Artwork zoom setting:',zoomError.message);return applyWalkinArt(data?.setting_value||'',zoomData?.setting_value||1);
 }catch(e){console.warn('CTC walk-in artwork fallback:',e?.message||e);return applyWalkinArt('')}
}
