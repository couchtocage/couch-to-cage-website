import { supabase } from './supabase-admin.js';const $=id=>document.getElementById(id);let roster=[],matchups=[],docs=[],upcomingEvents=[];let started=false;
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(action,body){const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Admin session required');const r=await fetch(`/.netlify/functions/ctc-admin-api?action=${action.includes('&')?action.split('&').map((x,i)=>i?x:encodeURIComponent(x)).join('&'):encodeURIComponent(action)}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const raw=await r.text();let j;try{j=raw?JSON.parse(raw):{}}catch{j={error:raw||`Server returned ${r.status}`}}if(!r.ok){
 const detail=String(j.error||j.message||'');
 if((r.status===401||r.status===403)&&/session_not_found|invalid session|session.*(?:not found|expired)/i.test(detail)){
  document.dispatchEvent(new Event('ctc-admin-invalid-session'));
  throw new Error('Your Admin session expired. Sign in again before importing fight cards.');
 }
 throw new Error(detail||`Request failed (${r.status})`);
}
return j}
function full(f){return [f.first_name,f.nickname?`“${f.nickname}”`:'',f.last_name].filter(Boolean).join(' ')}
async function loadRoster(){
 roster=await api('fighters');
 updateRosterWeightClassOptions();renderRoster();
 const activeRoster=roster.filter(x=>x.status!=='inactive');
 const livePortal=activeRoster.filter(x=>x.auth_user_id&&x.portal_status!=='disabled');
 const el=$('fighterRosterCount');if(el)el.textContent=activeRoster.length;
 const ready=$('readyFighterCount');if(ready)ready.textContent=activeRoster.filter(x=>x.ready_to_fight).length;
 const signup=$('ctcSignupTotal');if(signup)signup.textContent=`Portal accounts: ${livePortal.length} active / ${activeRoster.length} roster`;
 document.dispatchEvent(new CustomEvent('ctc-roster-loaded',{detail:{people:[...roster],activePortal:livePortal.length,activeRoster:activeRoster.length}}));
}
const fighterLocation=f=>[f.city||f.hometown,f.state].filter(Boolean).join(', ')||'Not provided';
const photo=f=>f?.headshot_url?`<img class="ctc-headshot" src="${safe(f.headshot_url)}" alt="${safe(full(f))} headshot" loading="lazy">`:`<div class="ctc-headshot ctc-headshot-empty" aria-label="No headshot uploaded">${safe((f?.first_name||'?')[0])}${safe((f?.last_name||'')[0])}</div>`;
const portalConnection=f=>f?.portal_status==='disabled'?'Portal Access Disabled':!f?.auth_user_id?'Pending Portal Activation':'Connected to Fighter Portal';
const fighterMatchups=f=>matchups.filter(m=>String(m.fighter_id)===String(f?.id));
const provided=v=>v===null||v===undefined||v===''||String(v).toLowerCase()==='n/a'?'Not provided':String(v);
function renderRoster(){
 const list=$('fighterList');if(!list)return;
 const term=($('fighterSearch')?.value||'').trim().toLowerCase(),account=$('ctcPortalFilter')?.value||'',status=$('fighterStatusFilter')?.value||'',blood=$('fighterBloodworkFilter')?.value||'',level=$('fighterLevelFilter')?.value||'';
 const filtered=roster.filter(f=>{
  const [doc]=docStatus(f);return (!account||(account==='yes'?!!f.auth_user_id:!f.auth_user_id))&&(!status||(status==='Ready'?f.ready_to_fight:status==='Inactive'?f.status==='inactive':!f.ready_to_fight&&f.status!=='inactive'))&&(!blood||(blood==='complete'?doc==='good':doc!=='good'))&&(!level||String(f.fighter_level||f.level||'').toLowerCase()===level.toLowerCase())&&[full(f),f.email,f.hometown,f.city,f.state,f.gym,f.weight_class,f.fighter_level,f.level].join(' ').toLowerCase().includes(term);
 });
 list.classList.add('ctc-roster-grid');list.innerHTML=filtered.map(f=>`<article class="fighter-card ctc-roster-card" data-r-card="${safe(f.id)}" aria-label="${safe(full(f))} roster card">${photo(f)}<div class="fighter-card-body"><h4>${safe([f.first_name,f.last_name].filter(Boolean).join(' '))}</h4>${f.nickname?`<p class="ctc-nickname">“${safe(f.nickname)}”</p>`:''}<div class="ctc-fighter-metrics"><span><small>WEIGHT</small><b>${safe(provided(f.current_weight))}${f.current_weight?' lb':''}</b></span><span><small>CLASS</small><b>${safe(provided(f.weight_class))}</b></span></div><p class="ctc-roster-meta">${safe(fighterLocation(f))}</p><div class="ctc-roster-badges"><span class="ctc-roster-badge">${safe(portalConnection(f))}</span><span class="ctc-roster-badge">${f.ready_to_fight?'Ready to fight':'Not ready'}</span>${fighterMatchups(f).length?`<span class="ctc-roster-badge ctc-assigned-badge">${fighterMatchups(f).length} assigned fight${fighterMatchups(f).length===1?'':'s'}</span>`:''}</div></div><div class="ctc-card-actions"><button type="button" data-r-view="${safe(f.id)}" class="gold-button">View Profile</button>${fighterMatchups(f).length?`<button type="button" class="ctc-view-matchups" data-r-view-matchups="${safe(f.id)}">VIEW MATCHUP${fighterMatchups(f).length===1?'':'S'} (${fighterMatchups(f).length})</button>`:''}<button type="button" data-r-assign="${safe(f.id)}">Assign Matchup</button><button type="button" data-ctc-message-fighter="${safe(f.id)}">Message</button><button type="button" data-r-edit="${safe(f.id)}">Edit</button><details class="ctc-account-controls"><summary>Account controls</summary>${!f.auth_user_id?`<button type="button" class="gold-button" data-r-admin-activate="${safe(f.id)}">Activate Account</button>`:''}<button type="button" data-r-access="${safe(f.id)}">${f.portal_status==='disabled'?'Enable Access':'Disable Access'}</button><button type="button" class="danger" data-r-deactivate="${safe(f.id)}">Deactivate</button></details></div></article>`).join('')||'<p class="muted">No fighters match these filters.</p>';
}

