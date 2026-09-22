import {supabase} from '../js/supabase-config.js';
const $=id=>document.getElementById(id);
const form=$('photoForm'),input=form.querySelector('input[name="photo"]'),stage=document.querySelector('.ctc-crop-stage'),image=$('ctcCropImage'),zoom=$('ctcCropZoom'),preview=$('ctcCropPreview');
let url='',scale=1,x=0,y=0,touches=new Map(),lastPinch=0,ready=false;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function paint(){
 image.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
 if(!ready)return;
 const ctx=preview.getContext('2d'),size=preview.width,sw=image.naturalWidth,sh=image.naturalHeight;
 ctx.clearRect(0,0,size,size);
 // Fill letterboxed areas from the same image, instead of showing black or silently cropping the original.
 const cover=Math.max(size/sw,size/sh),cw=sw*cover,ch=sh*cover;
 ctx.save();ctx.filter='blur(22px) brightness(.48)';ctx.drawImage(image,(size-cw)/2,(size-ch)/2,cw,ch);ctx.restore();
 const fit=Math.min(size/sw,size/sh),w=sw*fit*scale,h=sh*fit*scale;
 const width=stage.clientWidth||320,height=stage.clientHeight||320;
 // Pointer offsets are CSS pixels; convert to output pixels so preview matches the stage.
 ctx.drawImage(image,(size-w)/2+x*size/width,(size-h)/2+y*size/height,w,h);
}
input.addEventListener('change',()=>{
 if(url)URL.revokeObjectURL(url);const file=input.files?.[0];if(!file){$('ctcPhotoCrop').hidden=true;ready=false;return}
 url=URL.createObjectURL(file);ready=false;image.onload=()=>{ready=true;scale=1;x=0;y=0;zoom.value='1';$('ctcPhotoCrop').hidden=false;paint()};image.onerror=()=>$('photoMsg').textContent='This image could not be loaded. Choose a JPEG or PNG.';image.src=url;
});
zoom.addEventListener('input',()=>{scale=Number(zoom.value);paint()});
stage.addEventListener('pointerdown',e=>{if(!ready)return;stage.setPointerCapture(e.pointerId);touches.set(e.pointerId,{px:e.clientX,py:e.clientY});});
stage.addEventListener('pointermove',e=>{
 if(!touches.has(e.pointerId))return;e.preventDefault();const old=touches.get(e.pointerId),dx=e.clientX-old.px,dy=e.clientY-old.py;touches.set(e.pointerId,{px:e.clientX,py:e.clientY});
 if(touches.size===1){x+=dx;y+=dy}else if(touches.size===2){const [a,b]=[...touches.values()];const dist=Math.hypot(a.px-b.px,a.py-b.py);if(lastPinch){scale=clamp(scale*dist/lastPinch,1,3);zoom.value=String(scale)}lastPinch=dist}paint();
});
function release(e){touches.delete(e.pointerId);lastPinch=0}stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',release);
$('ctcCropCancel').onclick=()=>{input.value='';$('ctcPhotoCrop').hidden=true;ready=false;if(url)URL.revokeObjectURL(url);url='';image.removeAttribute('src');preview.getContext('2d').clearRect(0,0,preview.width,preview.height)};
window.addEventListener('resize',()=>{if(ready)paint()});
// Capture-phase handler supersedes original uncropped uploader in portal.js.
form.addEventListener('submit',async e=>{
 e.preventDefault();e.stopImmediatePropagation();const file=input.files?.[0],status=$('photoMsg');if(!file||!ready)return status.textContent='Choose a photo and review the preview first.';
 const button=form.querySelector('button[type="submit"],button.gold');button.disabled=true;status.textContent='Saving picture…';
 try{
  const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Sign in before uploading.');
  paint();const blob=await new Promise(resolve=>preview.toBlob(resolve,'image/jpeg',.92));if(!blob)throw Error('Could not prepare the crop.');
  const base=`${user.id}/headshot-${Date.now()}`,bucket=supabase.storage.from('fighter-headshots');
  const original=await bucket.upload(base+'-original-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),file,{contentType:file.type||'image/jpeg'});if(original.error)throw original.error;
  const path=base+'-framed.jpg',cropped=await bucket.upload(path,blob,{contentType:'image/jpeg'});if(cropped.error)throw cropped.error;
  const headshot_url=bucket.getPublicUrl(path).data.publicUrl;
  const {error}=await supabase.from('fighters').update({headshot_url,headshot_path:path}).eq('auth_user_id',user.id);if(error)throw error;
  $('fighterAvatar').src=headshot_url;status.textContent='Fighter picture saved. Tap your picture to expand.';$('ctcCropCancel').click();
 }catch(error){status.textContent=error.message||'Could not save fighter picture.'}finally{button.disabled=false}
},true);
function viewer(src){if(!src)return;const el=document.createElement('div');el.className='ctc-photo-viewer';el.innerHTML='<button type="button" aria-label="Close photo">✕ CLOSE</button><img alt="Expanded fighter picture">';el.querySelector('img').src=src;el.onclick=e=>{if(e.target.tagName!=='IMG')el.remove()};document.body.append(el)}
$('fighterAvatar').onclick=()=>viewer($('fighterAvatar').src);
