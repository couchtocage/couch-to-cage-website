import { supabase } from './supabase-admin.js';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function call(action,body){const {data:{session},error}=await supabase.auth.getSession();if(error||!session)throw new Error('Admin sign-in required');const [operation,query]=action.split('&');const r=await fetch(`/.netlify/functions/ctc-admin-api?action=${encodeURIComponent(operation)}${query?'&'+query:''}`,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${session.access_token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`Could not ${action} (${r.status})`);return j;}
const localStamp=value=>String(value||'').slice(0,16);
const validUrl=v=>{if(!v)return '';const url=new URL(v);if(!['https:','http:'].includes(url.protocol))throw new Error('Only http(s) travel links are allowed');return url.href;};
function field(name,title,value='',type='text',wide=false){return `<label class="${wide?'wide':''}">${esc(title)}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${type==='url'?'placeholder="https://..."':''}></label>`;}
let editingTravel=false;
async function showTravel(mid){if(editingTravel)return;editingTravel=true;
 const d=document.createElement('dialog');d.className='ctc-travel-dialog';document.body.append(d);
 const close=()=>{d.close();d.remove();editingTravel=false};d.addEventListener('cancel',()=>{setTimeout(()=>{d.remove();editingTravel=false},0)},{once:true});
 try{
 const [travel,matches,fighters]=await Promise.all([call(`travel&matchup_id=${encodeURIComponent(mid)}`),call('matchups'),call('fighters')]);
 const match=matches.find(x=>String(x.id)===String(mid));if(!match)throw new Error('Matchup no longer exists');
 const f=fighters.find(x=>String(x.id)===String(match.fighter_id));
 const fields=[['carrier','Airline / bus / train operator'],['service_number','Flight / bus / train number'],['booking_reference','Booking reference (private)'],['depart_from','Departure airport / station'],['arrive_at','Arrival airport / station'],['terminal','Terminal'],['gate','Gate']];
 d.innerHTML=`<div class="dialog-heading"><div><p class="eyebrow">CTC MANAGEMENT · PRIVATE TRAVEL</p><h2>${esc([f?.first_name,f?.last_name].filter(Boolean).join(' '))}</h2><p>${esc(match.promotion||match.event_name||'Fight')} · ${esc(match.fight_date||'')}</p></div><button type="button" data-close-travel aria-label="Close">×</button></div>
 <p class="muted">Admin can update the official itinerary. Fighter can view it under this fight, not edit it. Travel data stays off public cards.</p>
 <form id="ctcTravelForm"><label>Transportation<select name="mode">${['flight','bus','train','car','other'].map(m=>`<option value="${m}" ${m===(travel?.mode||'flight')?'selected':''}>${m.toUpperCase()}</option>`).join('')}</select></label>
 ${fields.map(([k,t])=>field(k,t,travel?.[k])).join('')}
 ${field('departure_at','Departure · local time at departure airport/station',localStamp(travel?.departure_at),'datetime-local')}${field('depart_timezone','Departure time zone (e.g. Pacific / Eastern)',travel?.depart_timezone)}${field('arrival_at','Arrival · local time at arrival airport/station',localStamp(travel?.arrival_at),'datetime-local')}${field('arrive_timezone','Arrival time zone (e.g. Eastern)',travel?.arrive_timezone)}
 ${field('travel_url','Airline / carrier trip link',travel?.travel_url,'url',true)}
 <label class="wide">Notes / ground transportation / pickup information<textarea name="notes" rows="3">${esc(travel?.notes||'')}</textarea></label>
 <div class="wide"><label>Upload itinerary (private PDF or image, max 3 MB)<input id="ctcTravelFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"></label></div>
 <div class="wide dialog-actions"><button class="gold-button" type="submit" id="ctcTravelSave">SAVE TRAVEL DETAILS</button><button type="button" class="ghost-button" id="ctcTravelOpenFile" ${travel?.itinerary_path?'':'hidden'}>OPEN ITINERARY</button><button type="button" class="ghost-button" id="ctcTravelReminder" ${travel?.departure_at?'':'hidden'}>SEND TRAVEL REMINDER</button><button type="button" data-close-travel>CLOSE</button></div>
 <p class="form-message wide" id="ctcTravelStatus" role="status"></p></form>`;
 d.showModal();d.querySelectorAll('[data-close-travel]').forEach(b=>b.onclick=close);
 let saved=travel;
 d.querySelector('#ctcTravelForm').onsubmit=async e=>{e.preventDefault();const btn=$('ctcTravelSave'),status=$('ctcTravelStatus');btn.disabled=true;status.textContent='Saving travel details…';status.className='form-message';
  try{
  const row=Object.fromEntries(new FormData(e.currentTarget));row.matchup_id=mid;
  row.travel_url=validUrl(row.travel_url);
  // Store wall-clock times with explicitly labeled airport/station time zones, never guess from Admin device location.
  for(const key of ['departure_at','arrival_at'])row[key]=row[key]||null;
  saved=await call('travel-save',row);
  const file=$('ctcTravelFile').files?.[0];if(file){
   if(file.size>3000000)throw new Error('Travel details saved. File must be under 3 MB.');
   if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Travel details saved. Upload PDF/JPG/PNG/WebP.');
   const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read file'));reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(file)});
   await call('travel-upload',{matchup_id:mid,filename:file.name,content_type:file.type,data:base64});$('ctcTravelOpenFile').hidden=false;
  }
  $('ctcTravelReminder').hidden=!row.departure_at;status.textContent='Travel details saved. The fighter can see this in their Upcoming Fights.';status.className='form-message success';
  }catch(err){status.textContent=err.message;status.className='form-message error'}finally{btn.disabled=false}
 };
 d.querySelector('#ctcTravelOpenFile').onclick=async()=>{try{const result=await call('travel-file',{matchup_id:mid});window.open(result.url,'_blank','noopener,noreferrer')}catch(err){$('ctcTravelStatus').textContent=err.message}};
 d.querySelector('#ctcTravelReminder').onclick=async e=>{
   if(!confirm('Send CTC Management travel and check-in reminder to this fighter now? Best sent around 40 hours before departure.'))return;
   const btn=e.currentTarget;btn.disabled=true;
   try{const result=await call('travel-reminder-send',{matchup_id:mid});$('ctcTravelStatus').textContent=`Travel reminder sent to ${result.to}.`;}catch(err){$('ctcTravelStatus').textContent=err.message}finally{btn.disabled=false}
 };
 }catch(err){d.innerHTML=`<h2>Travel details unavailable</h2><p>${esc(err.message)}</p><button type="button" id="ctcTravelClose">Close</button>`;d.showModal();d.querySelector('#ctcTravelClose').onclick=close}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-m-travel]');if(!b)return;e.preventDefault();e.stopPropagation();showTravel(b.dataset.mTravel)});
