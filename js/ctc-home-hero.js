// CTC home page hero media: site_settings mirrors the Gallery media workflow.
import { supabase } from './supabase-config.js';
const hero = document.querySelector('body.home-bg-page .hero');
const DEFAULT_POSTER='/assets/video/ctc-home-hero-poster.jpg';
function prepareVideo(media){
  media.autoplay=true;media.loop=true;media.muted=true;media.defaultMuted=true;media.playsInline=true;
  media.setAttribute('muted','');media.setAttribute('playsinline','');media.setAttribute('webkit-playsinline','');
  media.preload='auto';media.poster=DEFAULT_POSTER;
  const play=()=>media.play().catch(()=>{});
  media.addEventListener('canplay',play,{once:true});
  window.addEventListener('pageshow',play,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)play()},{passive:true});
  return media;
}
if(hero){
 try{
  const {data,error}=await supabase.from('site_settings').select('setting_value').eq('setting_key','ctc_home_hero_media').maybeSingle();
  if(error)throw error;
  const setting=JSON.parse(data?.setting_value||'{"type":"default"}');
  const type=setting.type==='video'?'video':setting.type==='image'?'image':'';
  const url=String(setting.url||'').trim();
  if(type&&/^https:\/\//i.test(url)){
   const layer=document.createElement('div');layer.className='ctc-home-hero-media';
   const media=document.createElement(type==='video'?'video':'img');
   if(type==='video')prepareVideo(media);else{media.alt='';media.decoding='async';}
   media.src=url;layer.append(media);hero.querySelector(':scope > [data-ctc-default-hero]')?.remove();hero.prepend(layer);
   if(type==='video'){media.load();media.play().catch(()=>{});}
  }else{
   const video=hero.querySelector('[data-ctc-default-hero] video');if(video){prepareVideo(video);video.load();video.play().catch(()=>{});}
  }
 }catch(error){
  console.warn('CTC original homepage hero kept:',error?.message||error);
  const video=hero.querySelector('[data-ctc-default-hero] video');if(video){prepareVideo(video);video.play().catch(()=>{});}
 }
}