function viewFighter(f){
 if(!f)return;const d=document.createElement('dialog');d.className='event-dialog ctc-profile-dialog';
 const sections={
 'Personal & contact':[['First name',f.first_name],['Last name',f.last_name],['Nickname',f.nickname],['Date of birth',f.date_of_birth],['Email',f.email],['Phone',f.phone]],
 'Location & travel':[['City',f.city||f.hometown],['State',f.state],['Closest airport',f.closest_airport],['Airport distance (miles)',f.airport_miles??f.airport_distance_miles]],
 'Fight information':[['Discipline',Array.isArray(f.disciplines)?f.disciplines.join(', '):f.disciplines],['Current weight (lb)',f.current_weight],['Fight weight (lb)',f.target_weight],['Weight class',f.weight_class],['Ready to fight',f.ready_to_fight?'Yes':'No'],['Amateur record',[f.amateur_wins,f.amateur_losses,f.amateur_draws].every(x=>x==null)?null:[f.amateur_wins||0,f.amateur_losses||0,f.amateur_draws||0].join('-')],['Pro record',[f.pro_wins,f.pro_losses,f.pro_draws].every(x=>x==null)?null:[f.pro_wins||0,f.pro_losses||0,f.pro_draws||0].join('-')]],
 'Gym & camp':[['Gym',f.gym],['Coach',f.coach]],
 'Bloodwork':[['Latest review',docStatus(f)[1]],['Expiration',docStatus(f)[2]?.expiration_date]],
 'Walkout & links':[['Song',f.walkout_song_title||f.walkout_song],['Artist',f.walkout_song_artist||f.walkout_artist],['Song link',f.walkout_song_url],['Instagram',f.instagram_url],['TikTok',f.tiktok_url],['Tapology',f.tapology_url],['Sherdog',f.sherdog_url]],
 'Portal':[['Account',portalConnection(f)],['Access',f.portal_status],['Roster status',f.status]]};
 d.innerHTML=`<div class="dialog-form"><div class="dialog-heading"><div><p class="eyebrow">CTC FIGHTER PROFILE</p><h2>${safe(full(f))}</h2></div><button type="button" class="icon-button" data-close-profile aria-label="Close profile">×</button></div><div class="ctc-profile-top">${photo(f)}<div><h3>${safe(full(f))}</h3><p>${safe(fighterLocation(f))}</p><p>${safe(provided(f.weight_class))} · ${f.ready_to_fight?'Ready':'Not ready'}</p><p class="ctc-account-connection">${safe(portalConnection(f))}</p></div></div><details class="ctc-profile-section" open><summary>Assigned Matchups · ${fighterMatchups(f).length}</summary><div class="ctc-profile-matchups">${fighterMatchups(f).map(m=>`<div class="ctc-profile-matchup"><strong>${safe(m.promotion||m.event_name||'Fight Card')} · ${safe(m.fight_date||'Date TBA')}</strong><span>${safe(m.opponent_name?'vs '+m.opponent_name:'Opponent not announced')} · ${safe(m.contracted_weight||f.target_weight||f.current_weight||'Weight TBA')} ${safe(m.discipline||'')}</span><span class="ctc-profile-matchup-flags"><b>${m.is_public?'Published on live site':'Not published'}</b><b>${safe(portalConnection(f))}</b></span><button type="button" class="ghost-button" data-m-edit="${safe(m.id)}">MANAGE MATCHUP</button></div>`).join('')||'<p class="muted">No fights assigned yet. Activate this fighter first, then assign their matchup.</p>'}</div></details>${Object.entries(sections).map(([title,rows])=>`<details class="ctc-profile-section"><summary>${safe(title)}</summary><div class="ctc-profile-fields">${rows.map(([k,v])=>`<div><small>${safe(k)}</small><strong>${safe(provided(v))}</strong></div>`).join('')}</div></details>`).join('')}<details class="ctc-profile-section"><summary>Weight & weigh-in history</summary><div id="ctcAdminWeightHistory">Loading weigh-ins…</div></details><details class="ctc-profile-section"><summary>Update requests</summary><div id="ctcProfileRequests" aria-live="polite">Loading request history…</div></details><div class="dialog-actions ctc-profile-actions">${f.headshot_url?`<button type="button" class="gold-button" data-download-headshot>Download Headshot</button>`:''}${docStatus(f)[2]?`<button type="button" class="gold-button" data-doc-download="${safe(docStatus(f)[2].id)}">Download Bloodwork</button>`:''}<button type="button" class="gold-button" data-ctc-message-fighter="${safe(f.id)}">Message</button><button type="button" data-profile-edit="${safe(f.id)}">Edit</button><button type="button" class="gold-button" data-profile-assign="${safe(f.id)}">Assign Matchup</button><button type="button" data-request="weight" data-fighter="${safe(f.id)}">Request Weight Update</button><button type="button" data-request="bloodwork" data-fighter="${safe(f.id)}">Request Bloodwork</button><button type="button" class="ghost-button" data-close-profile>Close</button></div><p class="form-message" role="status"></p></div>`;
 document.body.append(d);d.querySelectorAll('[data-close-profile]').forEach(b=>b.onclick=()=>d.close());d.addEventListener('close',()=>d.remove());d.querySelector('[data-profile-edit]').onclick=()=>{d.close();editFighter(f)};d.querySelector('[data-profile-assign]').onclick=()=>{d.close();openRosterMatchup(f.id)};d.querySelectorAll('[data-m-edit]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();d.close();document.querySelector('#adminTabs button[data-tab="matchmaking"]')?.click();matchupEditor(matchups.find(m=>String(m.id)===String(b.dataset.mEdit)))});
 d.querySelector('.ctc-headshot')?.addEventListener('click',e=>e.currentTarget.classList.toggle('ctc-profile-photo-expanded'));
 const downloadHeadshot=d.querySelector('[data-download-headshot]');
 if(downloadHeadshot)downloadHeadshot.addEventListener('click',async()=>{
  const original=String(f.headshot_url||'');if(!original)return;
  const ext=(()=>{try{const x=new URL(original).pathname.split('.').pop().toLowerCase();return /^[a-z0-9]{2,5}$/.test(x)?x:'jpg'}catch{return 'jpg'}})();
  const filename=[f.first_name,f.last_name,'headshot'].filter(Boolean).join('-').replace(/[^a-z0-9_-]+/gi,'-')+'.'+ext;
  try{
   downloadHeadshot.disabled=true;downloadHeadshot.textContent='Downloading…';
   const r=await fetch(original);if(!r.ok)throw new Error('Could not download headshot');
   const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(err){
   const a=document.createElement('a');a.href=original;a.target='_blank';a.rel='noopener';a.download=filename;a.click();
  }finally{downloadHeadshot.disabled=false;downloadHeadshot.textContent='Download Headshot'}
 });
 d.querySelector('[data-ctc-message-fighter]').addEventListener('click',()=>d.close());
 async function refreshRequests(){const box=d.querySelector('#ctcProfileRequests');try{const all=await api('requests');const rows=all.filter(x=>x.fighter_id===f.id);box.innerHTML=rows.map(r=>`<div class="ctc-request-row"><strong>${r.request_type==='weight'?'Weight update':'Bloodwork'}</strong><span>${safe(r.status)} · ${new Date(r.created_at).toLocaleDateString()}${r.completed_at?' · Completed '+new Date(r.completed_at).toLocaleDateString():''}</span></div>`).join('')||'<p class="muted">No requests yet.</p>'}catch(e){box.innerHTML='<p class="muted">Request history unavailable. Check database setup.</p>';console.warn('Request history:',e.message)}};
 async function refreshWeights(){const box=d.querySelector('#ctcAdminWeightHistory');try{const rows=await api('weight-history&fighter_id='+encodeURIComponent(f.id));box.innerHTML=(rows||[]).map((r,i)=>`<div class="ctc-request-row ctc-admin-weight-row"><span><strong>${safe(r.weight)} lb</strong> · ${new Date(r.recorded_at).toLocaleDateString()} ${i===0?'<b>Latest</b>':''}${r.status==='invalid'?'<b class="danger-text">Needs correction</b>':''}${r.admin_comment?`<small>${safe(r.admin_comment)}</small>`:''}</span><button type="button" data-flag-weight="${safe(r.id)}">Flag invalid</button></div>`).join('')||'<p class="muted">No weigh-ins yet.</p>'}catch(e){box.innerHTML='<p class="muted">Weight history unavailable.</p>'}};d.addEventListener('click',async e=>{const b=e.target.closest('[data-flag-weight]');if(!b)return;const comment=prompt('Tell the fighter what is wrong with this weight:');if(!comment)return;try{await api('weight-flag',{id:b.dataset.flagWeight,comment});await refreshWeights()}catch(err){alert(err.message)}});refreshRequests();refreshWeights();d.showModal();
}

function editFighter(f={}){
 const creating=!f?.id;f=f||{};
 const d=document.createElement('dialog');d.className='event-dialog ctc-edit-dialog';
 const fields=[['Personal Information',[['first_name','First name'],['last_name','Last name'],['nickname','Nickname'],['date_of_birth','Date of birth','date']]],['Contact and Location',[['email','Email','email'],['phone','Phone','tel'],['city','City'],['state','State'],['closest_airport','Closest airport'],['airport_miles','Airport distance in miles','number']]],['Fight Information',[['weight_class','Weight class'],['current_weight','Current weight','number'],['target_weight','Fight weight','number'],['ready_to_fight','Ready to fight','boolean']]],['Gym and Camp',[['gym','Gym'],['coach','Coach']]],['Walkout Song',[['walkout_song_title','Song title'],['walkout_song_artist','Artist'],['walkout_song_url','Song link','url']]],['Social Media and Fighter Links',[['instagram_url','Instagram'],['tiktok_url','TikTok'],['tapology_url','Tapology'],['sherdog_url','Sherdog']]]];
 const control=([name,label,type])=>`<label>${safe(label)}<span class="ctc-edit-input">${type==='boolean'?`<select name="${name}"><option value="true" ${f[name]?'selected':''}>Yes</option><option value="false" ${!f[name]?'selected':''}>No</option></select>`:`<input name="${name}" type="${type||'text'}" ${['first_name','last_name','email'].includes(name)?'required':''} ${type==='number'?'step="any"':''} value="${safe(f[name]??'')}">`}${['gym','tapology_url','coach','nickname'].includes(name)?`<button type="button" class="ctc-na-button" data-na="${name}">N/A</button>`:''}</span></label>`;
 d.innerHTML=`<form class="admin-form dialog-form"><div class="dialog-heading"><div><p class="eyebrow">CTC FIGHTER PROFILE</p><h2>${creating?'Add Fighter':'Edit '+safe(full(f))}</h2></div><button type="button" class="icon-button" data-cancel>×</button></div><p class="muted">Expand the section you want to edit. Unsaved changes are discarded on Cancel.</p>${fields.map(([title,items],i)=>`<details class="ctc-edit-section" ${i===0?'open':''}><summary>${title}</summary><div class="form-grid">${items.map(control).join('')}</div></details>`).join('')}<div class="dialog-actions"><button type="button" class="ghost-button" data-cancel>Cancel</button><button type="submit" class="gold-button">SAVE CHANGES</button></div><p class="form-message" role="status"></p></form>`;
 document.body.append(d);d.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>d.close());d.addEventListener('close',()=>d.remove());d.querySelectorAll('[data-na]').forEach(b=>b.onclick=()=>{const field=d.querySelector(`[name="${b.dataset.na}"]`);field.value='N/A';field.dispatchEvent(new Event('input',{bubbles:true}))});
 d.querySelector('form').onsubmit=async e=>{e.preventDefault();const p=Object.fromEntries(new FormData(e.currentTarget));if(f.id)p.id=f.id;p.ready_to_fight=p.ready_to_fight==='true';for(const k of ['current_weight','target_weight','airport_miles'])p[k]=p[k]?Number(p[k]):null;const button=e.currentTarget.querySelector('[type="submit"]');button.disabled=true;try{await api('fighter-save',p);d.close();await loadRoster()}catch(x){d.querySelector('.form-message').textContent=x.message}finally{button.disabled=false}};
 d.showModal();
}

async function loadMatchups(){matchups=await api('matchups');renderMatchups();renderRoster();const c=$('matchupDashboardCount');if(c)c.textContent=matchups.filter(x=>x.status==='pending'||x.status==='confirmed').length}
async function loadUpcomingEvents(){try{upcomingEvents=await api('upcoming-events')}catch(e){console.warn('Could not load Upcoming Fights for matchmaking:',e.message);upcomingEvents=[]}}
const sameEvent=(m,e)=>String(m?.fight_date||'')===String(e?.event_date||'')&&String(m?.promotion||'').trim().toLowerCase()===String(e?.promotion||'').trim().toLowerCase()&&(!m?.venue||!e?.venue||String(m.venue).trim().toLowerCase()===String(e.venue).trim().toLowerCase());
const readMatchupMeta=notes=>({eventId:String(notes||'').match(/(?:^|\n)CTC_EVENT_ID:([0-9a-f-]+)(?:\n|$)/i)?.[1]||'',opponentPhoto:String(notes||'').match(/(?:^|\n)CTC_OPPONENT_PHOTO_URL:([^\n]+)/i)?.[1]||'',championship:String(notes||'').match(/(?:^|\n)CTC_CHAMPIONSHIP_BOUT:([01])(?:\n|$)/i)?.[1]==='1'});
const publicMatchupNotes=notes=>String(notes||'').split(/\r?\n/).filter(line=>!/^CTC_(?:EVENT_ID|OPPONENT_PHOTO_URL|CHAMPIONSHIP_BOUT):/i.test(line.trim())).join('\n').trim();
const selectedEventId=m=>readMatchupMeta(m?.notes).eventId||upcomingEvents.find(e=>sameEvent(m,e))?.id||'';
const eventOptionLabel=e=>[e.event_date,e.promotion,[e.city,e.state].filter(Boolean).join(', '),e.venue].filter(Boolean).join(' · ');
const matchupEdits=new Map();let matchupDraftNumber=0;
const matchFields=['fighter_id','status','fight_date','promotion','event_name','opponent_name','opponent_record','contracted_weight','discipline','venue','city','state','notes'];
const matchupValues=m=>({...Object.fromEntries(matchFields.map(k=>[k,m?.[k]??''])),notes:publicMatchupNotes(m?.notes),ctc_event_id:readMatchupMeta(m?.notes).eventId,opponent_photo_url:readMatchupMeta(m?.notes).opponentPhoto,championship_bout:readMatchupMeta(m?.notes).championship?'yes':'no'});
function renderMatchups(){
 const list=$('matchupList');if(!list)return;const term=($('matchupSearch')?.value||'').toLowerCase(),status=$('matchupStatus')?.value||'';
 const entries=[...matchups.filter(m=>!ctcActiveCardDate||String(m.fight_date||'')===ctcActiveCardDate).map(m=>({key:m.id,m})),...[...matchupEdits.entries()].filter(([key,edit])=>key.startsWith('new-')&&(!ctcActiveCardDate||edit.draft.fight_date===ctcActiveCardDate)).map(([key,edit])=>({key,m:edit.draft}))];
 const groups=new Map();entries.forEach(({key,m})=>{const f=roster.find(x=>x.id===m.fighter_id);if((status&&m.status!==status)||(!key.startsWith('new-')&&![full(f||{}),m.opponent_name,m.event_name,m.promotion].join(' ').toLowerCase().includes(term)))return;const group=`${m.fight_date||'9999-99-99'}|${m.event_name||m.promotion||'Event TBD'}`;if(!groups.has(group))groups.set(group,[]);groups.get(group).push({key,m,f})});
 list.classList.add('ctc-matchup-list');list.innerHTML=(ctcActiveCardDate?`<div class="ctc-card-edit-banner"><strong>${safe(knownFightCards[ctcActiveCardDate]||ctcActiveCardDate)} · Matchmaking Editor</strong>${ctcActiveCardSummary?`<p class="ctc-card-edit-summary">${safe(ctcActiveCardSummary)}</p>`:''}<button type="button" class="ghost-button" id="ctcShowAllCards">SHOW ALL CARDS</button><button type="button" class="gold-button" data-ctc-preview-date="${safe(ctcActiveCardDate)}">VIEW CARD</button></div>`:'')+[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([group,items])=>`<section class="ctc-matchup-group"><h4>${safe(group.split('|')[1])} <span>· ${safe(group.split('|')[0]==='9999-99-99'?'Date TBD':group.split('|')[0])}</span></h4><div class="ctc-matchup-grid">${items.map(({key,m,f})=>matchupCard(key,m,f)).join('')}</div></section>`).join('')||'<p class="muted">No matchups found.</p>';
}
function matchupCard(key,m,f){const edit=matchupEdits.get(key),p=edit?.draft||matchupValues(m),opened=edit?.open||false;
 const currentEventId=p.ctc_event_id||selectedEventId(p);
 const eventSelect=`<label class="wide">Upcoming fight<select data-m-event-select="${safe(key)}"><option value="">Choose from Upcoming Fights…</option>${upcomingEvents.length?'':'<option value="" disabled>No upcoming fights available</option>'}${upcomingEvents.map(e=>`<option value="${safe(e.id)}" ${String(e.id)===String(currentEventId)?'selected':''}>${safe(eventOptionLabel(e))}</option>`).join('')}</select><small class="field-help">Selecting a fight fills the date, promotion, venue, city, state, and discipline. You can still edit any field below.</small></label>`;
 const input=(name,label,type='text')=>`<label>${label}${name==='fighter_id'?`<select name="fighter_id" required><option value="">Choose fighter…</option>${roster.filter(x=>x.auth_user_id||x.id===p.fighter_id).map(x=>`<option value="${safe(x.id)}" ${x.id===p.fighter_id?'selected':''}>${safe(full(x))}</option>`).join('')}</select>`:name==='status'?`<select name="status">${['pending','confirmed','completed','cancelled'].map(x=>`<option value="${x}" ${x===p.status?'selected':''}>${x}</option>`).join('')}</select>`:name==='notes'?`<textarea name="notes">${safe(p.notes)}</textarea>`:`<input type="${type}" name="${name}" value="${safe(p[name])}">`}</label>`;
 const savedMatchup=!String(key).startsWith('new-');const publishReady=savedMatchup&&!!f&&!!m.fight_date&&!!(m.event_name||m.promotion)&&m.status!=='cancelled';const publishAction=savedMatchup?(m.is_public?`<button type="button" class="ctc-publish-button ctc-unpublish-button" data-m-unpublish="${safe(key)}">Unpublish</button>`:`<button type="button" class="ctc-publish-button" data-m-publish="${safe(key)}" ${publishReady&&!edit?.dirty?'':'disabled'} title="${edit?.dirty?'Save changes before publishing':publishReady?'Publish this matchup to the public Upcoming Fights page':'Add fighter, date and Upcoming Fight before publishing'}">Publish to Upcoming Fights</button>`):'';
 return `<article class="ctc-matchup-card" data-matchup-card="${safe(key)}"><div class="ctc-matchup-head">${photo(f)}<div><h5>${safe(full(f||{})||'Choose fighter')} ${m.opponent_name?`<span>vs ${safe(m.opponent_name)}</span>`:''}</h5><p>${safe(m.event_name||m.promotion||'Event TBD')} · ${safe(m.fight_date||'Date TBD')}</p><p>${safe(m.contracted_weight||'Weight TBD')} · ${safe(m.discipline||'Discipline TBD')}</p><div class="ctc-matchup-badges"><span class="ctc-roster-badge">${safe(m.status||'pending')}</span>${readMatchupMeta(m.notes).championship?'<span class="ctc-roster-badge ctc-championship-badge">Championship Bout</span>':''}${m.is_public?'<span class="ctc-roster-badge ctc-published-badge">Published</span>':''}${f?`<span class="ctc-roster-badge ${f.auth_user_id?'ctc-connected-badge':'ctc-pending-portal-badge'}">${safe(portalConnection(f))}</span>`:''}</div></div></div><div class="ctc-matchup-actions"><button type="button" class="gold-button" data-m-toggle="${safe(key)}" aria-expanded="${opened}">${opened?'Collapse':'Edit matchup'}</button>${f?`<button type="button" data-r-view="${safe(f.id)}">Fighter Profile</button>`:''}${publishAction}${savedMatchup?`<button type="button" class="ghost-button" data-m-travel="${safe(key)}">TRAVEL DETAILS</button>`:``}${edit?.dirty?'<span class="ctc-unsaved">● Unsaved changes</span>':''}</div>${opened?`<form class="ctc-matchup-form" data-m-form="${safe(key)}"><div class="form-grid">${eventSelect}${input('fighter_id','CTC Fighter')}${input('status','Fight status')}<label>Championship bout<select name="championship_bout"><option value="no" ${p.championship_bout==='yes'?'':'selected'}>No</option><option value="yes" ${p.championship_bout==='yes'?'selected':''}>Yes — Championship Bout</option></select><small class="field-help">Only appears on the public card when Yes.</small></label>${input('fight_date','Fight date','date')}${input('promotion','Promotion')}${input('event_name','Event')}${input('opponent_name','Opponent')}${input('opponent_record','Opponent record')}${input('opponent_photo_url','Opponent headshot URL (optional)','url')}${input('contracted_weight','Contracted weight')}${input('discipline','Discipline')}${input('venue','Venue')}${input('city','City')}${input('state','State')}${input('notes','Notes')}</div><div class="dialog-actions"><button type="button" class="ghost-button" data-m-toggle="${safe(key)}">COLLAPSE MATCHUP ↑</button><button type="button" class="ghost-button" data-m-cancel="${safe(key)}">Cancel</button><button type="submit" class="ghost-button">Save matchup</button><button type="submit" class="gold-button" data-m-save-publish>Save &amp; Publish</button></div><p class="form-message" role="status"></p></form>`:''}</article>`;
}
function matchupEditor(m={}){const key=m.id||`new-${++matchupDraftNumber}`;if(!matchupEdits.has(key))matchupEdits.set(key,{draft:{...matchupValues(m),ctc_event_id:m.ctc_event_id||readMatchupMeta(m?.notes).eventId||'',status:m.status||'pending'},open:true,dirty:false});else matchupEdits.get(key).open=true;renderMatchups();document.querySelector(`[data-matchup-card="${key}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'})}
function openRosterMatchup(fighterId){
 const fighter=roster.find(f=>String(f.id)===String(fighterId));if(!fighter){alert('Fighter not found in the live roster.');return}
 if(!fighter.auth_user_id){alert('Activate this fighter’s existing roster profile before assigning a matchup.');return}
 const tab=document.querySelector('#adminTabs button[data-tab="matchmaking"]');tab?.click();
 if($('matchupStatus'))$('matchupStatus').value='';if($('matchupSearch'))$('matchupSearch').value='';
 matchupEditor({fighter_id:fighter.id,status:'pending'});
}
function openExistingRosterMatchups(id){
 const assigned=fighterMatchups(roster.find(f=>String(f.id)===String(id)));
 if(!assigned.length)return alert('No assigned fights yet. Choose Assign Matchup.');
 ctcActiveCardDate='';ctcActiveCardSummary='';
 document.querySelector('#adminTabs button[data-tab="matchmaking"]')?.click();
 $('matchupStatus').value='';$('matchupSearch').value='';
 for(const state of matchupEdits.values())state.open=false;
 for(const m of assigned){matchupEdits.set(m.id,{draft:matchupValues(m),open:true,dirty:false})}
 renderMatchups();
 document.querySelector(`[data-matchup-card="${assigned[0].id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});
}
const matchupList=$('matchupList');
matchupList?.addEventListener('input',e=>{const form=e.target.closest('[data-m-form]');if(!form||!e.target.name)return;const item=matchupEdits.get(form.dataset.mForm);if(!item)return;item.draft[e.target.name]=e.target.value;item.dirty=true;const badge=form.closest('.ctc-matchup-card')?.querySelector('.ctc-unsaved');if(!badge){const b=document.createElement('span');b.className='ctc-unsaved';b.textContent='● Unsaved changes';form.closest('.ctc-matchup-card')?.querySelector('.ctc-matchup-actions')?.append(b)}});
matchupList?.addEventListener('change',e=>{const form=e.target.closest('[data-m-form]');if(!form)return;const key=form.dataset.mForm,item=matchupEdits.get(key);if(!item)return;const eventSelect=e.target.closest('[data-m-event-select]');if(eventSelect){const selected=upcomingEvents.find(x=>String(x.id)===String(eventSelect.value));if(selected){Object.assign(item.draft,{ctc_event_id:String(selected.id),fight_date:selected.event_date||'',promotion:selected.promotion||'',event_name:'',venue:selected.venue||'',city:selected.city||'',state:selected.state||'',discipline:selected.discipline||''});item.dirty=true;renderMatchups();document.querySelector(`[data-matchup-card="${key}"]`)?.scrollIntoView({block:'nearest'});}return}if(e.target.name){item.draft[e.target.name]=e.target.value;item.dirty=true}});
matchupList?.addEventListener('click',async e=>{const toggle=e.target.closest('[data-m-toggle]'),cancel=e.target.closest('[data-m-cancel]'),publish=e.target.closest('[data-m-publish]'),unpublish=e.target.closest('[data-m-unpublish]');if(toggle){const key=toggle.dataset.mToggle;if(matchupEdits.has(key)){const state=matchupEdits.get(key);if(state.open&&state.dirty&&!confirm('Hide this editor? Your unsaved changes will be kept until you save or cancel.'))return;state.open=!state.open}else matchupEditor(matchups.find(x=>x.id===key));renderMatchups();return}if(cancel){const key=cancel.dataset.mCancel;matchupEdits.delete(key);renderMatchups();return}if(publish||unpublish){const id=(publish||unpublish).dataset.mPublish||(publish||unpublish).dataset.mUnpublish;const m=matchups.find(x=>String(x.id)===String(id));if(!m)return;const willPublish=!!publish;if(willPublish&&!confirm(`Publish ${full(roster.find(x=>x.id===m.fighter_id)||{})||'this fighter'}${m.opponent_name?' vs '+m.opponent_name:''} to the public Upcoming Fights page?`))return;if(!willPublish&&!confirm('Remove this matchup from the public Upcoming Fights page? The admin matchup will stay saved.'))return;const b=publish||unpublish;const original=b.textContent;b.disabled=true;b.textContent=willPublish?'Publishing…':'Unpublishing…';try{await api('matchup-publication',{id,publish:willPublish});matchups=await api('matchups');renderMatchups()}catch(err){alert(err.message||'Could not update public fight listing.');b.disabled=false;b.textContent=original}}});
matchupList?.addEventListener('click',e=>{
 if(e.target.closest('button,a,input,select,textarea,label,summary,form'))return;
 const card=e.target.closest('[data-matchup-card]');if(!card)return;
 const toggle=card.querySelector('[data-m-toggle]');toggle?.click();
});
matchupList?.addEventListener('submit',async e=>{const form=e.target.closest('[data-m-form]');if(!form)return;e.preventDefault();const key=form.dataset.mForm,values=Object.fromEntries(new FormData(form));const draft=matchupEdits.get(key)?.draft;
 const eventId=draft?.ctc_event_id||'';const opponentPhoto=String(values.opponent_photo_url||'').trim();
 if(opponentPhoto&&!/^https?:\/\/\S+$/i.test(opponentPhoto)){form.querySelector('.form-message').textContent='Enter a valid http(s) opponent photo URL.';return}
 values.notes=[publicMatchupNotes(values.notes),eventId?`CTC_EVENT_ID:${eventId}`:'',opponentPhoto?`CTC_OPPONENT_PHOTO_URL:${opponentPhoto}`:'',`CTC_CHAMPIONSHIP_BOUT:${values.championship_bout==='yes'?'1':'0'}`].filter(Boolean).join('\n');delete values.opponent_photo_url;delete values.championship_bout;
 if(!values.fighter_id){form.querySelector('.form-message').textContent='Choose a CTC fighter.';return}if(!key.startsWith('new-'))values.id=key;
 const publishNow=!!e.submitter?.hasAttribute('data-m-save-publish');
 if(publishNow&&(!eventId||!values.fight_date||values.status==='cancelled')){form.querySelector('.form-message').textContent='Choose an Upcoming Fight, date, and a non-cancelled fight status before publishing.';return}
 if(publishNow&&!confirm('Publish this activated fighter on the live Upcoming Fights card now?'))return;
 const buttons=[...form.querySelectorAll('[type="submit"]')];buttons.forEach(b=>b.disabled=true);
 try{
  const saved=await api('matchup-save',values);
  matchupEdits.delete(key);
  let publishError=null;
  if(publishNow){try{await api('matchup-publication',{id:saved.id,publish:true})}catch(err){publishError=err}}
  matchups=await api('matchups');renderMatchups();renderRoster();
  if(publishError)alert(`Matchup saved to the roster, but the public card was NOT published: ${publishError.message}. Open that saved matchup and tap Publish to Upcoming Fights.`);
  else if(publishNow)alert('Published to Upcoming Fights and linked to the fighter’s active roster profile.');
 }catch(err){form.querySelector('.form-message').textContent=err.message;buttons.forEach(b=>b.disabled=false)}});

function docStatus(f){const d=docs.filter(x=>x.fighter_id===f.id&&x.document_type==='bloodwork').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];if(!d)return ['needs','NEEDS BLOODWORK',null];if(d.review_status==='pending')return ['pending','PENDING REVIEW',d];if(d.review_status!=='approved')return ['needs','NEEDS BLOODWORK',d];const days=(new Date(d.expiration_date)-new Date())/86400000;if(days<0)return ['needs','NEEDS BLOODWORK',d];if(days<=30)return ['expiring','EXPIRING SOON',d];return ['good','GOOD',d]}
async function loadDocs(){docs=await api('documents');renderDocs();renderRoster();const good=roster.filter(f=>docStatus(f)[0]==='good').length;$('bloodworkCount').textContent=`${good}/${roster.length}`}
function renderDocs(){const term=($('bloodworkSearch')?.value||'').toLowerCase(),filter=$('bloodworkStatusFilter')?.value||'';$('bloodworkList').innerHTML=roster.filter(f=>{const [s]=docStatus(f);return(!filter||s===filter)&&full(f).toLowerCase().includes(term)}).map(f=>{const [s,label,d]=docStatus(f);return `<article class="admin-row ctc-bloodwork-row"><div><strong>${safe(full(f))}</strong><span>${label}${d?.expiration_date?` · Expires ${d.expiration_date}`:''}</span><small>${d?`Uploaded ${new Date(d.created_at).toLocaleDateString()} · ${d.review_status}`:'No bloodwork on file'}</small></div><div class="ctc-bloodwork-actions"><button type="button" data-r-view="${safe(f.id)}">View Profile</button><button type="button" class="gold-button" data-blood-request="${safe(f.id)}">Request Bloodwork</button>${d?`<button data-doc-view="${d.id}">View</button><button data-doc-download="${d.id}">Download</button>`:''}${d&&(d.review_status==='rejected'||(d.expiration_date&&new Date(d.expiration_date)<new Date()))?`<button type="button" class="danger" data-doc-delete="${safe(d.id)}">Delete old upload</button>`:''}${d?.review_status==='pending'?`<button data-doc-approve="${d.id}">Approve</button><button class="danger" data-doc-reject="${d.id}">Reject</button>`:''}</div></article>`}).join('')||'<p class="muted">No fighters in this status.</p>'}
async function init(force=false){if((started&&!force)||!document.getElementById('dashboard')||document.getElementById('dashboard').hidden)return;started=true;try{await loadRoster();await loadUpcomingEvents();await Promise.all([loadMatchups(),loadDocs()]);await loadAdminNotifications().catch(()=>{})}catch(e){console.error('CTC live dashboard load failed:',e);started=false}}
function weightClassKey(value){
 const text=String(value??'').trim().toLowerCase();
 if(!text || text==='n/a' || text==='not provided')return '__unspecified__';
 return text.replace(/\s*(?:lbs?\.?|pounds?)\s*$/i,'').replace(/\s+/g,' ').trim();
}
function updateRosterWeightClassOptions(){
 const filter=$('downloadRosterWeightClass');if(!filter)return;
 const old=filter.value, counts=new Map();
 for(const f of roster){const k=weightClassKey(f.weight_class);counts.set(k,(counts.get(k)||0)+1)}
 const keys=[...counts.keys()].sort((a,b)=>a==='__unspecified__'?1:b==='__unspecified__'?-1:(parseFloat(a)||0)-(parseFloat(b)||0)||a.localeCompare(b));
 filter.replaceChildren(new Option('All weight classes ('+roster.length+')',''));
 for(const k of keys)filter.add(new Option((k==='__unspecified__'?'Unspecified':k)+' ('+counts.get(k)+')',k));
 filter.value=keys.includes(old)?old:'';
}
async function downloadRosterCsv(){
 const status=$('fightersMessage');
 try{
  if(status){status.textContent='Preparing roster download…';status.className='form-message'}
  if(!roster.length)await loadRoster();
  if(!roster.length)throw new Error('No fighters are currently in the roster.');
  const chosen=$('downloadRosterWeightClass')?.value||'';
  const exported=chosen?roster.filter(f=>weightClassKey(f.weight_class)===chosen):roster;
  if(!exported.length)throw new Error('No fighters match this weight class. Refresh the roster and try again.');

  const cols=[
   ['First Name','first_name'],['Last Name','last_name'],['Nickname','nickname'],['Email','email'],['Phone','phone'],
   ['City','city'],['State','state'],['Closest Airport','closest_airport'],['Current Weight','current_weight'],
   ['Fight Weight','target_weight'],['Weight Class','weight_class'],['Gym','gym'],['Coach','coach'],
   ['Amateur Wins','amateur_wins'],['Amateur Losses','amateur_losses'],['Amateur Draws','amateur_draws'],
   ['Pro Wins','pro_wins'],['Pro Losses','pro_losses'],['Pro Draws','pro_draws'],
   ['Ready To Fight','ready_to_fight'],['Portal Account','auth_user_id'],['Portal Status','portal_status'],['Roster Status','status'],
   ['Headshot URL','headshot_url']
  ];
  const csv=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const rows=[
   cols.map(x=>csv(x[0])).join(','),
   ...exported.map(f=>cols.map(([label,key])=>csv(
    key==='ready_to_fight'?(f[key]?'Yes':'No'):
    key==='auth_user_id'?(f[key]?'Activated':'Not activated'):
    f[key]
   )).join(','))
  ];
  const suffix=chosen?'-'+(chosen==='__unspecified__'?'Unspecified':chosen.replace(/[^a-z0-9-]+/gi,'-')):'';
  const filename=`CTC-Fighter-Roster${suffix}-${new Date().toISOString().slice(0,10)}.csv`;
  const file=new File(['\ufeff'+rows.join('\r\n')],filename,{type:'text/csv;charset=utf-8'});

  // iPhone/iPad: native share sheet is the most reliable path and includes "Save to Files".
  const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(isiOS&&navigator.share&&navigator.canShare?.({files:[file]})){
   if(status){status.textContent='Roster ready — choose “Save to Files” in the share sheet.';status.className='form-message success'}
   await navigator.share({files:[file],title:'CTC Fighter Roster'});
   return;
  }

  // Standard browser download.
  const url=URL.createObjectURL(file);
  const a=document.createElement('a');
  a.href=url;a.download=filename;a.style.display='none';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  if(status){status.textContent=`Roster downloaded (${exported.length} fighter${exported.length===1?'':'s'}).`;status.className='form-message success'}
 }catch(err){
  if(err?.name==='AbortError'){
   if(status){status.textContent='Roster download canceled.';status.className='form-message'}
   return;
  }
  console.error('CTC roster download:',err);
  if(status){status.textContent=err.message||'Could not download roster.';status.className='form-message'}
  else alert(err.message||'Could not download roster.');
 }
}

let ctcActiveCardDate="";let ctcActiveCardSummary="";
const knownFightCards={
 '2026-10-24':'OCT 24 — FLEX FIGHT SERIES 63: GLOW BASH 2',
 '2026-11-06':'NOV 6 — FLEX FIGHT SERIES 64'
};
async function loadDatedFightCard(date,button){
 const title=knownFightCards[date],status=$('ctcSyncOctNovStatus');
 if(!title||!status||button.disabled)return;
 const original=button.textContent;button.disabled=true;
 // LOAD is one click: always show the dated editor, never a blocking confirm box.
 ctcActiveCardDate=date;
 if($('matchupStatus'))$('matchupStatus').value='';
 if($('matchupSearch'))$('matchupSearch').value='';
 ctcActiveCardSummary='Syncing activated fighters from the live roster…';
 renderMatchups();
 status.className='form-message';status.textContent=`Checking ${title} and opening Matchmaking…`;
 try{
  // No pending roster creation. Re-running is safe when new fighters activate;
  // already-published matchups retain edits, and missing fighters wait.
  button.textContent='LOADING '+date+'…';
  const result=await api('sync-oct-nov-cards',{date,preview:false});
  const errors=(result.errors||[]).map(x=>`${x.name||x.date}: ${x.error}`).join(' | ');
  const reloads=await Promise.allSettled([loadRoster(),loadUpcomingEvents(),loadMatchups()]);
  const reloadErrors=reloads.filter(r=>r.status==='rejected').map(r=>r.reason?.message||'Could not refresh Admin');
  const newlyLinked=(result.results||[]).filter(x=>!x.existing).length;
  const alreadyLinked=(result.results||[]).filter(x=>x.existing).length;
  const waiting=result.missing||[];
  const expected=(result.dates||[]).find(x=>x.date===date)?.fighters||[];
  const aliases={'Jeremiah Parker Jones':['Jeremiah Parker Jones','Jeremiah Jones']};
  const normalized=v=>String(v||'').toLowerCase().replace(/[“”"']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const expectedFighters=expected.map(name=>({name,fighters:roster.filter(f=>(aliases[name]||[name]).some(n=>normalized(n)===normalized([f.first_name,f.last_name].join(' '))))}));
  const parent=upcomingEvents.find(e=>String(e.notes||'').includes('CTC_ROSTER_CARD:'+date))||upcomingEvents.find(e=>String(e.event_date||'')===date&&!String(e.notes||'').includes('CTC_MATCHUP_ID:'));
  const onDate=matchups.filter(m=>String(m.fight_date||'')===date&&m.status!=='cancelled');
  const card=onDate.filter(m=>!parent?.id||!readMatchupMeta(m.notes).eventId||String(readMatchupMeta(m.notes).eventId)===String(parent.id));
  const assignedOnDate=expectedFighters.filter(x=>x.fighters.length===1&&onDate.some(m=>String(m.fighter_id)===String(x.fighters[0].id)));
  const attached=expectedFighters.filter(x=>x.fighters.length===1&&card.some(m=>String(m.fighter_id)===String(x.fighters[0].id)));
  const saved=assignedOnDate.length,verified=attached.length,eventReview=saved-verified;
  ctcActiveCardSummary=`${saved}/${expected.length} saved for ${date} · ${verified} verified on selected event · ${newlyLinked} newly linked${eventReview?` · ${eventReview} need event review`:''}`;
  // No fighter is automatically opened by card loading.
  for(const edit of matchupEdits.values())edit.open=false;
  renderMatchups();
  let visible=null,publicError='';
  try{
   const response=await fetch('/.netlify/functions/ctc-public-fightcards?check='+Date.now(),{cache:'no-store'});
   const feed=await response.json();if(!response.ok)throw Error(feed.error||'Public fight card unavailable');
   const ids=new Set(onDate.filter(m=>expectedFighters.some(x=>x.fighters.length===1&&String(x.fighters[0].id)===String(m.fighter_id))).map(m=>String(m.id)));
   visible=(feed.matchups||[]).filter(m=>ids.has(String(m.id))).length;
  }catch(error){publicError=error.message;}
  status.textContent=`${title}: ${saved}/${expected.length} confirmed fighters have saved matchups on this date · ${verified} verified on selected event · ${newlyLinked} newly linked this run${visible===null?'':` · ${visible} published on the live feed`}.`+
   (eventReview?`\n${eventReview} existing matchup(s) refer to another event on this date. They were not overwritten; review their Upcoming Fight selection in the editor.`:'')+
   (waiting.length?`\nAwaiting fighter activation / roster match: ${waiting.join(', ')}. No placeholder profiles were created.`:'')+
   ((result.ambiguous||[]).length?`\nDuplicate roster names — review manually: ${result.ambiguous.join(', ')}.`:'')+
   (errors?`\nSave errors: ${errors}`:'')+
   (reloadErrors.length?`\nAdmin refresh: ${reloadErrors.join(' | ')}`:'')+
   (publicError?`\nPublic feed could not be verified: ${publicError}`:'')+
   (visible!==null&&visible!==saved?`\nPUBLIC COUNT MISMATCH: ${visible}/${saved} saved fighters visible on the date.`:'')+
   '\nMatchmaking is open below. Load again after another fighter activates, or use VIEW CARD to inspect the public layout.';
  const issue=!!errors||reloadErrors.length>0||!!publicError||(visible!==null&&visible!==saved)||(result.ambiguous||[]).length>0;
  status.className='form-message '+(issue?'error':'success');
 }catch(e){
  status.textContent=`${title}: ${e.message}. Matchmaking remains open below; no fighter profiles were created.`;
  status.className='form-message error';
  const reload=await Promise.allSettled([loadRoster(),loadUpcomingEvents(),loadMatchups()]);
  if(reload.some(r=>r.status==='fulfilled'))renderMatchups();
 }finally{button.disabled=false;button.textContent=original;$('matchupList')?.scrollIntoView({block:'start',behavior:'smooth'});}
}
document.addEventListener('click',e=>{if(e.target.closest('#ctcShowAllCards')){ctcActiveCardDate='';renderMatchups()}const p=e.target.closest('.ctc-card-edit-banner [data-ctc-preview-date]');if(p)openCardPreview(p.dataset.ctcPreviewDate)});
document.querySelectorAll('[data-ctc-load-card]').forEach(button=>button.addEventListener('click',()=>loadDatedFightCard(button.dataset.ctcLoadCard,button)));
const cardPreviewDialog=$('ctcCardPreviewDialog');
const cardPreviewFrame=$('ctcCardPreviewFrame');
let previewDate='';
const fighterLevel=f=>String(f.fighter_level||f.level||'');
const recordOf=(f,prefix)=>[f[prefix+'_wins'],f[prefix+'_losses'],f[prefix+'_draws']].every(v=>v==null)?'':[f[prefix+'_wins']||0,f[prefix+'_losses']||0,f[prefix+'_draws']||0].join('-');
function previewPayload(date){
 const parent=upcomingEvents.find(e=>String(e.notes||'').includes('CTC_ROSTER_CARD:'+date))||upcomingEvents.find(e=>String(e.event_date)===date&&!String(e.notes||'').includes('CTC_MATCHUP_ID:'));
 const card=parent||{id:'unpublished-'+date,event_date:date,promotion:'Flex Fight Series',city:date==='2026-10-24'?'Melville':'New York',state:'NY',venue:date==='2026-10-24'?'Gossip Night Club':'TBA',status:'confirmed',notes:date==='2026-10-24'?'CTC_SERIES_NUMBER:63\nCTC_EVENT_TITLE:Glow Bash 2\nCTC_EVENT_TIME:3:00 PM – 11:30 PM EDT':'CTC_SERIES_NUMBER:64'};
 const belongs=m=>!parent?.id||!readMatchupMeta(m.notes).eventId||String(readMatchupMeta(m.notes).eventId)===String(parent.id);
 const all=[...matchups.filter(m=>m.fight_date===date&&belongs(m)).map(m=>({...m,...matchupEdits.get(m.id)?.draft})),...[...matchupEdits.entries()].filter(([id,x])=>id.startsWith('new-')&&x.draft.fight_date===date&&belongs(x.draft)).map(([id,x])=>x.draft)];
 const draftCount=all.filter(m=>matchupEdits.has(m.id)||!m.id).length;
 const items=all.filter(m=>m.status!=='cancelled').map(m=>{
  const f=roster.find(f=>String(f.id)===String(m.fighter_id));if(!f)return null;
  return {id:m.id||'',championshipBout:readMatchupMeta(m.notes).championship||m.championship_bout==='yes',weight:m.contracted_weight||f.target_weight||f.current_weight||'',discipline:m.discipline||(Array.isArray(f.disciplines)?f.disciplines.join(', '):f.disciplines)||'',fighter:{name:full(f),headshot:f.headshot_url||'',city:f.city||f.hometown||'',state:f.state||'',gym:f.gym||'',amateurRecord:recordOf(f,'amateur'),proRecord:recordOf(f,'pro'),fighterLevel:fighterLevel(f),weight:f.target_weight||f.current_weight||''},opponent:m.opponent_name?{name:m.opponent_name,record:m.opponent_record,headshot:readMatchupMeta(m.notes).opponentPhoto||m.opponent_photo_url||''}:null};
 }).filter(Boolean);
 return {card,items,draftCount,saved:all.filter(m=>m.is_public).length};
}
function openCardPreview(date){
 if(!knownFightCards[date])return;
 previewDate=date;
 const status=$('ctcCardPreviewStatus'),heading=$('ctcCardPreviewHeading');
 const payload=previewPayload(date);
 heading.textContent=knownFightCards[date]+' · CARD PREVIEW';
 status.textContent=`ADMIN PREVIEW — ${payload.items.length} assigned fighter(s). ${payload.saved} published. Edits not saved/published are PREVIEW ONLY and are not live.`;
 $('ctcCardPreviewLive').href='../fight-card.html?event='+encodeURIComponent(payload.card.id||'');
 const send=()=>cardPreviewFrame.contentWindow?.postMessage({type:'ctc-admin-card-preview',card:payload.card,matchups:payload.items},location.origin);
 cardPreviewFrame.onload=()=>setTimeout(send,100);
 if(cardPreviewFrame.getAttribute('src')!=='/admin/card-preview.html')cardPreviewFrame.src='/admin/card-preview.html';else send();
 cardPreviewDialog.showModal();
}
for(const b of document.querySelectorAll('[data-ctc-preview-date]'))b.addEventListener('click',async()=>{
 try{if(!roster.length)await loadRoster();if(!matchups.length)await loadMatchups();await loadUpcomingEvents();openCardPreview(b.dataset.ctcPreviewDate)}catch(e){alert('Card preview could not load: '+e.message)}
});
// Account creation lives in its own Admin tool; fight-card LOAD/VIEW stay side by side.
const amScope=$('ctcAmScope'),amFighter=$('ctcAmFighter'),amFighterWrap=$('ctcAmFighterWrap');
const amMode=$('ctcAmPasswordMode'),amPassword=$('ctcAmPassword'),amPasswordWrap=$('ctcAmPasswordWrap');
const amPreview=$('ctcAmPreview'),amActivate=$('ctcAmActivate'),amResult=$('ctcAmResult');
let amEligible=null,amKey='';
const amLabel={already_active:'ALREADY ACTIVE — skip',ready_to_activate:'READY — send access',missing_roster:'MISSING ROSTER — review',missing_email:'MISSING EMAIL — review',duplicate_name:'DUPLICATE NAME — review',inactive:'INACTIVE — review',activated:'ACTIVATED',error:'ERROR'};
function amReset(){amEligible=null;amKey='';amActivate.disabled=true;amResult.textContent='Select your fighter or card, then check eligibility.'}
function amRenderFighters(){const selected=amFighter.value;amFighter.replaceChildren(new Option('Select a fighter…',''));for(const f of [...roster].sort((a,b)=>full(a).localeCompare(full(b)))){const option=new Option([f.first_name,f.last_name].filter(Boolean).join(' ')+(f.auth_user_id?' · active':''),String(f.id));amFighter.add(option)}amFighter.value=selected}
function amControls(){const card=amScope.value!=='individual';amFighterWrap.hidden=card;amMode.querySelector('option[value="manual"]').disabled=card;if(card)amMode.value='generate';amPasswordWrap.hidden=amMode.value!=='manual';if(amPasswordWrap.hidden)amPassword.value='';amReset()}
for(const control of [amScope,amFighter,amMode])control?.addEventListener('change',amControls);
amPassword?.addEventListener('input',()=>{if(amEligible)amActivate.disabled=amMode.value==='manual'&&!/^.{12,128}$/.test(amPassword.value);});
async function amCheck(){
 if(amScope.value==='individual'&&!amFighter.value)throw new Error('Select a roster fighter first.');
 if(!roster.length)await loadRoster();amRenderFighters();
 const payload=amScope.value==='individual'?{fighter_id:amFighter.value}:{date:amScope.value,preview:true};
 const out=await api(amScope.value==='individual'?'account-manager-preview':'card-activate-fighters',payload);
 const results=out.results||[],ready=results.filter(x=>x.state==='ready_to_activate').length;
 amResult.textContent=results.map(x=>`${x.name} — ${amLabel[x.state]||x.state}${x.email?' · '+x.email:''}`).join('\n')+`\n\n${ready} ready to activate. ${results.length-ready} already active or need review.`;
 amEligible={results,ready};amKey=JSON.stringify({scope:amScope.value,fighter:amFighter.value,mode:amMode.value});
 amActivate.disabled=!ready||(amMode.value==='manual'&&amPassword.value.length<12);
}
amPreview?.addEventListener('click',async()=>{amPreview.disabled=true;amActivate.disabled=true;amResult.textContent='Checking live roster…';try{await loadRoster();await amCheck()}catch(e){amReset();amResult.textContent=e.message}finally{amPreview.disabled=false}});
amActivate?.addEventListener('click',async()=>{
 if(!amEligible?.ready||amKey!==JSON.stringify({scope:amScope.value,fighter:amFighter.value,mode:amMode.value}))return amReset();
 if(amMode.value==='manual'&&(amPassword.value.length<12||amPassword.value.length>128||!/[A-Za-z]/.test(amPassword.value)||!/\d/.test(amPassword.value)))return amResult.textContent='Enter a unique 12–128 character password containing letters and a number.';
 const label=amScope.value==='individual'?amEligible.results[0]?.name:knownFightCards[amScope.value];
 if(!confirm(`Activate ${amEligible.ready} eligible fighter(s) in ${label}? Each new account gets a CTC login email. Already active accounts and missing profiles are skipped.`))return;
 amActivate.disabled=true;amPreview.disabled=true;amResult.textContent='Activating eligible accounts and sending CTC emails…';
 try{
  const result=amScope.value==='individual'?await api('fighter-activate-account',{id:amFighter.value,password_mode:amMode.value,temporary_password:amMode.value==='manual'?amPassword.value:undefined}):await api('card-activate-fighters',{date:amScope.value,preview:false,password_mode:'generate'});
  const results=amScope.value==='individual'?[{name:label,state:result.already_active?'already_active':'activated',emailed:!!result.activation_email?.sent,error:result.activation_email?.error}]:result.results;
  amResult.textContent=results.map(x=>`${x.name}: ${amLabel[x.state]||x.state}${x.emailed?' — CTC EMAIL SENT':''}${x.state==='activated'&&!x.emailed?' — EMAIL FAILED; use Forgot Password':''}${x.error?' — '+x.error:''}`).join('\n')+'\n\nAccount activation does not overwrite saved matchups. Press LOAD in Matchmaking to attach newly active fighters.';
  amPassword.value='';amEligible=null;amKey='';await loadRoster();await loadMatchups();
 }catch(e){amResult.textContent=e.message}finally{amPreview.disabled=false;amActivate.disabled=true}
});
document.querySelector('#adminTabs button[data-tab="account-manager"]')?.addEventListener('click',async()=>{try{await loadRoster();amRenderFighters()}catch(e){amResult.textContent=e.message}});
$('ctcCardPreviewCloseTop')?.addEventListener('click',()=>cardPreviewDialog.close());
$('ctcCardPreviewCloseBottom')?.addEventListener('click',()=>cardPreviewDialog.close());
$('ctcCardPreviewEdit')?.addEventListener('click',()=>{cardPreviewDialog.close();ctcActiveCardDate=previewDate;renderMatchups();document.querySelector('#adminTabs button[data-tab="matchmaking"]')?.click();$('matchupList')?.scrollIntoView({block:'start',behavior:'smooth'})});
cardPreviewDialog?.addEventListener('close',()=>{cardPreviewFrame.src='about:blank'});

// A guided new card creation path: use the existing Admin calendar form, then open
// an attached Matchmaking draft after the new event has actually been saved.
let creatingCardForMatchups=false;
let knownEventIds=new Set();
$('ctcNewCardMatchups')?.addEventListener('click',()=>{
 const calendarTab=document.querySelector('#adminTabs button[data-tab="fights"]');
 const addEvent=$('newEventButton');
 if(!calendarTab||!addEvent){alert('Public Fight Calendar editor unavailable.');return}
 knownEventIds=new Set(upcomingEvents.map(e=>String(e.id)));
 creatingCardForMatchups=true;
 calendarTab.click();addEvent.click();
 const status=$('ctcSyncOctNovStatus');if(status)status.textContent='Create and save your new card, then select a roster fighter in Matchmaking. Assign the matchup after the fighter activates their portal.';
});
$('editorDialog')?.addEventListener('close',()=>{if(creatingCardForMatchups)creatingCardForMatchups=false});
$('newFighterButton')?.addEventListener('click',()=>editFighter({}));document.addEventListener('ctc-upcoming-fights-updated',async()=>{
 // Capture before awaiting: the Admin editor closes after saving and should
 // not cancel the new-card workflow while the event fetch is in flight.
 const newCardJustSaved=creatingCardForMatchups;
 if(newCardJustSaved)creatingCardForMatchups=false;
 try{
  await loadUpcomingEvents();
  if(newCardJustSaved){
   const newlyAdded=upcomingEvents.find(e=>!knownEventIds.has(String(e.id)));
   document.querySelector('#adminTabs button[data-tab="matchmaking"]')?.click();
   if(newlyAdded)matchupEditor({ctc_event_id:String(newlyAdded.id),fight_date:newlyAdded.event_date||'',promotion:newlyAdded.promotion||'',venue:newlyAdded.venue||'',city:newlyAdded.city||'',state:newlyAdded.state||'',discipline:newlyAdded.discipline||'',status:'pending'});
   else matchupEditor({status:'pending'});
   const status=$('ctcSyncOctNovStatus');if(status)status.textContent='New card saved. Select a roster fighter, then use Save & Publish to add a matchup to that card.';
  }else renderMatchups();
 }catch(err){console.error('Upcoming fight refresh failed:',err)}
});document.addEventListener('ctc-admin-ready',()=>init(true));setTimeout(()=>init(),100);$('fighterSearch')?.addEventListener('input',renderRoster);$('fighterLevelFilter')?.addEventListener('change',renderRoster);$('matchupSearch')?.addEventListener('input',renderMatchups);$('matchupStatus')?.addEventListener('change',renderMatchups);$('bloodworkSearch')?.addEventListener('input',renderDocs);$('bloodworkStatusFilter')?.addEventListener('change',renderDocs);$('newMatchupButton')?.addEventListener('click',()=>matchupEditor());
document.addEventListener('click',async e=>{if(e.target.closest('#downloadRosterButton')){e.preventDefault();await downloadRosterCsv();return}const viewMatchups=e.target.closest('[data-r-view-matchups]');if(viewMatchups){e.preventDefault();openExistingRosterMatchups(viewMatchups.dataset.rViewMatchups);return}const assign=e.target.closest('[data-r-assign]');if(assign){e.preventDefault();openRosterMatchup(assign.dataset.rAssign);return}const viewId=e.target.closest('[data-r-view]')?.dataset.rView;if(viewId){viewFighter(roster.find(x=>x.id===viewId));return}const id=e.target.dataset.rEdit;if(id)return editFighter(roster.find(x=>x.id===id));if(e.target.dataset.rAdminActivate){document.querySelector('#adminTabs button[data-tab="account-manager"]')?.click();amScope.value='individual';amControls();amFighter.value=e.target.dataset.rAdminActivate;amResult.textContent='Selected fighter. Check eligibility before activating.';return}if(e.target.dataset.rAccess){const f=roster.find(x=>x.id===e.target.dataset.rAccess);await api('fighter-access',{id:f.id,portal_status:f.portal_status==='disabled'?'not_activated':'disabled'});await loadRoster();return}if(e.target.dataset.rDeactivate){if(confirm('Deactivate this fighter and disable portal access? Their history will be kept.')){await api('fighter-deactivate',{id:e.target.dataset.rDeactivate});await loadRoster()}return}if(e.target.dataset.mEdit)return matchupEditor(matchups.find(x=>x.id===e.target.dataset.mEdit));if(e.target.dataset.docView){try{const doc=docs.find(x=>String(x.id)===String(e.target.dataset.docView));const f=roster.find(x=>x.id===doc?.fighter_id);const x=await api('document-url',{id:e.target.dataset.docView});const box=$('bloodworkPreview');if(box){const name=doc?.original_name||doc?.file_path||'bloodwork';const ext=String(name).split('.').pop().toLowerCase();const image=['jpg','jpeg','png','webp','gif','heic'].includes(ext);box.hidden=false;box.innerHTML=`<div class="bloodwork-preview-head"><div><p class="eyebrow">BLOODWORK PREVIEW</p><h4>${safe(full(f||{}))}</h4><small>${safe(name)}</small></div><button type="button" data-close-doc-preview>Close</button></div><div class="bloodwork-preview-frame">${image?`<img src="${safe(x.url)}" alt="Bloodwork document">`:`<iframe src="${safe(x.url)}" title="Bloodwork document"></iframe>`}</div><div class="bloodwork-preview-actions"><button type="button" data-doc-download="${safe(doc.id)}">Download</button>${doc?.review_status==='pending'?`<button type="button" data-doc-approve="${safe(doc.id)}">Approve</button><button type="button" class="danger" data-doc-reject="${safe(doc.id)}">Reject</button>`:''}</div>`;box.scrollIntoView({behavior:'smooth',block:'start'})}}catch(err){alert(err.message)}return}if(e.target.dataset.docDownload){try{const doc=docs.find(x=>String(x.id)===String(e.target.dataset.docDownload));const x=await api('document-url',{id:e.target.dataset.docDownload});const r=await fetch(x.url);if(!r.ok)throw new Error('Could not download file');const blob=await r.blob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=doc?.original_name||'ctc-bloodwork';document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}catch(err){alert(err.message)}return}if(e.target.hasAttribute('data-close-doc-preview')){const box=$('bloodworkPreview');if(box){box.hidden=true;box.innerHTML=''}return}if(e.target.dataset.docDelete){const old=docs.find(x=>String(x.id)===String(e.target.dataset.docDelete));if(old&&confirm('Permanently delete this rejected or expired bloodwork upload?')){try{await api('document-delete',{id:old.id});await loadDocs()}catch(err){alert(err.message)}}return}if(e.target.dataset.docApprove){await api('document-review',{id:e.target.dataset.docApprove,review_status:'approved'});await loadDocs();return}if(e.target.dataset.docReject){await api('document-review',{id:e.target.dataset.docReject,review_status:'rejected'});await loadDocs();return}});
// CTC email broadcasts + application email templates
const ba=$('broadcastAudience'),bs=$('broadcastSubject'),bh=$('broadcastHeadline'),bm=$('broadcastMessage'),bbt=$('broadcastButtonText'),bbu=$('broadcastButtonUrl'),brw=$('broadcastSelectedWrap'),brl=$('broadcastRecipientList'),bpH=$('broadcastPreviewHeadline'),bpM=$('broadcastPreviewMessage'),bStatus=$('broadcastMessageStatus');
let broadcastPeople=[];const broadcastSelectedIds=new Set();
function updateBroadcastSelectedCount(){const el=$('broadcastSelectedCount');if(el)el.textContent=`${broadcastSelectedIds.size} selected`}
function renderBroadcastRecipients(){if(!brl)return;const term=($('broadcastRecipientSearch')?.value||'').trim().toLowerCase();const people=broadcastPeople.filter(x=>x.email).filter(x=>!term||`${full(x)} ${x.email}`.toLowerCase().includes(term));brl.innerHTML=people.map(x=>`<label><input type="checkbox" data-broadcast-fighter value="${safe(x.id)}" ${broadcastSelectedIds.has(String(x.id))?'checked':''}><span><strong>${safe(full(x))}</strong><small>${safe(x.email)}</small></span></label>`).join('')||'<p class="muted">No fighters match that search.</p>';updateBroadcastSelectedCount()}
async function loadBroadcastRecipients(){if(!brl)return;try{broadcastPeople=await api('broadcast-recipients');renderBroadcastRecipients()}catch(e){brl.innerHTML=`<p class="muted">${safe(e.message)}</p>`}}
$('broadcastRecipientSearch')?.addEventListener('input',renderBroadcastRecipients);
brl?.addEventListener('change',e=>{const c=e.target.closest('[data-broadcast-fighter]');if(!c)return;const id=String(c.value);if(c.checked)broadcastSelectedIds.add(id);else broadcastSelectedIds.delete(id);updateBroadcastSelectedCount()});
$('broadcastSelectVisible')?.addEventListener('click',()=>{document.querySelectorAll('#broadcastRecipientList [data-broadcast-fighter]').forEach(c=>broadcastSelectedIds.add(String(c.value)));renderBroadcastRecipients()});
$('broadcastClearSelected')?.addEventListener('click',()=>{broadcastSelectedIds.clear();renderBroadcastRecipients()});
// Email Broadcasts can load the *existing* application, reminder and saved custom templates.
const BROADCAST_TRAVEL_TEMPLATE={
 subject:'CTC Management — Travel Reminder', headline:'Your Upcoming CTC Travel',
 message:'Hello CTC Family,\n\nYour travel for an upcoming CTC fight is approaching. Review your saved itinerary in the Fighter Portal, check in as soon as your carrier allows, and check your departure time, airport or station, terminal and gate for updates.\n\nIf you have any concerns, message CTC Management through your Fighter Portal account.\n\nSafe travels!\nCTC Management',
 buttonText:'VIEW TRAVEL DETAILS', buttonUrl:'https://couchtocage.com/fighter-portal/'
};
const BROADCAST_INSTALL_TEMPLATE={
 subject:'CTC Is Now an App — Add Us to Your Home Screen',headline:'CTC ON YOUR PHONE',
 message:'Hello CTC Family,\n\nYou can now add Couch To Cage to your iPhone or Android home screen. It opens like an app and puts CTC, your Fighter Portal, fights, travel, messages, and requests one tap away. No App Store download required.\n\niPHONE (Safari):\n1. Open https://couchtocage.com in Safari.\n2. Tap the Share button (square with arrow).\n3. Choose Add to Home Screen.\n4. Tap Add.\n\nANDROID (Chrome):\n1. Open https://couchtocage.com in Chrome.\n2. Tap the three-dot menu.\n3. Tap Install app / Add to Home screen and confirm.\n\nThe picture walkthrough is included in this email and at the button below. Internet is required for live fights and private account information.\n\nCTC Management',
 buttonText:'SEE THE PICTURE INSTALL GUIDE',buttonUrl:'https://couchtocage.com/install.html'
};
function broadcastSavedTemplates(){
 try{const data=JSON.parse(localStorage.getItem('ctcCustomEmailTemplates')||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{}}catch{return {}}
}
function refreshBroadcastTemplateOptions(){
 const select=$('broadcastTemplateSelect');if(!select)return;
 const old=select.value;
 for(const opt of [...select.options])if(opt.value.startsWith('saved:'))opt.remove();
 for(const key of Object.keys(broadcastSavedTemplates()).sort())select.add(new Option(key,'saved:'+key));
 if([...select.options].some(opt=>opt.value===old))select.value=old;
}
function templateBroadcastGreeting(value){
 const raw=String(value||'').trim();
 if(!raw)return 'Hello CTC Family,';
 if(/^hello\s+ctc\s+family\b/i.test(raw))return raw;
 const replaced=raw.replace(/^(?:hi|hello|hey|dear)\s+(?:\[[^\]]+\]|[^,\n]+),[ \t]*(?:\r?\n)*/i,'');
 return 'Hello CTC Family,\n\n'+replaced;
}
function useBroadcastTemplate(){
 const selected=$('broadcastTemplateSelect')?.value||'';
 if(!selected)return;
 let t=null;
 if(selected==='approval'||selected==='decline'){
  const prefix=selected==='approval'?'approvalEmail':'declineEmail';
  t={subject:$(prefix+'Subject')?.value||'',headline:$(prefix+'Headline')?.value||'',message:$(prefix+'Message')?.value||'',buttonText:$(prefix+'ButtonText')?.value||'',buttonUrl:$(prefix+'ButtonUrl')?.value||''};
 }else if(selected==='reminder'){
  t={subject:$('ctcReminderSubject')?.value||'',headline:$('ctcReminderHeadline')?.value||'',message:$('ctcReminderMessage')?.value||'',buttonText:$('ctcReminderButtonText')?.value||'',buttonUrl:$('ctcReminderButtonUrl')?.value||''};
 }else if(selected==='travel')t=BROADCAST_TRAVEL_TEMPLATE;else if(selected==='install')t=BROADCAST_INSTALL_TEMPLATE;
 else if(selected.startsWith('saved:'))t=broadcastSavedTemplates()[selected.slice(6)];
 if(!t){if(bStatus)bStatus.textContent='Template not found. Save it again under Email Templates.';return;}
 if(bs)bs.value=t.subject||'';
 if(bh)bh.value=t.headline||'';
 if(bm)bm.value=templateBroadcastGreeting(t.message);
 if(bbt)bbt.value=t.buttonText||'';
 if(bbu)bbu.value=t.buttonUrl||'';
 broadcastPreview();
 if(bStatus){bStatus.textContent='Template loaded. Review and edit it before sending.';bStatus.className='form-message success'}
}
$('broadcastTemplateSelect')?.addEventListener('focus',refreshBroadcastTemplateOptions);
$('broadcastTemplateSelect')?.addEventListener('change',useBroadcastTemplate);
document.addEventListener('click',e=>{if(e.target.closest('#ctcSaveCustomTemplate'))refreshBroadcastTemplateOptions()});
refreshBroadcastTemplateOptions();
const broadcastPortalText=()=>/\b(?:fighter\s+portal|portal\s+(?:login|account|activation)|fighter\s+login|activate\s+(?:(?:your|my|the|a)\s+)?(?:fighter\s+)?account|access\s+fighter\s+portal)\b/i.test([bs?.value,bh?.value,bm?.value].join(' '));
function broadcastPreview(){
 if(bpH)bpH.textContent=(bh?.value||bs?.value||'Your headline');
 if(bpM){bpM.textContent=bm?.value||'Your message will appear here.';if($('broadcastTemplateSelect')?.value==='install'){const preview=document.createElement('div');preview.className='ctc-install-email-preview';preview.innerHTML='<p><strong>Picture walkthrough included in sent email:</strong></p><img src="/assets/app/iphone-2.png" alt="iPhone Safari Share picture" style="width:100%;max-width:320px;height:auto"><img src="/assets/app/android-2.png" alt="Android Chrome menu picture" style="width:100%;max-width:320px;height:auto">';bpM.append(preview)}}
 const preview=$('broadcastPreviewButton'),notice=$('broadcastButtonNotice'),text=bbt?.value.trim()||'',url=bbu?.value.trim()||'',portal=broadcastPortalText();
 const missing=text&&!url||url&&!text;
 const shownText=portal&&!text&&!url?'ACTIVATE FIGHTER ACCOUNT':text;
 const shownUrl=portal&&!text&&!url?'https://couchtocage.com/fighter-portal/?activate=1':url;
 if(preview){preview.hidden=!(shownText&&shownUrl);preview.textContent=shownText&&shownUrl?`${shownText}  →  ${shownUrl}`:'';}
 if(notice){notice.hidden=!(missing||portal&&!text&&!url);notice.textContent=missing?'Button text and button link must BOTH be filled in before sending.':portal&&!text&&!url?'This email mentions the Fighter Portal. The activation button shown in the preview will be included automatically when you send.':'';notice.className='form-message '+(missing?'error':'');}
}
[bs,bh,bm,bbt,bbu].forEach(x=>x?.addEventListener('input',broadcastPreview));
ba?.addEventListener('change',()=>{if(brw)brw.hidden=ba.value!=='selected';if(ba.value==='selected'&&!broadcastPeople.length)loadBroadcastRecipients()});
$('broadcastSaveDraft')?.addEventListener('click',()=>{localStorage.setItem('ctcBroadcastDraft',JSON.stringify({audience:ba?.value,subject:bs?.value,headline:bh?.value,message:bm?.value,buttonText:bbt?.value,buttonUrl:bbu?.value,ids:[...broadcastSelectedIds]}));if(bStatus){bStatus.textContent='Draft saved on this device.';bStatus.className='form-message success'}});
async function broadcastFile(){const f=$('broadcastAttachment')?.files?.[0];if(!f)return null;if(f.size>5*1024*1024)throw Error('Attachment must be 5 MB or less');const content=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Could not read attachment'));r.readAsDataURL(f)});return {name:f.name,type:f.type,base64:content}}
async function sendBroadcast(test=false){const ids=[...broadcastSelectedIds];const body={test,testEmail:'officialcouchtocage@gmail.com',audience:ba?.value||'all',ids,subject:bs?.value,headline:bh?.value,message:bm?.value,buttonText:bbt?.value?.trim()||'',buttonUrl:bbu?.value?.trim()||'',template_type:$('broadcastTemplateSelect')?.value==='install'?'install':'',attachment:await broadcastFile()};if(!body.subject?.trim()||!body.message?.trim())throw new Error('Subject and message are required.');if(Boolean(body.buttonText)!==Boolean(body.buttonUrl))throw new Error('Button text and button link must BOTH be filled in before sending.');if(broadcastPortalText()&&!body.buttonText&&!body.buttonUrl){body.buttonText='ACTIVATE FIGHTER ACCOUNT';body.buttonUrl='https://couchtocage.com/fighter-portal/?activate=1';if(bbt)bbt.value=body.buttonText;if(bbu)bbu.value=body.buttonUrl;broadcastPreview();}if(!test){let label=ba?.selectedOptions?.[0]?.textContent||'fighters';if(body.audience==='selected'){if(!ids.length)throw new Error('Select at least one fighter.');label=`${ids.length} selected fighter${ids.length===1?'':'s'}`;}if(!confirm(`Send this CTC email to ${label}?`))return null}return api('broadcast-send',body)}
$('broadcastTest')?.addEventListener('click',async()=>{try{if(bStatus)bStatus.textContent='Sending test…';const r=await sendBroadcast(true);if(r&&bStatus){bStatus.textContent=`Test sent to officialcouchtocage@gmail.com${r.failed?' (failed — check configuration)':''}.`;bStatus.className='form-message '+(r.failed?'error':'success')}}catch(e){if(bStatus){bStatus.textContent=e.message;bStatus.className='form-message error'}}});
$('broadcastForm')?.addEventListener('submit',async e=>{e.preventDefault();try{if(bStatus)bStatus.textContent='Sending broadcast…';const r=await sendBroadcast(false);if(r&&bStatus){bStatus.textContent=`Sent ${r.sent} of ${r.total}. ${r.failed?`${r.failed} failed.`:'All delivered to Resend.'}`;bStatus.className='form-message '+(r.failed?'error':'success');renderBroadcastFailures(r)}}catch(e){if(bStatus){bStatus.textContent=e.message;bStatus.className='form-message error'}}});
function renderBroadcastFailures(r){const box=$('broadcastFailures');if(!box)return;const failed=(r?.results||[]).filter(x=>!x.ok);if(!failed.length){box.hidden=true;box.innerHTML='';return}box.hidden=false;box.innerHTML=`<strong>${failed.length} FAILED EMAIL${failed.length===1?'':'S'}</strong><ul>${failed.map(x=>`<li><b>${safe(x.to)}</b>${x.error?` — ${safe(x.error)}`:''}</li>`).join('')}</ul><button class="ghost-button" type="button" id="retryFailedBroadcast">RETRY FAILED EMAILS</button>`;const retry=$('retryFailedBroadcast');if(retry)retry.onclick=async()=>{const failedEmails=failed.map(x=>x.to);const people=await api('broadcast-recipients');broadcastSelectedIds.clear();(people||[]).filter(x=>failedEmails.includes(x.email)).forEach(x=>broadcastSelectedIds.add(String(x.id)));if(ba)ba.value='selected';if(brw)brw.hidden=false;await loadBroadcastRecipients();renderBroadcastRecipients();box.hidden=true;box.innerHTML='';if(bStatus)bStatus.textContent='Failed recipients selected. Tap SEND BROADCAST to retry them.'}}
try{const d=JSON.parse(localStorage.getItem('ctcBroadcastDraft')||'null');if(d){if(ba)ba.value=d.audience||'all';if(bs)bs.value=d.subject||'';if(bh)bh.value=d.headline||'';if(bm)bm.value=d.message||'';if(bbt)bbt.value=d.buttonText||'';if(bbu)bbu.value=d.buttonUrl||'';(d.ids||[]).forEach(id=>broadcastSelectedIds.add(String(id)));if(brw)brw.hidden=ba?.value!=='selected';broadcastPreview();updateBroadcastSelectedCount()}}catch{}
broadcastPreview();

const DEFAULT_APPLICATION_EMAIL_TEMPLATES={
 approval:{subject:'Welcome to Couch To Cage',headline:'Welcome to the CTC Roster',message:'Your fighter application has been approved. Welcome to Couch To Cage.\n\nIMPORTANT: When accessing your Fighter Portal, use the SAME EMAIL ADDRESS you used when you applied to Couch To Cage. This is how the portal connects you to your approved fighter profile.\n\nUse the Fighter Portal to keep your profile, weight, bloodwork, and fight information up to date. CTC will also use the portal and email to communicate important fighter updates and opportunities.\n\nBleed Blue. Touch Gold.',buttonText:'ACTIVATE FIGHTER ACCOUNT',buttonUrl:'https://couchtocage.com/fighter-portal/?activate=1'},
 decline:{subject:'Couch To Cage Application Update',headline:'Thank You for Applying to CTC',message:'Thank you for your interest in Couch To Cage and for taking the time to submit your fighter application.\n\nAt this time, we are not adding your application to the CTC fighter roster. We appreciate your interest and wish you the best with your training and upcoming opportunities.\n\nBleed Blue. Touch Gold.',buttonText:'',buttonUrl:''}
};
function loadApplicationEmailTemplates(){let t=DEFAULT_APPLICATION_EMAIL_TEMPLATES;try{t={...DEFAULT_APPLICATION_EMAIL_TEMPLATES,...JSON.parse(localStorage.getItem('ctcApplicationEmailTemplates')||'{}')}}catch{};for(const type of ['approval','decline']){const v={...DEFAULT_APPLICATION_EMAIL_TEMPLATES[type],...(t[type]||{})};const pre=type==='approval'?'approvalEmail':'declineEmail';const map={Subject:'subject',Headline:'headline',Message:'message',ButtonText:'buttonText',ButtonUrl:'buttonUrl'};for(const [suffix,key] of Object.entries(map)){const el=$(pre+suffix);if(el)el.value=v[key]||''}}}
function getApplicationEmailTemplate(type){const pre=type==='approval'?'approvalEmail':'declineEmail';return {subject:$(pre+'Subject')?.value||'',headline:$(pre+'Headline')?.value||'',message:$(pre+'Message')?.value||'',buttonText:$(pre+'ButtonText')?.value||'',buttonUrl:$(pre+'ButtonUrl')?.value||''}}
function saveApplicationEmailTemplates(){const t={approval:getApplicationEmailTemplate('approval'),decline:getApplicationEmailTemplate('decline')};localStorage.setItem('ctcApplicationEmailTemplates',JSON.stringify(t));return t}
$('saveApplicationEmailTemplates')?.addEventListener('click',()=>{saveApplicationEmailTemplates();const el=$('applicationEmailTemplateStatus');if(el){el.textContent='Application email templates saved on this device.';el.className='form-message success'}});
async function testApplicationEmail(type){const el=$('applicationEmailTemplateStatus');try{saveApplicationEmailTemplates();if(el)el.textContent=`Sending ${type} test…`;const r=await api('application-email-test',{type,template:getApplicationEmailTemplate(type),testEmail:'officialcouchtocage@gmail.com'});if(el){el.textContent=r.sent?`${type==='approval'?'Approval':'Decline'} test sent to officialcouchtocage@gmail.com.`:(r.error||'Email test failed.');el.className='form-message '+(r.sent?'success':'error')}}catch(e){if(el){el.textContent=e.message;el.className='form-message error'}}}
$('approvalEmailTest')?.addEventListener('click',()=>testApplicationEmail('approval'));
$('declineEmailTest')?.addEventListener('click',()=>testApplicationEmail('decline'));
loadApplicationEmailTemplates();

// Supabase application actions + automatic Resend emails. Capture phase overrides legacy browser-only handlers.
document.addEventListener('click',async e=>{const b=e.target.closest('[data-approve-application]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(!confirm('Approve this fighter and send the CTC welcome email?'))return;try{const r=await api('approve-application',{id:b.dataset.approveApplication,emailTemplate:getApplicationEmailTemplate('approval')});const row=b.closest('[data-application-id]');if(row)row.remove();const count=document.querySelectorAll('#applicationList [data-application-id]').length;const countEl=$('applicationCount');if(countEl)countEl.textContent=count;const list=$('applicationList');if(list&&!count)list.innerHTML='<p class="muted">No new roster applications.</p>';await loadRoster();alert(r?.email?.sent?'Fighter approved and welcome email sent.':`Fighter approved, but email failed to send${r?.email?.error?`: ${r.email.error}`:'.'}`)}catch(x){alert(x.message)}},true);
document.addEventListener('click',async e=>{const b=e.target.closest('[data-decline-application]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const row=b.closest('[data-application-id]');const name=row?.querySelector('strong')?.textContent?.trim()||'this fighter';if(!confirm(`Decline ${name} and send the decline email? The application will stay in Supabase history.`))return;try{const r=await api('decline-application',{id:b.dataset.declineApplication,emailTemplate:getApplicationEmailTemplate('decline')});if(row)row.remove();const count=document.querySelectorAll('#applicationList [data-application-id]').length;const countEl=$('applicationCount');if(countEl)countEl.textContent=count;const list=$('applicationList');if(list&&!count)list.innerHTML='<p class="muted">No new roster applications.</p>';alert(r?.email?.sent?'Application declined and email sent.':`Application declined, but email failed to send${r?.email?.error?`: ${r.email.error}`:'.'}`)}catch(x){alert(x.message)}},true);

const appCountEl=$('applicationCount'),appBadge=$('applicationNavBadge');if(appCountEl&&appBadge){const syncAppBadge=()=>{const n=parseInt(appCountEl.textContent||'0',10)||0;appBadge.textContent=n?String(n):''};new MutationObserver(syncAppBadge).observe(appCountEl,{childList:true,characterData:true,subtree:true});syncAppBadge()}

$('ctcPortalFilter')?.addEventListener('change',renderRoster);$('fighterStatusFilter')?.addEventListener('change',renderRoster);$('fighterBloodworkFilter')?.addEventListener('change',renderRoster);

document.addEventListener('ctc-open-fighter-profile',e=>{const f=roster.find(x=>x.id===e.detail?.id);if(f)viewFighter(f)});

// Profile request buttons use a document-level capture handler so mobile taps cannot be swallowed by dialog/nav listeners.
document.addEventListener('click',async e=>{const b=e.target.closest('.ctc-profile-dialog [data-request]');if(!b)return;e.preventDefault();e.stopPropagation();const f=roster.find(x=>String(x.id)===String(b.dataset.fighter));if(!f)return;const type=b.dataset.request;if(!['weight','bloodwork'].includes(type))return;const requestName=type==='weight'?'weight update':'bloodwork';if(!confirm(`Send a ${requestName} request to ${full(f)}?`))return;const d=b.closest('.ctc-profile-dialog'),status=d?.querySelector('.form-message'),original=b.textContent;b.disabled=true;b.textContent='Sending…';if(status){status.textContent=`Sending ${requestName} request…`;status.classList.remove('error')}try{const result=await api('request-create',{fighter_id:f.id,request_type:type});b.textContent=result?.reopened?'Request Re-sent ✓':result?.already_pending?'Already Requested':'Request Sent ✓';if(status)status.textContent=result?.reopened?`${requestName} request re-opened for ${full(f)}. It will appear in their notifications again.`:result?.already_pending?`${full(f)} already has a pending ${requestName} request.`:`${requestName==='bloodwork'?'Bloodwork':'Weight update'} request sent to ${full(f)}.`;const box=d?.querySelector('#ctcProfileRequests');if(box){try{const all=await api('requests');const rows=all.filter(x=>String(x.fighter_id)===String(f.id));box.innerHTML=rows.map(r=>`<div class="ctc-request-row"><strong>${r.request_type==='weight'?'Weight update':'Bloodwork'}</strong><span>${safe(r.status)} · ${new Date(r.created_at).toLocaleDateString()}${r.completed_at?' · Completed '+new Date(r.completed_at).toLocaleDateString():''}</span></div>`).join('')||'<p class="muted">No requests yet.</p>'}catch{box.innerHTML='<p class="muted">Request sent. History will refresh when this profile is reopened.</p>'}const section=box.closest('details');if(section)section.open=true}await loadAdminNotifications().catch(err=>console.warn('CTC notifications refresh:',err));setTimeout(()=>{if(b.isConnected)b.textContent=original},2200)}catch(err){console.error('CTC request send failed:',err);if(status){status.textContent=`Could not send request: ${err.message||'Unknown error'}`;status.classList.add('error')}alert(`Could not send ${requestName} request: ${err.message||'Unknown error'}`);b.textContent=original}finally{b.disabled=false}},true);

// Cross-section fighter profile navigation: roster, messages, portal accounts and bloodwork.
document.addEventListener('click',async e=>{
 const view=e.target.closest('[data-r-view],[data-ctc-account-profile]');
 if(view){e.preventDefault();const id=view.dataset.rView||view.dataset.ctcAccountProfile;const f=roster.find(x=>String(x.id)===String(id));if(f)viewFighter(f);return}
 const req=e.target.closest('[data-blood-request]');if(!req)return;
 e.preventDefault();const f=roster.find(x=>String(x.id)===String(req.dataset.bloodRequest));if(!f)return;
 if(!confirm(`Request bloodwork from ${full(f)}?`))return;
 req.disabled=true;const original=req.textContent;req.textContent='Requesting…';
 try{await api('request-create',{fighter_id:f.id,request_type:'bloodwork'});req.textContent='Request sent';await loadAdminNotifications().catch(()=>{});}
 catch(err){req.textContent=original;alert('Could not send request. Check database setup and try again.');req.disabled=false}
});

// Request Center: shared persisted requests with per-manager persisted dismissal.
let ctcNotificationCache=[];
let ctcDismissedRequests=new Set();
function ctcRenderNotifications(){
 const box=$('ctcAdminNotifications');if(!box)return;
 const term=($('ctcNotificationSearch')?.value||'').trim().toLowerCase();
 const items=ctcNotificationCache.filter(x=>!ctcDismissedRequests.has(String(x.id)+':'+String(x.status))).filter(x=>{
  const f=roster.find(f=>String(f.id)===String(x.fighter_id));return !term||`${full(f||{})} ${f?.email||''}`.toLowerCase().includes(term);
 });
 const badge=$('ctcNotificationBadge');if(badge)badge.textContent=items.length?String(Math.min(99,items.length)):'';
 box.innerHTML=items.map(x=>{
  const f=roster.find(f=>String(f.id)===String(x.fighter_id)),completed=x.status==='completed';
  const title=x.request_type==='weight'?'Weigh-in':'Bloodwork';
  const bloodDoc=x.request_type==='bloodwork'?docs.filter(d=>String(d.fighter_id)===String(x.fighter_id)&&d.document_type==='bloodwork').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]:null;
  return `<article class="ctc-notification-fighter" data-notification-row="${safe(x.id)}"><div class="ctc-notification-item"><div><strong>${safe(full(f||{})||'CTC fighter')} · ${title} submitted</strong><p>Ready to review</p><small>${safe(new Date(x.completed_at||x.created_at).toLocaleString())}</small></div><div class="ctc-notification-actions"><button type="button" class="gold-button" data-request-open="${safe(x.id)}">OPEN ${title.toUpperCase()}</button>${bloodDoc?`<button type="button" class="ghost-button" data-doc-download="${safe(bloodDoc.id)}">DOWNLOAD BLOODWORK</button>`:''}<button type="button" class="ghost-button" data-request-dismiss="${safe(x.id)}">CLEAR</button></div></div></article>`;
 }).join('')||'<div class="ctc-notification-empty"><strong>All caught up.</strong><span>Only completed fighter submissions appear here.</span></div>';
}
async function loadAdminNotifications(){
 const box=$('ctcAdminNotifications');if(!box)return;
 try{const [requests,dismissals]=await Promise.all([api('requests'),api('notification-dismissed')]);
  ctcDismissedRequests=new Set((dismissals||[]).map(x=>String(x.request_id)+':'+String(x.stage)));
  ctcNotificationCache=(requests||[]).filter(x=>x.status==='completed'&&(x.request_type==='weight'||x.request_type==='bloodwork')).sort((a,b)=>new Date(b.completed_at||b.created_at)-new Date(a.completed_at||a.created_at));
  ctcRenderNotifications();
 }catch(err){box.innerHTML=`<p class="form-message error">Could not load request notifications: ${safe(err.message)}</p>`;}
}
document.addEventListener('click',async e=>{
 const open=e.target.closest('[data-request-open]');if(open){
  const request=ctcNotificationCache.find(x=>String(x.id)===open.dataset.requestOpen);if(!request)return;
  const f=roster.find(x=>String(x.id)===String(request.fighter_id));if(!f){alert('This fighter is no longer on the roster.');return}
  if(request.request_type==='bloodwork'){
   document.querySelector('#adminTabs button[data-tab="bloodwork"]')?.click();
   $('bloodworkSearch').value=full(f);renderDocs();
   $('bloodworkList')?.scrollIntoView({block:'start',behavior:'smooth'});
   const doc=docs.filter(x=>String(x.fighter_id)===String(f.id)&&x.document_type==='bloodwork').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
   if(doc&&request.status==='completed'&&doc.review_status==='pending')document.querySelector(`[data-doc-view="${doc.id}"]`)?.click();
  }else{viewFighter(f);const d=document.querySelector('.ctc-profile-dialog:last-of-type');const sec=d?.querySelector('#ctcAdminWeightHistory')?.closest('details');if(sec){sec.open=true;sec.scrollIntoView({block:'center',behavior:'smooth'})}}
  return;
 }
 const dismiss=e.target.closest('[data-request-dismiss]');if(dismiss){dismiss.disabled=true;try{const notice=ctcNotificationCache.find(x=>String(x.id)===String(dismiss.dataset.requestDismiss));if(!notice)throw new Error('Notification no longer exists');await api('notification-dismiss',{request_id:notice.id,stage:notice.status});ctcDismissedRequests.add(String(notice.id)+':'+String(notice.status));ctcRenderNotifications()}catch(err){dismiss.disabled=false;alert('Could not clear notification: '+err.message)}return}
 const clearAll=e.target.closest('#ctcNotificationClearAll');if(clearAll){
  const pending=ctcNotificationCache.filter(n=>!ctcDismissedRequests.has(String(n.id)+':completed'));
  if(!pending.length)return;
  if(!confirm(`Clear ${pending.length} Admin notification(s)? Fighter submissions stay saved.`))return;
  clearAll.disabled=true;
  try{await api('notification-clear-all',{request_ids:pending.map(n=>n.id)});
   pending.forEach(n=>ctcDismissedRequests.add(String(n.id)+':completed'));ctcRenderNotifications();
  }catch(err){alert('Could not clear notifications: '+err.message)}finally{clearAll.disabled=false}
  return;
 }
 const tab=e.target.closest('[data-tab="notifications"]');if(tab)setTimeout(loadAdminNotifications,0);
});
$('ctcNotificationSearch')?.addEventListener('input',ctcRenderNotifications);
setInterval(()=>{if(!$('dashboard')?.hidden)loadAdminNotifications().catch(()=>{})},30000);


import "./ctc-travel-admin.js";
