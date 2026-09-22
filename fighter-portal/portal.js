import { supabase } from '../js/supabase-config.js';
import { loadWalkinArt } from '../js/ctc-walkin-art.js?v=20260920-card-preview-activation-1';const $=id=>document.getElementById(id);let fighter=null;
const msg=(id,t,ok=false)=>{const e=$(id);e.textContent=t;e.className='msg'+(ok?' success':'')};
async function accountNotify(type,extra={}){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)return {sent:false,error:'No active session'};
 try{
  const r=await fetch('/.netlify/functions/fighter-account-notify',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({type,...extra})});
  const j=await r.json().catch(()=>({}));
  return r.ok?j:{sent:false,error:j.error||`Email notification failed (${r.status})`};
 }catch(e){return {sent:false,error:e.message||String(e)}}
}
const initialPasswordDialog=$('ctcInitialPasswordDialog');
initialPasswordDialog?.addEventListener('cancel',e=>e.preventDefault());
$('ctcInitialPasswordSignOut')?.addEventListener('click',async()=>{await supabase.auth.signOut();initialPasswordDialog.close();location.reload()});
$('ctcInitialPasswordForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const a=$('ctcInitialPassword').value,b=$('ctcInitialPasswordAgain').value,notice=$('ctcInitialPasswordStatus');
 if(a!==b){notice.textContent='Passwords do not match.';return}
 if(a.length<12||!/[A-Za-z]/.test(a)||!/\d/.test(a)){notice.textContent='Use at least 12 characters with letters and a number.';return}
 const save=e.target.querySelector('button[type=submit]');save.disabled=true;notice.textContent='Saving your private password…';
 try{const {error}=await supabase.auth.updateUser({password:a,data:{ctc_password_change_required:false}});if(error)throw error;
  $('ctcInitialPassword').value='';$('ctcInitialPasswordAgain').value='';initialPasswordDialog.close();await load();
 }catch(err){notice.textContent=err.message||'Password could not be updated.'}finally{save.disabled=false}
});
async function link(){const {data:{session}}=await supabase.auth.getSession();if(!session)return;const r=await fetch('/.netlify/functions/link-fighter',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}});const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not link fighter account')}
async function load(){const {data:{user}}=await supabase.auth.getUser();if(recoveryActive)return showRecovery();if(!user)return showAuth();try{await link()}catch(e){showAuth();msg('message',e.message);return}if(user.user_metadata?.ctc_password_change_required){$('authCard').classList.add('hidden');$('dashboard').classList.add('hidden');const dialog=$('ctcInitialPasswordDialog');if(!dialog.open)dialog.showModal();return}const {data,error}=await supabase.from('fighters').select('*').eq('auth_user_id',user.id).maybeSingle();if(error||!data){showAuth();msg('message',error?.message||'Fighter profile not found.');return}fighter=data;loadRequests().catch(error=>console.warn('Fighter request inbox:',error));window.dispatchEvent(new CustomEvent('ctc:fighter-profile-loaded',{detail:{portal_background_url:data.portal_background_url||''}}));if(user.email&&user.email!==data.email){const sync=await supabase.from('fighters').update({email:user.email}).eq('auth_user_id',user.id);if(!sync.error)fighter.email=user.email;}
 const pendingEmail=localStorage.getItem('ctcPendingAccountEmail');
 if(pendingEmail&&user.email&&pendingEmail.toLowerCase()===user.email.toLowerCase()){
  localStorage.removeItem('ctcPendingAccountEmail');
  accountNotify('email_changed').then(n=>{
   const note=n?.sent?' A confirmation email was sent.':' Your email changed, but the CTC confirmation email could not be sent.';
   if($('emailMsg'))msg('emailMsg','Email changed successfully.'+note,true);
  });
 }
 $('fighterAccountEmail').value=user.email||data.email||'';$('authCard').classList.add('hidden');$('dashboard').classList.remove('hidden');$('fighterAvatar').src=data.headshot_url||'../assets/ctc-logo-transparent.png';await loadWalkinArt();showWalkin();$('fighterName').textContent=[data.first_name,data.nickname?`“${data.nickname}”`:'',data.last_name].filter(Boolean).join(' ');$('portalStatus').textContent=`${user.email} · Portal ${data.portal_status}`;for(const [k,v] of new FormData($('profileForm')).entries()){} [...$('profileForm').elements].forEach(e=>{if(e.name&&data[e.name]!=null)e.value=e.name==='ready_to_fight'?String(data[e.name]):data[e.name]});await Promise.all([loadWeight(),loadDocs(),loadFights(),loadRequests()])}
function showWalkin(){const w=$('walkin');if(!w||sessionStorage.getItem('ctc-walkin-shown'))return;sessionStorage.setItem('ctc-walkin-shown','1');w.classList.remove('hidden');setTimeout(()=>w.classList.add('hide-walkin'),2200);setTimeout(()=>w.classList.add('hidden'),3800)}
function showAuth(){if(recoveryActive)return showRecovery();$('authCard').classList.remove('hidden');$('dashboard').classList.add('hidden');$('recoveryBox').classList.add('hidden');$('loginBox').classList.remove('hidden')}
function showRecovery(){$('authCard').classList.remove('hidden');$('dashboard').classList.add('hidden');$('loginBox').classList.add('hidden');$('activateBox').classList.add('hidden');$('recoveryBox').classList.remove('hidden');$('recoveryMessage').textContent='Choose a new password.'}
$('loginForm').onsubmit=async e=>{e.preventDefault();msg('message','Signing in…');const {error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)return msg('message',error.message);await load()};
function showActivate(){
  $('authCard').classList.remove('hidden');
  $('dashboard').classList.add('hidden');
  $('recoveryBox').classList.add('hidden');
  $('loginBox').classList.add('hidden');
  $('activateBox').classList.remove('hidden');
  msg('message','');
}
$('showActivate').onclick=showActivate;$('backLogin').onclick=()=>{$('activateBox').classList.add('hidden');$('loginBox').classList.remove('hidden')};
$('activateForm').onsubmit=async e=>{e.preventDefault();msg('message','Creating account…');const email=$('activateEmail').value.trim(),password=$('activatePassword').value;const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin+'/fighter-portal/'}});if(error)return msg('message',error.message);if(data.session){await load()}else msg('message','Check your email and verify your address. Then return here and sign in.',true)};
$('recoveryForm').onsubmit=async e=>{e.preventDefault();const a=$('newPassword').value,b=$('confirmPassword').value;if(a!==b)return msg('recoveryMessage','Passwords do not match.');if(a.length<8)return msg('recoveryMessage','Use at least 8 characters.');msg('recoveryMessage','Updating password…');const {error}=await supabase.auth.updateUser({password:a,data:{ctc_password_change_required:false}});if(error)return msg('recoveryMessage',error.message);msg('recoveryMessage','Password changed. You can now sign in.',true);await supabase.auth.signOut();recoveryActive=false;history.replaceState(null,'',location.pathname);$('recoveryBox').classList.add('hidden');$('loginBox').classList.remove('hidden');$('newPassword').value='';$('confirmPassword').value=''};
$('resetButton').onclick=async()=>{const email=$('email').value.trim();if(!email)return msg('message','Enter your email first.');const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/fighter-portal/?reset=1'});msg('message',error?error.message:'Password reset email sent.',!error)};$('signOut').onclick=async()=>{await supabase.auth.signOut();location.reload()};
$('toggleFighterPassword').onclick=()=>{const inp=$('password'),btn=$('toggleFighterPassword'),nowShow=inp.type==='password';inp.type=nowShow?'text':'password';btn.querySelector('.ctc-eye-on').hidden=nowShow;btn.querySelector('.ctc-eye-off').hidden=!nowShow;btn.setAttribute('aria-pressed',String(nowShow))};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('hidden',x.id!==b.dataset.tab));if(b.dataset.tab==='fights'&&fighter)loadFights().catch(e=>console.warn('Could not refresh fighter fights:',e));});

$('photoForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),file=f.get('photo'),{data:{user}}=await supabase.auth.getUser();if(!file||!user)return;const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase();const path=`${user.id}/headshot-${Date.now()}.${ext}`;msg('photoMsg','Uploading…');let {error}=await supabase.storage.from('fighter-headshots').upload(path,file,{upsert:true,contentType:file.type||'image/jpeg'});if(error)return msg('photoMsg',error.message);const {data:publicData}=supabase.storage.from('fighter-headshots').getPublicUrl(path);const headshot_url=publicData.publicUrl;const {error:updateErr}=await supabase.from('fighters').update({headshot_url}).eq('id',fighter.id);msg('photoMsg',updateErr?updateErr.message:'Fighter picture updated.',!updateErr);if(!updateErr){fighter.headshot_url=headshot_url;$('fighterAvatar').src=headshot_url;e.currentTarget.reset()}};
$('profileForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),p=Object.fromEntries(f);p.ready_to_fight=p.ready_to_fight==='true';p.airport_miles=p.airport_miles?Number(p.airport_miles):null;if(p.walkout_song_title!==fighter.walkout_song_title||p.walkout_song_artist!==fighter.walkout_song_artist)p.walkout_song_updated_at=new Date().toISOString();const {error}=await supabase.from('fighters').update(p).eq('id',fighter.id);msg('profileMsg',error?error.message:'Profile updated.',!error);if(!error)fighter={...fighter,...p}};
async function loadWeight(){const {data,error}=await supabase.from('fighter_weight_history').select('*').eq('fighter_id',fighter.id).order('recorded_at',{ascending:false}).limit(20);$('weightForm').elements.weight.value=fighter.current_weight??'';$('weightForm').elements.target.value=fighter.target_weight??'';$('currentWeight').innerHTML=`<div><small>CURRENT WEIGHT</small><strong>${fighter.current_weight??'—'} ${fighter.current_weight?'lb':''}</strong></div><div><small>FIGHT WEIGHT</small><strong>${fighter.target_weight??'—'} ${fighter.target_weight?'lb':''}</strong></div><p>Last updated: ${fighter.weight_updated_at?new Date(fighter.weight_updated_at).toLocaleDateString():'Not provided'}</p>`;if(error){$('weightHistory').innerHTML='<p class="muted">Could not load weigh-in history.</p>';return}$('weightHistory').innerHTML=(data||[]).map((x,i)=>`<div class="ctc-weight-entry" data-weight-row="${x.id}"><div class="ctc-weight-meta"><span>${new Date(x.recorded_at).toLocaleDateString()} ${i===0?'<b>Latest</b>':''}${x.status==='invalid'?'<b class="bad">Needs correction</b>':''}</span>${x.admin_comment?`<small>${x.admin_comment}</small>`:''}</div><div class="ctc-weight-actions"><strong>${x.weight} lb</strong><button type="button" class="ctc-weight-edit" data-weight-edit="${x.id}" data-weight-value="${x.weight}" data-weight-latest="${i===0?'true':'false'}">EDIT</button></div></div>`).join('')||'<p class="muted">No weigh-ins recorded yet.</p>'}
$('weightForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),w=Number(f.get('weight')),t=Number(f.get('target'))||null,now=new Date().toISOString();let {error}=await supabase.from('fighters').update({current_weight:w,target_weight:t,weight_updated_at:now}).eq('id',fighter.id);if(!error)({error}=await supabase.from('fighter_weight_history').insert({fighter_id:fighter.id,weight:w}));msg('weightMsg',error?error.message:'Weight updated.',!error);if(!error){fighter.current_weight=w;fighter.target_weight=t;fighter.weight_updated_at=now;await completeRequests('weight');await loadWeight()}};
document.addEventListener('click',async e=>{const edit=e.target.closest('[data-weight-edit]');if(edit){const row=edit.closest('[data-weight-row]'),actions=row?.querySelector('.ctc-weight-actions');if(!row||!actions)return;actions.innerHTML=`<input class="ctc-weight-edit-input" data-weight-input type="number" min="1" step="0.1" inputmode="decimal" value="${edit.dataset.weightValue}" aria-label="Correct weigh-in weight"><button type="button" class="ctc-weight-save" data-weight-save="${edit.dataset.weightEdit}" data-weight-latest="${edit.dataset.weightLatest}">SAVE</button><button type="button" class="ctc-weight-cancel" data-weight-cancel>CANCEL</button>`;const input=actions.querySelector('[data-weight-input]');input?.focus();input?.select();return}const cancel=e.target.closest('[data-weight-cancel]');if(cancel){await loadWeight();return}const save=e.target.closest('[data-weight-save]');if(!save)return;const row=save.closest('[data-weight-row]'),input=row?.querySelector('[data-weight-input]'),w=Number(input?.value);if(!Number.isFinite(w)||w<=0){alert('Enter a valid weight.');input?.focus();return}save.disabled=true;const now=new Date().toISOString();let {error}=await supabase.from('fighter_weight_history').update({weight:w,status:'valid',admin_comment:null,updated_at:now}).eq('id',save.dataset.weightSave).eq('fighter_id',fighter.id);if(!error&&save.dataset.weightLatest==='true'){({error}=await supabase.from('fighters').update({current_weight:w,weight_updated_at:now}).eq('id',fighter.id));if(!error){fighter.current_weight=w;fighter.weight_updated_at=now}}if(error){alert(error.message);save.disabled=false;return}msg('weightMsg','Weigh-in corrected.',true);await loadWeight();});
function bloodStatus(d){if(!d)return ['NEEDS BLOODWORK','bad'];if(d.review_status==='pending')return ['PENDING REVIEW','warn'];if(d.review_status!=='approved')return ['NEEDS BLOODWORK','bad'];const days=(new Date(d.expiration_date)-new Date())/86400000;if(days<0)return ['NEEDS BLOODWORK','bad'];if(days<=30)return ['EXPIRING SOON','warn'];return ['GOOD','good']}
async function loadDocs(){const {data}=await supabase.from('fighter_documents').select('*').eq('fighter_id',fighter.id).order('created_at',{ascending:false});const latest=(data||[]).find(x=>x.document_type==='bloodwork'),[s,c]=bloodStatus(latest);$('bloodworkStatus').innerHTML=`<div class="ctc-bloodwork-summary"><div class="ctc-bloodwork-stat"><small>CURRENT STATUS</small><strong class="${c}">${s}</strong></div><div class="ctc-bloodwork-stat"><small>EXPIRATION DATE</small><strong>${latest?.expiration_date||'Not provided'}</strong></div></div><p class="muted">${latest?'Last uploaded: '+new Date(latest.created_at).toLocaleDateString():'No bloodwork uploaded yet.'}</p>`;$('documentList').innerHTML=(data||[]).filter(x=>x.document_type==='bloodwork').map((x,i)=>`<div class="ctc-bloodwork-row"><div><strong>${new Date(x.created_at).toLocaleDateString()} ${i===0?'<span class="ctc-bloodwork-latest">Latest</span>':''}</strong><small>${x.original_name||'Bloodwork upload'}</small></div><div><strong>${x.review_status||'Pending review'}</strong><small>Expires ${x.expiration_date||'Not provided'}</small>${(x.review_status==='pending'||x.review_status==='rejected'||(x.expiration_date&&new Date(x.expiration_date)<new Date()))?`<button type="button" class="ctc-doc-cancel" data-cancel-document="${x.id}">${x.review_status==='pending'?'Cancel upload':'Delete'}</button>`:''}</div></div>`).join('')||'<p class="muted">No bloodwork history yet.</p>'}
$('documentList').addEventListener('click',async e=>{const b=e.target.closest('[data-cancel-document]');if(!b||!fighter)return;if(!confirm('Remove this upload? You can then upload the correct file.'))return;b.disabled=true;const id=b.dataset.cancelDocument;const {data:rows,error:lookupError}=await supabase.from('fighter_documents').select('*').eq('id',id).eq('fighter_id',fighter.id).limit(1);const doc=rows?.[0];const expired=!!(doc?.expiration_date&&new Date(doc.expiration_date)<new Date());if(lookupError||!doc||!(doc.review_status==='pending'||doc.review_status==='rejected'||expired)){msg('documentMsg',lookupError?.message||'This upload can no longer be removed.');b.disabled=false;return}const {error}=await supabase.from('fighter_documents').delete().eq('id',id).eq('fighter_id',fighter.id);if(error){msg('documentMsg',error.message);b.disabled=false;return}const path=doc.file_path||doc.storage_path;if(path){const result=await supabase.storage.from('fighter-documents').remove([path]);if(result.error)console.warn('File cleanup:',result.error.message)}msg('documentMsg','Upload removed. You can upload the correct file now.',true);await loadDocs()});
$('bloodworkForm').issue_date?.addEventListener('change',e=>{if(!e.target.value)return;const d=new Date(e.target.value+'T12:00:00');d.setFullYear(d.getFullYear()+1);$('bloodworkForm').expiration_date.value=d.toISOString().slice(0,10)});
$('bloodworkForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),file=f.get('file'),{data:{user}}=await supabase.auth.getUser(),path=`${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;msg('documentMsg','Uploading…');let {error}=await supabase.storage.from('fighter-documents').upload(path,file);if(!error)({error}=await supabase.from('fighter_documents').insert({fighter_id:fighter.id,user_id:user.id,document_type:'bloodwork',file_path:path,storage_path:path,original_name:file.name,document_date:f.get('issue_date'),issue_date:f.get('issue_date'),expires_at:f.get('expiration_date'),expiration_date:f.get('expiration_date'),verification_status:'pending',review_status:'pending'}));msg('documentMsg',error?error.message:'Uploaded. CTC management will review it.',!error);if(!error){e.currentTarget.reset();await completeRequests('bloodwork');await loadDocs()}};
async function loadFights(){
 if(!fighter?.id)return;
 const list=$('fightList');list.innerHTML='<p class="muted">Loading your assigned fights…</p>';
 const [{data,error},travelResult]=await Promise.all([
  supabase.from('fighter_matchups').select('*').eq('fighter_id',fighter.id).in('status',['pending','confirmed']).order('fight_date'),
  supabase.from('ctc_fighter_travel').select('*').eq('fighter_id',fighter.id)
 ]);
 if(error){console.error('CTC fighter matchups:',error);list.innerHTML='<p class="msg">Could not load assigned fights. Refresh or message CTC Management.</p>';return}
 if(travelResult.error)console.warn('Travel details unavailable:',travelResult.error.message);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dates=(v,tz)=>!v?'Not yet provided':String(v).replace('T',' ')+' '+String(tz||'(confirm time zone)');
 const allowedUrl=v=>{try{const url=new URL(v);return ['https:','http:'].includes(url.protocol)?url.href:''}catch{return ''}};
 const travel=new Map((travelResult.data||[]).map(t=>[String(t.matchup_id),t]));
 list.innerHTML=(data||[]).map(x=>{const t=travel.get(String(x.id));return `<div class="fight" data-ctc-fight-id="${esc(x.id)}"><span class="status">${esc(String(x.status).toUpperCase())}</span><h3>${esc(x.event_name==='CTC Fight Card'?x.promotion||x.event_name:x.event_name||x.promotion||'Fight Opportunity')}</h3><p>${esc(x.fight_date||'Date TBD')} · ${esc(x.venue||'')} ${esc([x.city,x.state].filter(Boolean).join(', '))}</p><p><strong>Opponent:</strong> ${esc(x.opponent_name||'Not announced')} ${x.opponent_record?`(${esc(x.opponent_record)})`:''}</p><p>${esc(x.discipline||'')} ${x.contracted_weight?`· ${esc(x.contracted_weight)}`:''}</p>${/(?:^|\n)CTC_CHAMPIONSHIP_BOUT:1(?:\n|$)/i.test(x.notes||'')?'<p class="ctc-fight-title-flag">★ CHAMPIONSHIP BOUT</p>':''}
 <section class="ctc-fight-travel"><strong>TRAVEL DETAILS · CTC MANAGEMENT</strong>${t?`
 <p><b>Transportation:</b> ${esc(t.mode||'Travel')} ${t.carrier?'· '+esc(t.carrier):''} ${t.service_number?'· '+esc(t.service_number):''}</p>
 <p><b>Departure:</b> ${esc(t.depart_from||'TBA')} · ${esc(dates(t.departure_at,t.depart_timezone))}</p>
 <p><b>Arrival:</b> ${esc(t.arrive_at||'TBA')} · ${esc(dates(t.arrival_at,t.arrive_timezone))}</p>
 ${t.terminal?`<p><b>Terminal:</b> ${esc(t.terminal)}</p>`:''}${t.gate?`<p><b>Gate:</b> ${esc(t.gate)}</p>`:''}
 ${t.booking_reference?`<p><b>Booking reference:</b> ${esc(t.booking_reference)}</p>`:''}
 ${t.notes?`<p>${esc(t.notes)}</p>`:''}
 <div class="ctc-travel-actions">${allowedUrl(t.travel_url)?`<a class="gold button" href="${esc(allowedUrl(t.travel_url))}" target="_blank" rel="noopener noreferrer">OPEN ${esc(t.carrier||'CARRIER')} ↗</a>`:''}${t.itinerary_path?`<button type="button" class="ghost" data-ctc-itinerary="${esc(x.id)}">VIEW ITINERARY</button>`:''}</div>`:'<p class="muted">CTC Management will add transportation details here when your trip is booked.</p>'}</section></div>`}).join('')||'<p class="muted">No pending or confirmed fights right now.</p>';
}
document.getElementById('fightList')?.addEventListener('click',async e=>{
 const b=e.target.closest('[data-ctc-itinerary]');if(!b)return;b.disabled=true;
 try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sign in again');
  const r=await fetch('/.netlify/functions/ctc-fighter-travel',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({matchup_id:b.dataset.ctcItinerary})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Could not open itinerary');location.assign(j.url);
 }catch(err){alert(err.message)}finally{b.disabled=false}
});
let recoveryActive=new URLSearchParams(location.search).has('reset')||location.hash.includes('type=recovery')||location.search.includes('type=recovery');
supabase.auth.onAuthStateChange((ev,s)=>{
  if(ev==='PASSWORD_RECOVERY'){recoveryActive=true;showRecovery();return}
  if(ev==='SIGNED_IN'&&s&&!recoveryActive)setTimeout(load,0);
  if(ev==='SIGNED_OUT'&&!recoveryActive)showAuth();
});
const activationActive=new URLSearchParams(location.search).get('activate')==='1';
if(recoveryActive)showRecovery();
else if(activationActive)showActivate();
else await load();

// Personal info display and walkout summary
const ctcProfile=document.getElementById('profileForm');if(ctcProfile){const dob=ctcProfile.elements.date_of_birth;const age=document.getElementById('fighterAge');const calc=()=>{if(!dob?.value){age.textContent='—';return}const d=new Date(dob.value+'T12:00:00'),t=new Date();let y=t.getFullYear()-d.getFullYear();if(t.getMonth()<d.getMonth()||(t.getMonth()===d.getMonth()&&t.getDate()<d.getDate()))y--;age.textContent=y>=0&&y<120?String(y):'—'};dob?.addEventListener('change',calc);ctcProfile.addEventListener('input',()=>{const title=ctcProfile.elements.walkout_song_title?.value;document.getElementById('walkoutSummary').textContent=title||'Tap to edit'});setInterval(calc,5000)}


// Fighter requests are private under Supabase RLS. Dismissal does not delete audit history.
// Requests always come from the authenticated fighter's roster ID via the server. This
// avoids hiding Supabase RLS errors as "No new notifications" and prevents other fighters'
// data from being queried using client supplied IDs.
let requestLoadInProgress=false;
async function fighterRequestApi(action='',payload=null){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw new Error('Sign in to see your requests.');
 const url='/.netlify/functions/ctc-fighter-requests'+(action?'?action='+encodeURIComponent(action):'');
 const response=await fetch(url,{method:payload?'POST':'GET',cache:'no-store',
  headers:{Authorization:`Bearer ${session.access_token}`,...(payload?{'Content-Type':'application/json'}:{})},
  body:payload?JSON.stringify(payload):undefined});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||`Requests unavailable (${response.status})`);
 return result;
}
async function loadRequests(){
 if(!fighter||requestLoadInProgress)return;
 requestLoadInProgress=true;
 const panel=$('ctcNotifications'),list=$('ctcNotificationList');
 panel.hidden=false;
 try{
  const rows=await fighterRequestApi();
  // A dismissed request is cleared on the fighter side, not deleted from Admin's history.
  const pending=rows.filter(r=>r.status==='pending'&&!r.dismissed_at);
  $('ctcRequestCount').textContent=pending.length?`${pending.length} pending`:'';
  list.replaceChildren();
  if(!pending.length){list.innerHTML='<p class="muted">No new notifications.</p>';return}
  for(const r of pending){
   const item=document.createElement('div');item.className='ctc-notification';
   const content=document.createElement('div'),title=document.createElement('strong'),date=document.createElement('p');
   title.textContent=r.request_type==='weight'?'Weigh-in requested':'Bloodwork requested';
   date.textContent='Requested '+new Date(r.created_at).toLocaleDateString();content.append(title,date);
   const go=document.createElement('button');go.type='button';go.className='gold';
   go.textContent=r.request_type==='weight'?'Open Weigh-in':'Open Bloodwork';
   go.onclick=()=>document.querySelector(`[data-tab="${r.request_type==='weight'?'weight':'documents'}"]`)?.click();
   const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='ctc-dismiss';
   dismiss.textContent='×';dismiss.setAttribute('aria-label','Clear request');
   dismiss.onclick=async()=>{dismiss.disabled=true;try{
    await fighterRequestApi('dismiss',{request_id:r.id});
    requestLoadInProgress=false;await loadRequests();
   }catch(error){dismiss.disabled=false;date.textContent=error.message}
   };
   item.append(content,go,dismiss);list.append(item);
  }
 }catch(error){
  console.error('CTC fighter requests:',error);
  list.replaceChildren();const p=document.createElement('p');p.className='msg';
  p.textContent='Could not load notifications: '+error.message;list.append(p);
  $('ctcRequestCount').textContent='';
 }finally{requestLoadInProgress=false}
}
async function completeRequests(type){
 if(!fighter)return;
 try{await fighterRequestApi('complete',{request_type:type})}
 catch(error){console.error('CTC request completion:',error);msg(type==='weight'?'weightMsg':'documentMsg',
  'Your update saved, but CTC could not mark the request completed: '+error.message)}
 await loadRequests();
}
window.addEventListener('focus',()=>{if(fighter)loadRequests()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&fighter)loadRequests()});
setInterval(()=>{if(fighter&&!document.hidden)loadRequests()},30000);
$('emailForm').onsubmit=async e=>{
 e.preventDefault();
 const email=$('fighterAccountEmail').value.trim(),{data:{user}}=await supabase.auth.getUser();
 if(!user)return msg('emailMsg','Sign in first.');
 if(email.toLowerCase()===String(user.email||'').toLowerCase())return msg('emailMsg','That is already your sign-in email.',true);
 msg('emailMsg','Sending email-change confirmation…');
 const {error}=await supabase.auth.updateUser({email},{emailRedirectTo:location.origin+'/fighter-portal/'});
 if(error)return msg('emailMsg',error.message);
 localStorage.setItem('ctcPendingAccountEmail',email);
 const notice=await accountNotify('email_change_requested',{new_email:email});
 const extra=notice?.sent?' We also sent a CTC security notice to your current email.':'';
 msg('emailMsg','Check your new email for the verification link. Your sign-in email changes only after confirmation.'+extra,true);
};

$('passwordForm').onsubmit=async e=>{
 e.preventDefault();
 const a=$('accountNewPassword').value,b=$('accountConfirmPassword').value;
 if(a!==b)return msg('passwordMsg','Passwords do not match.');
 if(a.length<8)return msg('passwordMsg','Use at least 8 characters.');
 msg('passwordMsg','Changing password…');
 const {error}=await supabase.auth.updateUser({password:a});
 if(error)return msg('passwordMsg',error.message);
 $('accountNewPassword').value='';$('accountConfirmPassword').value='';
 const notice=await accountNotify('password_changed');
 msg('passwordMsg',notice?.sent?'Password changed. A confirmation email was sent to your account email.':'Password changed. Your new password is active, but the confirmation email could not be sent.',true);
};

$('walkoutSave').onclick=async()=>{if(!fighter)return msg('walkoutMsg','Sign in first.');const form=$('profileForm'),p={walkout_song_title:form.elements.walkout_song_title.value.trim(),walkout_song_artist:form.elements.walkout_song_artist.value.trim(),walkout_song_url:form.elements.walkout_song_url.value.trim(),walkout_song_updated_at:new Date().toISOString()};msg('walkoutMsg','Saving song…');const {error}=await supabase.from('fighters').update(p).eq('id',fighter.id);if(error)return msg('walkoutMsg',error.message);Object.assign(fighter,p);$('walkoutSummary').textContent=p.walkout_song_title||'Tap to edit';msg('profileMsg','Walkout song saved.',true);$('walkoutMsg').textContent='';$('walkoutEditor').open=false};
