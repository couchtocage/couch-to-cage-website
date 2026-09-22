import { supabase, SUPABASE_URL } from './supabase-admin.js';
import { loadWalkinArt, applyWalkinArt } from './ctc-walkin-art.js?v=20260920-card-preview-activation-1';
const $=id=>document.getElementById(id); const q=s=>document.querySelector(s); const qa=s=>[...document.querySelectorAll(s)];
let events=[],gallery=[],settings={},editing={type:null,item:null};let gallerySelectMode=false;let selectedGalleryIds=new Set();
let fighters=[],partners=[],applications=[],teamApplications=[],sponsorInquiries=[];
const defaults={home_eyebrow:'FIGHT OPPORTUNITIES',home_line1:'GET OFF THE COUCH',home_line2:'INTO THE CAGE',home_description:'Join the Couch To Cage roster and get connected with MMA, Muay Thai, kickboxing, and BJJ / grappling opportunities.',fighter_count:'30+',homepage_announcement:'',contact_email:'Officialcouchtocage@gmail.com',instagram_url:'https://www.instagram.com/couchtocage_/',tiktok_url:'https://www.tiktok.com/@couchtocage',twitch_url:'https://m.twitch.tv/couchtocage/home',contact_intro:'Whether you are a fighter, coach, gym, promotion, or potential partner, connect with Couch To Cage.'};
const defaultFights=[['Combat Night','2026-08-08','Kissimmee','FL','Osceola Heritage Park','confirmed'],['Flex Fighting Series','2026-09-12','New York','NY','Melrose Ballroom','matching'],['Flex Fighting Series','2026-09-24','New York','NY','Madison Square Garden','matching'],['TBD','2026-10-24','Location','TBD','Location TBD','planning']].map((x,i)=>({promotion:x[0],event_date:x[1],city:x[2],state:x[3],venue:x[4],status:x[5],sort_order:i+1,is_published:true}));
const defaultGallery=Array.from({length:14},(_,i)=>({image_url:`assets/gallery/ctc-family-${String(i+1).padStart(2,'0')}.webp`,caption:'',alt_text:`CTC Family photo ${i+1}`,sort_order:i+1,is_published:true,is_featured:i===0}));
const defaultMap=[{name:'Las Vegas',x:264,y:579},{name:'Seattle',x:132,y:102},{name:'Los Angeles',x:142,y:648},{name:'Dallas',x:774,y:735},{name:'Chicago',x:986,y:399},{name:'Atlanta',x:1143,y:661},{name:'Miami',x:1316,y:901},{name:'New York',x:1349,y:381}];
const defaultPromotions=[{name:'Flex Fight Series',logo_url:'assets/partners/flex-fight-series.webp',sort_order:1},{name:'Combat Night',logo_url:'assets/partners/combat-night.webp',sort_order:2},{name:'Tuff-N-Uff',logo_url:'assets/partners/tuff-n-uff.webp',sort_order:3}];
function msg(el,t='',type=''){el.textContent=t;el.className=`form-message ${type}`.trim()} function safe(v=''){return String(v).replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
const withTimeout=(promise,ms=15000,label='Request timed out')=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms))]);
let booting=false;
let signingOut=false;
// Only clear this site's Supabase auth token. Preserve roster data, preferences and templates.
function clearAdminAuthStorage(){
 try{
  const prefix='ctc-admin-auth-v1';
  for(const storage of [localStorage,sessionStorage]){
   for(let i=storage.length-1;i>=0;i--){
    const k=storage.key(i);
    if(k&&(k===prefix||k.startsWith(prefix+'-')))storage.removeItem(k);
   }
  }
 }catch(error){console.warn('CTC auth storage cleanup:',error)}
}
function isInvalidAdminSession(error){
 const info=String(error?.message||error||'');
 return error?.status===401||error?.status===403||/session_not_found|invalid session|session.*(expired|not found)|invalid refresh token|jwt.*(expired|invalid)/i.test(info);
}
async function signOutAndShowLogin(message='Signed out. Sign in to continue.',reload=true){
 if(signingOut)return;
 signingOut=true;
 try{
  // Local scope does not need the invalid server-side session to revoke it.
  const result=await withTimeout(supabase.auth.signOut({scope:'local'}),5000,'Local sign out timed out');
  if(result?.error)console.warn('CTC sign out:',result.error);
 }catch(error){console.warn('CTC sign out fallback:',error)}
 finally{
  clearAdminAuthStorage();
  showLogin(message,message==='Signed out. Sign in to continue.'?'success':'error');
  if(reload)location.replace(location.pathname+'?ctc_signed_out=1');
 }
}
// Browser reload is deliberate: no in-flight dashboard request may restore the old screen.
const signedOutLanding=new URLSearchParams(location.search).has('ctc_signed_out');
if(signedOutLanding){signingOut=true;clearAdminAuthStorage();history.replaceState(null,'',location.pathname)}
// Admin artwork appears on the actual authenticated dashboard transition.
let adminWalkinPlayed=false;
let adminWalkinTimers=[];
function showAdminWalkin(){
  if(adminWalkinPlayed)return;
  const el=$('adminWalkin');if(!el)return;
  adminWalkinPlayed=true;
  adminWalkinTimers.forEach(clearTimeout);adminWalkinTimers=[];
  el.classList.remove('ctc-hide');el.hidden=false;
  el.style.setProperty('display','block','important');
  el.style.setProperty('visibility','visible','important');
  el.style.setProperty('opacity','1','important');
  adminWalkinTimers.push(setTimeout(()=>{
    el.classList.add('ctc-hide');
    el.style.removeProperty('opacity');
    el.style.removeProperty('visibility');
  },2600));
  adminWalkinTimers.push(setTimeout(()=>{
    el.hidden=true;el.classList.remove('ctc-hide');
    el.style.removeProperty('display');
  },4100));
}
function isRecoveryUrl(){return location.hash.includes('type=recovery')||location.search.includes('type=recovery')}
let inRecovery=isRecoveryUrl();
async function adminOK(user){if(!user)return false;const {data,error}=await withTimeout(supabase.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle(),12000,'Admin verification timed out. Check your connection and try again.');if(error)throw error;return !!data}
function showLogin(message='',type=''){$('loginPanel').hidden=false;$('dashboard').hidden=true;$('signOutButton').hidden=true;$('loginIntro').hidden=false;$('loginForm').hidden=false;$('authFooter').hidden=false;$('recoveryBox').hidden=true;if(message)msg($('loginMessage'),message,type)}
function showRecovery(message=''){$('loginPanel').hidden=false;$('dashboard').hidden=true;$('signOutButton').hidden=true;$('loginIntro').hidden=true;$('loginForm').hidden=true;$('authFooter').hidden=true;$('recoveryBox').hidden=false;if(message)msg($('recoveryMessage'),message)}
async function showDashboard(session){const ok=await adminOK(session?.user);if(signingOut)return;if(!ok){await signOutAndShowLogin('This account is not authorized for the CTC Control Center.',false);return}$('loginPanel').hidden=true;$('dashboard').hidden=false;$('signOutButton').hidden=false;try{await withTimeout(loadWalkinArt(),4500,'Artwork request timed out')}catch(error){console.warn(error.message);applyWalkinArt('')}showAdminWalkin();const emailEl=$('adminEmail');if(emailEl)emailEl.textContent=session.user.email;const homeTab=document.querySelector('#adminTabs button[data-tab="overview"]');if(homeTab)homeTab.click();localStorage.setItem('ctcAdminActiveTab','overview');['fighterRosterCount','readyFighterCount','applicationCount','bloodworkCount','matchupDashboardCount'].forEach(id=>{const el=$(id);if(el)el.textContent='—'});try{await seedExisting()}catch(err){console.warn('Nonfatal CTC seed issue:',err.message)}try{await loadAll()}catch(err){console.warn('Nonfatal Admin panel data issue:',err.message)}finally{document.dispatchEvent(new CustomEvent('ctc-admin-ready'))}}
async function start(sessionOverride){
 if(booting||signingOut)return;
 booting=true;
 try{
  let session=sessionOverride;
  if(!session){
   const result=await withTimeout(supabase.auth.getSession(),12000,'Session check timed out. Refresh and try again.');
   if(result.error)throw result.error;
   session=result.data.session;
  }
  if(signingOut)return;
  if(!session){showLogin();return}
  // getSession can return a cached JWT that Supabase has already invalidated.
  // Validate it against Auth before showing Admin or allowing a fighter-card import.
  const verified=await withTimeout(supabase.auth.getUser(),12000,'Admin session verification timed out.');
  if(verified.error)throw verified.error;
  if(!verified.data?.user||verified.data.user.id!==session.user?.id){
   await signOutAndShowLogin('Your Admin session expired. Please sign in again.',false);
   return;
  }
  if(signingOut)return;
  await showDashboard({...session,user:verified.data.user});
 }catch(error){
  console.error('CTC admin startup error:',error);
  if(isInvalidAdminSession(error))await signOutAndShowLogin('Your Admin session expired. Please sign in again.',false);
  else if(!signingOut)showLogin(error.message||'Could not connect to the admin service.','error');
 }finally{booting=false}
}
$('loginForm').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button[type=submit],button:not([type])');button.disabled=true;msg($('loginMessage'),'Signing in…');try{signingOut=false;const result=await withTimeout(supabase.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value}),15000,'Sign-in timed out. Check your connection and try again.');if(result.error)throw result.error;await start(result.data.session);msg($('loginMessage'),'')}catch(error){console.error('CTC sign-in error:',error);msg($('loginMessage'),error.message||'Sign-in failed.','error')}finally{button.disabled=false}};$('signOutButton').onclick=async()=>{await signOutAndShowLogin()};
$('toggleLoginPassword').onclick=()=>{const inp=$('loginPassword'),btn=$('toggleLoginPassword'),nowShow=inp.type==='password';inp.type=nowShow?'text':'password';btn.querySelector('.ctc-eye-on').hidden=nowShow;btn.querySelector('.ctc-eye-off').hidden=!nowShow;btn.setAttribute('aria-pressed',String(nowShow))};
$('forgotPasswordLink').onclick=async()=>{const email=$('loginEmail').value.trim();if(!email)return msg($('loginMessage'),'Enter your admin email above, then tap Forgot password?','error');const btn=$('forgotPasswordLink');btn.disabled=true;msg($('loginMessage'),'Sending password reset email…');try{const {error}=await withTimeout(supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}),15000,'Request timed out.');if(error)throw error;msg($('loginMessage'),'Password reset email sent. Check your inbox.','success')}catch(error){msg($('loginMessage'),error.message||'Could not send reset email.','error')}finally{btn.disabled=false}};
$('recoveryForm').onsubmit=async e=>{e.preventDefault();const a=$('newPassword').value,b=$('confirmPassword').value;if(a!==b)return msg($('recoveryMessage'),'Passwords do not match.','error');if(a.length<8)return msg($('recoveryMessage'),'Use at least 8 characters.','error');const btn=e.currentTarget.querySelector('button');btn.disabled=true;msg($('recoveryMessage'),'Updating password…');try{const {error}=await withTimeout(supabase.auth.updateUser({password:a}),15000,'Request timed out.');if(error)throw error;msg($('recoveryMessage'),'Password changed. You can now sign in.','success');await supabase.auth.signOut();inRecovery=false;history.replaceState(null,'',location.pathname);$('newPassword').value='';$('confirmPassword').value='';setTimeout(()=>showLogin('Password updated — sign in with your new password.','success'),900)}catch(error){msg($('recoveryMessage'),error.message||'Could not update password.','error')}finally{btn.disabled=false}};
$('recoveryBackToSignIn').onclick=async()=>{inRecovery=false;try{await supabase.auth.signOut()}catch(e){}history.replaceState(null,'',location.pathname);showLogin()};
qa('#adminTabs button[data-tab]').forEach(b=>b.onclick=()=>{qa('#adminTabs button[data-tab]').forEach(x=>x.classList.toggle('active',x===b));qa('.tab-panel').forEach(p=>p.classList.toggle('active',p.dataset.panel===b.dataset.tab));localStorage.setItem('ctcAdminActiveTab',b.dataset.tab);history.replaceState(null,'',`#${b.dataset.tab}`);const m=$('adminMoreMenu');if(m)m.hidden=true;const mb=$('adminMoreButton');if(mb)mb.setAttribute('aria-expanded','false')});const more=$('adminMoreButton'),moreMenu=$('adminMoreMenu');if(more&&moreMenu){more.onclick=e=>{e.stopPropagation();moreMenu.hidden=!moreMenu.hidden;more.setAttribute('aria-expanded',String(!moreMenu.hidden))};document.addEventListener('click',e=>{if(!moreMenu.hidden&&!moreMenu.contains(e.target)&&e.target!==more){moreMenu.hidden=true;more.setAttribute('aria-expanded','false')}})}
async function getSettings(){const {data,error}=await supabase.from('site_settings').select('*');if(error)return {};return Object.fromEntries((data||[]).map(r=>[r.setting_key,r.setting_value]))}
async function setSetting(k,v){const {error}=await supabase.from('site_settings').upsert({setting_key:k,setting_value:typeof v==='string'?v:JSON.stringify(v),updated_at:new Date().toISOString()},{onConflict:'setting_key'});if(error)throw error}
async function seedExisting(){
 const {count}=await supabase.from('events').select('*',{count:'exact',head:true}); if(count===0) await supabase.from('events').insert(defaultFights);
 const {count:gcount,error:gerr}=await supabase.from('gallery_items').select('*',{count:'exact',head:true}); if(!gerr&&gcount===0) await supabase.from('gallery_items').insert(defaultGallery);
 const s=await getSettings(); for(const [k,v] of Object.entries(defaults)) if(s[k]==null) await setSetting(k,v); if(!s.map_locations) await setSetting('map_locations',defaultMap); if(!s.promotions) await setSetting('promotions',defaultPromotions);
}
async function loadAll(){try{loadPrivateData()}catch(err){console.warn('Private data load:',err)}const results=await Promise.allSettled([loadEvents(),loadGallery(),loadSettings(),loadApplications(),loadTeamApplications(),loadSponsorInquiries()]);results.forEach((r,i)=>{if(r.status==='rejected')console.warn('Admin panel '+i+' load:',r.reason)});renderPartners()}
async function loadEvents(){const {data,error}=await supabase.from('events').select('*').order('event_date').order('sort_order');if(error)return msg($('eventsMessage'),error.message,'error');events=(data||[]).filter(e=>!String(e.notes||'').includes('CTC_MATCHUP_ID:'));$('totalEvents').textContent=events.length;$('eventList').innerHTML=events.filter(e=>!e.event_date||String(e.event_date)>=new Date().toISOString().slice(0,10)).map(e=>`<article class="admin-row" data-id="${e.id}"><div><strong>${safe(e.promotion)}</strong><span>${safe(e.event_date)} · ${safe(e.city)}, ${safe(e.state)} · ${safe(e.venue||'')}</span><small>${e.is_published?'Published':'Draft'} · ${safe(e.status)}</small></div><div><button data-edit="fight">Edit</button><button data-ctc-archive="${e.id}">ARCHIVE</button><button class="danger" data-delete="fight">Delete</button></div></article>`).join('')||'<p class="muted">No upcoming fights yet.</p>';const past=$('ctcPastEventList');if(past)past.innerHTML=events.filter(e=>e.event_date&&String(e.event_date)<new Date().toISOString().slice(0,10)).map(e=>`<article class="admin-row" data-id="${e.id}"><div><strong>${safe(e.promotion)}</strong><span>${safe(e.event_date)} · ${safe(e.city)}, ${safe(e.state)} · ${safe(e.venue||'')}</span><small>${safe(e.status)} · ${e.is_published?'Published':'Archived'} · history retained</small></div><div><button data-edit="fight">VIEW / EDIT</button><button data-ctc-archive="${e.id}">ARCHIVE</button><button class="danger" data-delete="fight">DELETE IF EMPTY</button></div></article>`).join('')||'<p class="muted">No past events yet.</p>'}

async function loadSettings(){
  const {data,error}=await supabase.from('site_settings').select('*');
  if(error){console.error('Could not load site settings:',error);return}
  settings={};
  (data||[]).forEach(row=>{
    const key=row.setting_key ?? row.key ?? row.name;
    const value=row.setting_value ?? row.value ?? row.content ?? '';
    if(key)settings[key]=value;
  });
  const put=(id,value)=>{const el=$(id);if(el&&value!==undefined&&value!==null)el.value=value};
  put('homeHeadline',settings.home_headline);
  put('homeSubheadline',settings.home_subheadline);
  put('contactEmail',settings.contact_email);
  put('contactPhone',settings.contact_phone);
  if(typeof renderGalleryVideos==='function')renderGalleryVideos();
}

async function loadGallery(){const {data,error}=await supabase.from('gallery_items').select('*').order('sort_order',{ascending:true}).order('id',{ascending:true});if(error){return msg($('galleryMessage'),error.message,'error')}gallery=data||[];const galleryCountEl=$('galleryCount');if(galleryCountEl)galleryCountEl.textContent=gallery.length;$('galleryList').innerHTML=gallery.map((g,i)=>`<article class="media-card ${gallerySelectMode?'select-mode':''} ${selectedGalleryIds.has(String(g.id))?'selected':''}" data-id="${g.id}"><input class="gallery-select-check" type="checkbox" aria-label="Select photo ${i+1}" ${selectedGalleryIds.has(String(g.id))?'checked':''}><img src="../${safe(g.image_url)}" onerror="this.src='${safe(g.image_url)}'" alt=""><strong>${safe(g.caption||g.alt_text||'Gallery photo')}</strong><small>${g.is_published?'Published':'Hidden'} · Position ${i+1}</small><div class="gallery-drag-hint">Press & hold to move</div><div class="gallery-order-actions"><button type="button" data-move-gallery="up" ${i===0?'disabled':''}>↑ Up</button><button type="button" data-move-gallery="down" ${i===gallery.length-1?'disabled':''}>↓ Down</button></div><div class="gallery-card-actions"><button type="button" data-edit="gallery">Edit</button><button type="button" class="danger" data-delete="gallery">Delete</button></div></article>`).join('')||'<p class="muted">No gallery photos yet.</p>';updateGallerySelectionUI()}
function renderMap(){const a=parsed('map_locations',defaultMap);$('mapList').innerHTML=a.map((m,i)=>`<article class="admin-row" data-index="${i}"><div><strong>${safe(m.name)}</strong><span>X ${m.x} · Y ${m.y}</span></div><div><button data-edit="map">Edit</button><button class="danger" data-delete="map">Delete</button></div></article>`).join('')}
function renderPromotions(){const a=parsed('promotions',defaultPromotions);$('promotionList').innerHTML=a.map((p,i)=>`<article class="media-card" data-index="${i}"><img src="../${safe(p.logo_url)}" onerror="this.src='${safe(p.logo_url)}'"><strong>${safe(p.name)}</strong><small>Order ${p.sort_order||i+1}</small><div><button data-edit="promotion">Edit</button><button class="danger" data-delete="promotion">Delete</button></div></article>`).join('')}
async function loadApplications(){
 try{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error('Admin session required');
  const r=await fetch('/.netlify/functions/ctc-admin-api?action=applications',{headers:{Authorization:`Bearer ${session.access_token}`}});
  const raw=await r.text();let data;try{data=raw?JSON.parse(raw):[]}catch{throw new Error(raw||`Server returned ${r.status}`)}
  if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`);
  applications=Array.isArray(data)?data:[];
  $('applicationCount').textContent=applications.length;
  $('applicationList').innerHTML=applications.map(x=>`<article class="admin-row application-row" data-application-id="${x.id}"><div><strong>${safe((x.first_name||'')+' '+(x.last_name||''))}</strong><span>${safe(x.email||'')} · ${safe(x.phone||'')} · ${safe(x.city||'')}, ${safe(x.state||'')}</span><small>${safe(x.fighter_level||'Level not provided')} · ${safe(Array.isArray(x.disciplines)?x.disciplines.join(', '):(x.disciplines||''))} · ${safe(x.weight_class||'')} · ${new Date(x.created_at).toLocaleDateString()}</small></div><div><button type="button" data-approve-application="${x.id}">Approve</button><button type="button" class="danger" data-decline-application="${x.id}">Decline</button><a href="mailto:${safe(x.email||'')}">Email</a></div></article>`).join('')||'<p class="muted">No new roster applications.</p>';
 }catch(error){$('applicationCount').textContent='—';msg($('applicationsMessage'),error.message,'error')}
}


// --- CTC Smart Roster Import: PDF/image -> preview -> duplicate check -> roster ---
let rosterImportCandidates=[];
function normalizeFighterName(s){return String(s||'').toLowerCase().replace(/[“”"'`]/g,'').replace(/\([^)]*\)/g,' ').replace(/\b(jr|sr|ii|iii|iv)\b\.?/g,'').replace(/[^a-z\s-]/g,' ').replace(/\s+/g,' ').trim()}
function editDistance(a,b){a=normalizeFighterName(a);b=normalizeFighterName(b);const m=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)m[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return m[a.length][b.length]}
function duplicateMatch(name){
 const n=normalizeFighterName(name);if(!n)return null;
 for(const f of fighters){const x=normalizeFighterName(f.name);if(x===n)return {fighter:f,kind:'duplicate'};const parts=n.split(' '),xp=x.split(' ');if(parts.length>=2&&xp.length>=2&&parts[0]===xp[0]&&parts.at(-1)===xp.at(-1))return {fighter:f,kind:'duplicate'};const max=Math.max(n.length,x.length);if(max>=7&&editDistance(n,x)<=Math.max(1,Math.floor(max*.16)))return {fighter:f,kind:'possible'}}
 return null;
}
function cleanRosterLine(line){
 let s=String(line||'').replace(/[•●▪■|]+/g,' ').replace(/^\s*\d+[\.\)\-:]\s*/,'').replace(/\s+/g,' ').trim();
 s=s.replace(/\b(amateur|professional|pro|fighter|record|weight|class|lbs?|kg|confirmed|unconfirmed|ready|pending)\b.*$/i,'').trim();
 s=s.replace(/\s+\d+\s*[-–]\s*\d+.*$/,'').trim();
 return s;
}
function extractLikelyNames(text){
 const blocked=/^(ctc|couch to cage|roster|fighters?|fight list|confirmed|unconfirmed|october|november|december|january|february|march|april|may|june|july|august|september|date|event|promotion|notes?)$/i;
 const seen=new Set(),out=[];
 for(const raw of String(text||'').split(/\n+/)){
   const line=cleanRosterLine(raw);if(!line||blocked.test(line)||line.length<4||line.length>60||/@|https?:|www\.|[{}[\]<>]/i.test(line))continue;
   const words=line.split(/\s+/).filter(Boolean);
   if(words.length<2||words.length>6)continue;
   if(words.some(w=>/^\d+$/.test(w)))continue;
   if(!words.every(w=>/^[A-Za-zÀ-ÖØ-öø-ÿ'’.-]+$/.test(w)))continue;
   const name=words.map(w=>w.split('-').map(p=>p?p[0].toUpperCase()+p.slice(1).toLowerCase():p).join('-')).join(' ');
   const key=normalizeFighterName(name);if(!key||seen.has(key))continue;seen.add(key);out.push(name);
 }
 return out;
}
async function textFromPdf(file){
 if(!window.pdfjsLib)throw new Error('PDF reader did not load. Check your connection and try again.');
 window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let text='';
 for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),content=await page.getTextContent();text+=content.items.map(x=>x.str).join(' ')+'\n'}
 return text;
}
async function textFromImage(file){
 if(!window.Tesseract)throw new Error('Image reader did not load. Check your connection and try again.');
 const result=await window.Tesseract.recognize(file,'eng',{logger:m=>{if(m.status==='recognizing text')$('rosterImportStatus').textContent=`Reading image… ${Math.round((m.progress||0)*100)}%`}});
 return result.data.text||'';
}
function renderRosterPreview(){
 const list=$('rosterPreviewList');$('rosterPreviewWrap').hidden=false;
 rosterImportCandidates=rosterImportCandidates.map(c=>({...c,match:duplicateMatch(c.name)}));
 list.innerHTML=rosterImportCandidates.map((c,i)=>{const match=c.match,blocked=match?.kind==='duplicate';return `<label class="roster-preview-row ${match?'has-match':''}"><input type="checkbox" data-roster-pick="${i}" ${blocked?'':'checked'} ${blocked?'disabled':''}><div><input class="roster-name-edit" data-roster-name="${i}" value="${safe(c.name)}"><small>${blocked?`DUPLICATE — already have ${safe(match.fighter.name)}`:match?.kind==='possible'?`POSSIBLE DUPLICATE — compare with ${safe(match.fighter.name)}`:'NEW FIGHTER'}</small></div></label>`}).join('');
 $('rosterPreviewCount').textContent=`${rosterImportCandidates.length} names found`;
}
async function processRosterFile(file){
 if(!file)return;const status=$('rosterImportStatus');$('rosterPreviewWrap').hidden=true;status.textContent='Reading roster…';
 try{let text='';if(file.type==='application/pdf'||/\.pdf$/i.test(file.name))text=await textFromPdf(file);else if(file.type.startsWith('image/'))text=await textFromImage(file);else throw new Error('Upload a PDF or image.');
 rosterImportCandidates=extractLikelyNames(text).map(name=>({name}));if(!rosterImportCandidates.length)throw new Error('I could not confidently find fighter names in that file. Try a clearer screenshot/photo or a text-based PDF.');
 status.textContent='Review the names below. Nothing has been added yet.';renderRosterPreview()
 }catch(e){status.textContent=e.message||'Could not read roster.'}
}
$('importRosterButton')?.addEventListener('click',()=>{$('rosterImportPanel').hidden=false;$('rosterImportPanel').scrollIntoView({behavior:'smooth',block:'start'})});
$('closeRosterImport')?.addEventListener('click',()=>{$('rosterImportPanel').hidden=true});
$('cancelRosterPreview')?.addEventListener('click',()=>{$('rosterPreviewWrap').hidden=true;$('rosterImportFile').value='';rosterImportCandidates=[]});
$('rosterImportFile')?.addEventListener('change',e=>processRosterFile(e.target.files?.[0]));
$('rosterPreviewList')?.addEventListener('input',e=>{if(!e.target.matches('[data-roster-name]'))return;const i=Number(e.target.dataset.rosterName);rosterImportCandidates[i].name=e.target.value;renderRosterPreview()});
$('addRosterPreview')?.addEventListener('click',()=>{
 const picks=[...document.querySelectorAll('[data-roster-pick]:checked')];let added=0,skipped=0;
 for(const box of picks){const c=rosterImportCandidates[Number(box.dataset.rosterPick)],name=String(c?.name||'').trim();if(!name||duplicateMatch(name)){skipped++;continue}
 fighters.unshift({id:crypto.randomUUID(),name,nickname:'',email:'',phone:'',city:'',state:'',weight_class:'',fighter_level:'',walk_weight:'',discipline:'',record:'',status:'Pending',bloodwork:'Missing',photo_url:'',highlight_url:'',notes:'Imported from roster file.',created_at:new Date().toISOString()});added++;
 }
 savePrivateData();renderFighters();$('rosterImportStatus').textContent=`✓ ${added} fighter${added===1?'':'s'} added${skipped?`; ${skipped} duplicate${skipped===1?'':'s'} skipped`:''}. Total fighters: ${fighters.length}.`;$('rosterPreviewWrap').hidden=true;$('rosterImportFile').value='';
});
document.addEventListener('keydown',e=>{const card=e.target.closest?.('.stat-link[data-go-tab]');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();card.click()}});

const PRIVATE_KEYS={fighters:'ctc_admin_fighters_v2',partners:'ctc_admin_partners_v2'};

async function loadTeamApplications(){const {data,error}=await supabase.from('team_applications').select('*').order('created_at',{ascending:false});if(error){$('teamApplicationCount').textContent='—';return msg($('teamApplicationsMessage'),error.message,'error')}teamApplications=data||[];$('teamApplicationCount').textContent=teamApplications.length;$('teamApplicationList').innerHTML=teamApplications.map(x=>`<article class="admin-row"><div><strong>${safe(x.full_name||'Unnamed applicant')}</strong><span>${safe(x.position||'Position not provided')} · ${safe(x.email||'')} · ${safe(x.phone||'')}</span><small>${safe([x.city,x.state].filter(Boolean).join(', '))} · ${new Date(x.created_at).toLocaleDateString()}</small></div><div><select data-team-status="${x.id}"><option ${x.status==='new'?'selected':''} value="new">New</option><option ${x.status==='reviewing'?'selected':''} value="reviewing">Reviewing</option><option ${x.status==='contacted'?'selected':''} value="contacted">Contacted</option><option ${x.status==='approved'?'selected':''} value="approved">Approved</option><option ${x.status==='declined'?'selected':''} value="declined">Declined</option></select>${x.email?`<a href="mailto:${safe(x.email)}">Email</a>`:''}${x.resume_url?`<a href="${safe(x.resume_url)}" target="_blank">Resume</a>`:''}${x.work_samples_url?`<a href="${safe(x.work_samples_url)}" target="_blank">Work samples</a>`:''}</div></article>`).join('')||'<p class="muted">No team applications yet.</p>'}
async function loadSponsorInquiries(){const {data,error}=await supabase.from('sponsor_inquiries').select('*').order('created_at',{ascending:false});if(error){const sponsorCount=$('sponsorInquiryCount');if(sponsorCount)sponsorCount.textContent='—';return msg($('sponsorInquiriesMessage'),error.message,'error')}sponsorInquiries=data||[];const sponsorCount=$('sponsorInquiryCount');if(sponsorCount)sponsorCount.textContent=sponsorInquiries.length;$('sponsorInquiryList').innerHTML=sponsorInquiries.map(x=>`<article class="admin-row"><div><strong>${safe(x.company_name||'Unnamed company')}</strong><span>${safe(x.contact_name||'No contact')} · ${safe(x.email||'')} · ${safe(x.sponsorship_type||'')}</span><small>${safe(x.budget||'Budget not provided')} · ${new Date(x.created_at).toLocaleDateString()}</small></div><div><select data-sponsor-status="${x.id}"><option ${x.status==='new'?'selected':''} value="new">New</option><option ${x.status==='reviewing'?'selected':''} value="reviewing">Reviewing</option><option ${x.status==='contacted'?'selected':''} value="contacted">Contacted</option><option ${x.status==='approved'?'selected':''} value="approved">Approved</option><option ${x.status==='declined'?'selected':''} value="declined">Declined</option></select>${x.email?`<a href="mailto:${safe(x.email)}">Email</a>`:''}${x.brand_materials_url?`<a href="${safe(x.brand_materials_url)}" target="_blank">Materials</a>`:''}</div></article>`).join('')||'<p class="muted">No sponsor inquiries yet.</p>'}
function loadPrivateData(){try{fighters=JSON.parse(localStorage.getItem(PRIVATE_KEYS.fighters)||'[]');partners=JSON.parse(localStorage.getItem(PRIVATE_KEYS.partners)||'[]')}catch{fighters=[];partners=[]}}
function savePrivateData(){localStorage.setItem(PRIVATE_KEYS.fighters,JSON.stringify(fighters));localStorage.setItem(PRIVATE_KEYS.partners,JSON.stringify(partners))}
function initials(name=''){return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'CTC'}
function updatePrivateStats(){const partnerCount=$('activePartnerCount');if(partnerCount)partnerCount.textContent=partners.filter(x=>x.status==='Active').length}
function renderFighters(){const term=($('fighterSearch')?.value||'').toLowerCase(),status=$('fighterStatusFilter')?.value||'',blood=$('fighterBloodworkFilter')?.value||'',level=$('fighterLevelFilter')?.value||'';const list=fighters.filter(f=>{const hay=[f.name,f.nickname,f.city,f.state,f.weight_class,f.fighter_level,f.discipline,f.record].join(' ').toLowerCase();return (!term||hay.includes(term))&&(!status||f.status===status)&&(!blood||(blood==='complete'?f.bloodwork==='Complete':f.bloodwork!=='Complete'))&&(!level||f.fighter_level===level)});$('fighterList').innerHTML=list.map(f=>`<article class="fighter-card" data-private-id="${f.id}"><div class="fighter-avatar">${f.photo_url?`<img src="${safe(f.photo_url)}" alt="">`:safe(initials(f.name))}</div><div><strong>${safe(f.name||'Unnamed fighter')}</strong>${f.nickname?`<span> “${safe(f.nickname)}”</span>`:''}<div class="fighter-meta"><span class="status-pill ${(f.status||'pending').toLowerCase()}">${safe(f.status||'Pending')}</span><span class="status-pill ${(f.bloodwork||'missing').toLowerCase()}">Bloodwork: ${safe(f.bloodwork||'Missing')}</span></div><small>${safe([f.fighter_level,f.weight_class,f.discipline,f.record,f.city&&f.state?`${f.city}, ${f.state}`:f.city||f.state].filter(Boolean).join(' · ')||'Profile details pending')}</small></div><div class="fighter-actions"><button type="button" data-edit-private="fighter">Edit</button>${f.phone?`<a href="tel:${safe(f.phone)}">Call</a><a href="sms:${safe(f.phone)}">Text</a>`:''}${f.email?`<a href="mailto:${safe(f.email)}">Email</a>`:''}<button type="button" class="danger" data-delete-private="fighter">Delete</button></div></article>`).join('')||'<div class="empty-state">No fighters match these filters. Add your first fighter or approve an application.</div>';updatePrivateStats()}
function renderPartners(){const term=($('partnerSearch')?.value||'').toLowerCase(),status=$('partnerStatusFilter')?.value||'';const list=partners.filter(p=>(!term||[p.business,p.contact,p.support,p.email].join(' ').toLowerCase().includes(term))&&(!status||p.status===status));$('partnerList').innerHTML=list.map(p=>`<article class="admin-row" data-private-id="${p.id}"><div><strong>${safe(p.business||'Unnamed partner')}</strong><span>${safe(p.contact||'No contact yet')} ${p.email?'· '+safe(p.email):''} ${p.phone?'· '+safe(p.phone):''}</span><small><span class="status-pill ${(p.status||'prospect').toLowerCase()}">${safe(p.status||'Prospect')}</span> ${p.support?'· '+safe(p.support):''} ${p.follow_up?'· Follow up '+safe(p.follow_up):''}</small></div><div><button type="button" data-edit-private="partner">Edit</button><button type="button" class="danger" data-delete-private="partner">Delete</button></div></article>`).join('')||'<div class="empty-state">No partner leads yet. Add businesses here without changing the public website.</div>';updatePrivateStats()}
['partnerSearch','partnerStatusFilter'].forEach(id=>$(id)?.addEventListener('input',renderPartners));
document.addEventListener('click',e=>{const go=e.target.closest('[data-go-tab]');if(go){const tab=q(`#adminTabs button[data-tab="${go.dataset.goTab}"]`);tab?.click();return}const approve=e.target.closest('[data-approve-application]');if(approve){const a=applications.find(x=>String(x.id)===String(approve.dataset.approveApplication));if(!a)return;const fighter={id:crypto.randomUUID(),name:[a.first_name,a.last_name].filter(Boolean).join(' '),email:a.email||'',phone:a.phone||'',city:a.city||'',state:a.state||'',weight_class:a.weight_class||'',fighter_level:a.fighter_level||'',walk_weight:a.walk_around_weight||a.walk_weight||'',discipline:Array.isArray(a.disciplines)?a.disciplines.join(', '):(a.disciplines||''),record:a.amateur_record||a.record||'',status:'Pending',bloodwork:a.bloodwork_status?.toLowerCase().includes('yes')?'Complete':'Missing',photo_url:a.headshot_url||a.headshot||'',highlight_url:a.highlight_link||a.highlight_url||'',notes:'Approved from roster application.',created_at:new Date().toISOString()};fighters.unshift(fighter);savePrivateData();renderFighters();msg($('applicationsMessage'),`${fighter.name||'Fighter'} added to the private roster.`,'success');return}const edit=e.target.closest('[data-edit-private]'),del=e.target.closest('[data-delete-private]');if(!edit&&!del)return;const card=e.target.closest('[data-private-id]');const type=(edit||del).dataset.editPrivate||(edit||del).dataset.deletePrivate;const list=type==='fighter'?fighters:partners;const item=list.find(x=>x.id===card.dataset.privateId);if(edit)return openEditor(type,item);if(confirm(`Delete this ${type}?`)){const next=list.filter(x=>x.id!==item.id);if(type==='fighter')fighters=next;else partners=next;savePrivateData();type==='fighter'?renderFighters():renderPartners()}});

$('homepageForm').onsubmit=async e=>{e.preventDefault();try{await Promise.all([setSetting('home_eyebrow',$('homeEyebrow').value),setSetting('home_line1',$('homeLine1').value),setSetting('home_line2',$('homeLine2').value),setSetting('home_description',$('homeDescription').value),setSetting('fighter_count',$('fighterCount').value),setSetting('homepage_announcement',$('homeAnnouncement').value)]);msg($('homepageMessage'),'Homepage saved.','success')}catch(x){msg($('homepageMessage'),x.message,'error')}};
$('contactForm').onsubmit=async e=>{e.preventDefault();try{await Promise.all([setSetting('contact_email',$('contactEmail').value),setSetting('instagram_url',$('instagramUrl').value),setSetting('tiktok_url',$('tiktokUrl').value),setSetting('twitch_url',$('twitchUrl').value),setSetting('contact_intro',$('contactIntro').value)]);msg($('contactMessage'),'Contact information saved.','success')}catch(x){msg($('contactMessage'),x.message,'error')}};
const fields={fight:[['promotion','Promotion','text'],['event_date','Event date','date'],['city','City','text'],['state','State','text'],['venue','Venue','text'],['discipline','Discipline','text'],['status','Status','select','confirmed,matching,planning,closed'],['sort_order','Sort order','number'],['is_published','Published','checkbox'],['flyer_url','Flyer URL','url'],['notes','Notes','textarea']],gallery:[['file','Upload image','file'],['image_url','Image URL','text'],['caption','Caption','text'],['alt_text','Alt text','text'],['sort_order','Sort order','number'],['is_featured','Featured','checkbox'],['is_published','Published','checkbox']],map:[['name','City / label','text'],['x','X position','number'],['y','Y position','number']],promotion:[['file','Upload logo','file'],['name','Promotion name','text'],['logo_url','Logo URL','text'],['sort_order','Sort order','number']],fighter:[['name','Full name','text'],['nickname','Nickname','text'],['email','Email','email'],['phone','Phone','text'],['city','City','text'],['state','State','text'],['weight_class','Weight class','text'],['fighter_level','Fighter level','select','Amateur,Professional'],['walk_weight','Walk-around weight','text'],['discipline','Discipline','text'],['record','Record','text'],['status','Status','select','Ready,Pending,Inactive'],['bloodwork','Bloodwork','select','Complete,Missing'],['photo_url','Headshot URL','url'],['highlight_url','Highlight video URL','url'],['notes','Private notes','textarea']],partner:[['business','Business name','text'],['contact','Contact person','text'],['email','Email','email'],['phone','Phone','text'],['instagram','Instagram / website','text'],['status','Status','select','Prospect,Contacted,Active,Former'],['support','What they may offer','text'],['follow_up','Follow-up date','date'],['notes','Private notes','textarea']]};
let cropState={image:null,file:null,appliedFile:null,zoom:1,offsetX:0,offsetY:0,aspect:'1.3333333333',dragging:false,lastX:0,lastY:0,pinchDistance:0,pinchZoom:1};
function cropEls(){return {panel:$('cropPanel'),canvas:$('cropCanvas'),stage:$('cropStage'),zoom:$('cropZoom'),aspect:$('cropAspect'),reset:$('resetCropButton'),apply:$('applyCropButton'),help:$('cropHelp')}}
function cropAspectValue(){if(!cropState.image)return 4/3;if(cropState.aspect==='original')return cropState.image.naturalWidth/cropState.image.naturalHeight;return Number(cropState.aspect)||4/3}
function cropViewport(){const aspect=cropAspectValue(),maxW=Math.min(720,Math.max(280,$('cropStage')?.clientWidth||640));let w=maxW,h=w/aspect;if(h>520){h=520;w=h*aspect}return {w:Math.round(w),h:Math.round(h)}}
function clampCrop(){if(!cropState.image)return;const {w,h}=cropViewport(),iw=cropState.image.naturalWidth,ih=cropState.image.naturalHeight,base=Math.max(w/iw,h/ih),scale=base*cropState.zoom,sw=iw*scale,sh=ih*scale;const maxX=Math.max(0,(sw-w)/2),maxY=Math.max(0,(sh-h)/2);cropState.offsetX=Math.max(-maxX,Math.min(maxX,cropState.offsetX));cropState.offsetY=Math.max(-maxY,Math.min(maxY,cropState.offsetY))}
function drawCrop(){const {canvas}=cropEls();if(!canvas||!cropState.image)return;const {w,h}=cropViewport();canvas.width=w;canvas.height=h;clampCrop();const ctx=canvas.getContext('2d');ctx.clearRect(0,0,w,h);const iw=cropState.image.naturalWidth,ih=cropState.image.naturalHeight,base=Math.max(w/iw,h/ih),scale=base*cropState.zoom,sw=iw*scale,sh=ih*scale,x=(w-sw)/2+cropState.offsetX,y=(h-sh)/2+cropState.offsetY;ctx.drawImage(cropState.image,x,y,sw,sh)}
function resetCrop(){cropState.zoom=1;cropState.offsetX=0;cropState.offsetY=0;const e=cropEls();if(e.zoom)e.zoom.value='1';drawCrop()}
function hideCrop(){const e=cropEls();if(e.panel)e.panel.hidden=true;if(cropState.image?.src?.startsWith('blob:'))URL.revokeObjectURL(cropState.image.src);cropState={image:null,file:null,appliedFile:null,zoom:1,offsetX:0,offsetY:0,aspect:'1.3333333333',dragging:false,lastX:0,lastY:0,pinchDistance:0,pinchZoom:1}}
async function prepareCrop(file){const e=cropEls();if(!file?.size){hideCrop();return}if(file.type==='image/gif'){hideCrop();msg($('editorMessage'),'GIF selected. Animated GIFs upload without cropping.','success');return}const img=new Image(),url=URL.createObjectURL(file);await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('This image could not be opened for cropping. Try a JPG, PNG, or WebP.'));img.src=url});cropState.image=img;cropState.file=file;cropState.zoom=1;cropState.offsetX=0;cropState.offsetY=0;cropState.aspect=e.aspect?.value||'1.3333333333';if(e.zoom)e.zoom.value='1';e.panel.hidden=false;drawCrop()}
async function croppedGalleryFile(original){if(cropState.appliedFile&&cropState.file===original)return cropState.appliedFile;if(!cropState.image||cropState.file!==original)return original;drawCrop();const canvas=$('cropCanvas');const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));if(!blob)throw new Error('Could not create the cropped image. Please try again.');const base=(original.name||'gallery-photo').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]/gi,'-');return new File([blob],`${base}-cropped.jpg`,{type:'image/jpeg',lastModified:Date.now()})}
function setupCropControls(){const e=cropEls();if(!e.canvas)return;e.zoom.oninput=()=>{cropState.zoom=Number(e.zoom.value);drawCrop()};e.aspect.onchange=()=>{cropState.aspect=e.aspect.value;resetCrop()};e.reset.onclick=()=>{cropState.appliedFile=null;if(e.help){e.help.textContent='Drag the photo to reposition it, use the slider or pinch to zoom, then tap APPLY CROP.';e.help.classList.remove('crop-applied')}resetCrop()};if(e.apply)e.apply.onclick=async()=>{try{e.apply.disabled=true;e.apply.textContent='APPLYING…';cropState.appliedFile=null;cropState.appliedFile=await croppedGalleryFile(cropState.file);if(e.help){e.help.textContent='✓ Crop applied. Tap SAVE to upload this cropped photo.';e.help.classList.add('crop-applied')}e.apply.textContent='✓ CROP APPLIED'}catch(err){msg($('editorMessage'),err.message,'error');e.apply.textContent='APPLY CROP'}finally{e.apply.disabled=false}};const point=ev=>{const r=e.canvas.getBoundingClientRect(),t=ev.touches?.[0]||ev;return {x:(t.clientX-r.left)*(e.canvas.width/r.width),y:(t.clientY-r.top)*(e.canvas.height/r.height)}};e.canvas.addEventListener('pointerdown',ev=>{if(!cropState.image)return;e.canvas.setPointerCapture?.(ev.pointerId);const p=point(ev);cropState.dragging=true;cropState.lastX=p.x;cropState.lastY=p.y});e.canvas.addEventListener('pointermove',ev=>{if(!cropState.dragging||!cropState.image)return;const p=point(ev);cropState.offsetX+=p.x-cropState.lastX;cropState.offsetY+=p.y-cropState.lastY;cropState.lastX=p.x;cropState.lastY=p.y;drawCrop()});['pointerup','pointercancel','pointerleave'].forEach(n=>e.canvas.addEventListener(n,()=>cropState.dragging=false));e.stage.addEventListener('touchstart',ev=>{if(ev.touches.length===2){const a=ev.touches[0],b=ev.touches[1];cropState.pinchDistance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);cropState.pinchZoom=cropState.zoom}},{passive:true});e.stage.addEventListener('touchmove',ev=>{if(ev.touches.length===2&&cropState.pinchDistance){ev.preventDefault();const a=ev.touches[0],b=ev.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);cropState.zoom=Math.max(1,Math.min(4,cropState.pinchZoom*d/cropState.pinchDistance));e.zoom.value=String(cropState.zoom);drawCrop()}},{passive:false});window.addEventListener('resize',()=>{if(cropState.image)drawCrop()})}
setupCropControls();

let dc={file:null,img:null,ready:null,z:1,x:0,y:0,ratio:4/3,drag:false,lx:0,ly:0,pd:0,pz:1};
const dcm=$('dedicatedCropModal'),dcs=$('dcStage'),dcc=$('dcCanvas'),dcz=$('dcZoom'),dca=$('dcAspect');
function dcp(e){const r=dcs.getBoundingClientRect(),t=e.touches?.[0]||e;return{x:t.clientX-r.left,y:t.clientY-r.top}}
function dcd(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY)}
function dcdraw(){if(!dc.img)return;const w=Math.max(280,dcs.clientWidth),h=w/dc.ratio,D=Math.min(devicePixelRatio||1,2);dcs.style.aspectRatio=dc.ratio;dcc.width=Math.round(w*D);dcc.height=Math.round(h*D);dcc.style.width=w+'px';dcc.style.height=h+'px';const c=dcc.getContext('2d'),b=Math.max(w/dc.img.naturalWidth,h/dc.img.naturalHeight),sc=b*dc.z,dw=dc.img.naturalWidth*sc,dh=dc.img.naturalHeight*sc,mx=Math.max(0,(dw-w)/2),my=Math.max(0,(dh-h)/2);dc.x=Math.max(-mx,Math.min(mx,dc.x));dc.y=Math.max(-my,Math.min(my,dc.y));c.setTransform(D,0,0,D,0,0);c.clearRect(0,0,w,h);c.drawImage(dc.img,(w-dw)/2+dc.x,(h-dh)/2+dc.y,dw,dh)}
async function dcopen(f){const img=new Image(),u=URL.createObjectURL(f);await new Promise((r,j)=>{img.onload=r;img.onerror=()=>j(new Error('Could not open image.'));img.src=u});dc={file:f,img,ready:null,z:1,x:0,y:0,ratio:4/3,drag:false,lx:0,ly:0,pd:0,pz:1};dcz.value=1;dca.value='1.3333333333';dcm.hidden=false;requestAnimationFrame(dcdraw)}
async function dcmake(){const w=parseFloat(dcc.style.width),h=parseFloat(dcc.style.height),b=Math.max(w/dc.img.naturalWidth,h/dc.img.naturalHeight),sc=b*dc.z,sx=(dc.img.naturalWidth-w/sc)/2-dc.x/sc,sy=(dc.img.naturalHeight-h/sc)/2-dc.y/sc,sw=w/sc,sh=h/sc,ow=Math.min(1800,Math.round(sw)),oh=Math.round(ow/dc.ratio),o=document.createElement('canvas');o.width=ow;o.height=oh;o.getContext('2d').drawImage(dc.img,sx,sy,sw,sh,0,0,ow,oh);const blob=await new Promise((r,j)=>o.toBlob(b=>b?r(b):j(new Error('Crop failed.')),'image/jpeg',.9));return new File([blob],dc.file.name.replace(/\.[^.]+$/,'')+'-cropped.jpg',{type:'image/jpeg'})}
document.addEventListener('change',async e=>{if(e.target?.name!=='file'||editing.type!=='gallery')return;const f=e.target.files?.[0];dc.ready=null;if(f)try{await dcopen(f)}catch(err){msg($('editorMessage'),err.message,'error')}},true);
$('dcClose').onclick=()=>{dcm.hidden=true;dc.ready=null};$('dcReset').onclick=()=>{dc.z=1;dc.x=dc.y=0;dcz.value=1;dcdraw()};dcz.oninput=()=>{dc.z=+dcz.value;dcdraw()};dca.onchange=()=>{dc.ratio=+dca.value;dc.x=dc.y=0;dcdraw()};
$('dcApply').onclick=async()=>{const b=$('dcApply');try{b.disabled=true;b.textContent='APPLYING…';dc.ready=await dcmake();dcm.hidden=true;msg($('editorMessage'),'✓ Crop ready. Tap SAVE to upload it.','success')}catch(e){msg($('dcMessage'),e.message,'error')}finally{b.disabled=false;b.textContent='USE THIS CROP'}};
dcs.addEventListener('touchstart',e=>{if(e.touches.length===1){let p=dcp(e);dc.drag=true;dc.lx=p.x;dc.ly=p.y}else if(e.touches.length===2){dc.drag=false;dc.pd=dcd(e.touches);dc.pz=dc.z}},{passive:true});
dcs.addEventListener('touchmove',e=>{e.preventDefault();if(e.touches.length===1&&dc.drag){let p=dcp(e);dc.x+=p.x-dc.lx;dc.y+=p.y-dc.ly;dc.lx=p.x;dc.ly=p.y;dcdraw()}else if(e.touches.length===2&&dc.pd){dc.z=Math.max(1,Math.min(4,dc.pz*dcd(e.touches)/dc.pd));dcz.value=dc.z;dcdraw()}},{passive:false});dcs.addEventListener('touchend',()=>{dc.drag=false;dc.pd=0},{passive:true});

const fightPromotionPresets=[
 {label:'Flex Fight Series',value:'Flex Fight Series'},
 {label:'Combat Night',value:'Combat Night'},
 {label:'Tuff-N-Uff',value:'Tuff-N-Uff'}
];
function fightPresetFor(name){const n=String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');return n.includes('flexfight')?'Flex Fight Series':n.includes('combatnight')?'Combat Night':n.includes('tuffnuff')?'Tuff-N-Uff':''}
// Promotion presets store monthly event labels inside existing event.notes; no database migration.
const ctcEventLine=(notes,key)=>String(notes||'').split(/\r?\n/).find(line=>line.startsWith(key+':'))?.slice(key.length+1).trim()||'';
const ctcEventMetaKeys=['CTC_SERIES_NUMBER','CTC_EVENT_TITLE','CTC_EVENT_TIME'];
function ctcEventNotes(base,values){
 const lines=String(base||'').split(/\r?\n/).filter(line=>!ctcEventMetaKeys.some(key=>line.startsWith(key+':')));
 for(const key of ctcEventMetaKeys){const value=String(values[key]||'').trim().replace(/[\r\n]+/g,' ');if(value)lines.push(`${key}:${value}`)}
 return lines.join('\n').trim()||null;
}
function ctcEventFields(item){
 const flex=fightPresetFor(item?.promotion)==='Flex Fight Series';
 return `<div class="wide ctc-monthly-template"><strong>REUSABLE PROMOTION EVENT TEMPLATE</strong><p class="muted">Select Flex monthly, enter the series number and event name, then choose the real date, time and venue. This updates only this event, never previous cards.</p>
 <label>Series number (Flex)<input name="ctc_series_number" inputmode="numeric" pattern="[0-9]*" placeholder="63" value="${safe(ctcEventLine(item?.notes,'CTC_SERIES_NUMBER'))}"></label>
 <label>Event name / subtitle<input name="ctc_event_title" placeholder="Glow Bash 2" value="${safe(ctcEventLine(item?.notes,'CTC_EVENT_TITLE'))}"></label>
 <label>Event time (with timezone)<input name="ctc_event_time" placeholder="3:00 PM – 11:30 PM EDT" value="${safe(ctcEventLine(item?.notes,'CTC_EVENT_TIME'))}"></label>
 <small>The promotion logo and colors are automatic. Fight Capital remains a fighter's gym, not a promotion preset.</small></div>`;
}
function openEditor(type,item=null){hideCrop();editing={type,item};$('editorTitle').textContent=(item?'Edit ':'Add ')+({fight:'fight',gallery:'photo',map:'location',promotion:'promotion',fighter:'fighter',partner:'partner'}[type]);$('editorKicker').textContent=type.toUpperCase();$('editorFields').innerHTML=(type==='fight'?`<label class="wide ctc-event-preset">Promotion template<select id="ctcFightPreset" aria-label="Promotion template"><option value="">Other / custom promotion</option>${fightPromotionPresets.map(p=>`<option value="${p.value}" ${fightPresetFor(item?.promotion)===p.value?'selected':''}>${p.label}</option>`).join('')}</select><small>Select Flex, Combat Night or Tuff-N-Uff to autofill the promotion and use that promotion's public fight-card style. Choose Other to enter any promotion yourself.</small></label>${ctcEventFields(item)}`:'')+fields[type].map(f=>{const [k,l,t,opts]=f;const val=item?.[k]??'';if(t==='textarea')return `<label class="wide">${l}<textarea name="${k}">${safe(val)}</textarea></label>`;if(t==='select')return `<label>${l}<select name="${k}">${opts.split(',').map(o=>`<option ${val===o?'selected':''}>${o}</option>`).join('')}</select></label>`;if(t==='checkbox')return `<label class="check-label"><input name="${k}" type="checkbox" ${item?val!==false:'checked'}> ${l}</label>`;return `<label class="${k==='image_url'||k==='logo_url'?'wide':''}">${l}<input name="${k}" type="${t}" value="${safe(val)}" ${k==='promotion'||k==='event_date'||k==='city'||k==='state'||k==='name'?'required':''}></label>`}).join('');if(type==='fight'){$('ctcFightPreset')?.addEventListener('change',e=>{const field=$('editorFields').querySelector('[name=promotion]');if(field){field.value=e.target.value;field.focus()}});$('editorFields').querySelector('[name=promotion]')?.addEventListener('input',e=>{const preset=$('ctcFightPreset');if(preset)preset.value=fightPresetFor(e.target.value)})}msg($('editorMessage'));$('editorDialog').showModal();if(type==='gallery'){const input=$('editorFields').querySelector('input[name="file"]');if(input)input.addEventListener('change',async()=>{try{await prepareCrop(input.files?.[0])}catch(err){hideCrop();msg($('editorMessage'),err.message,'error')}})}}
$('newEventButton').onclick=()=>openEditor('fight');$('newPartnerButton').onclick=()=>openEditor('partner');$('newGalleryButton').onclick=()=>openEditor('gallery');$('newMapButton').onclick=()=>openEditor('map');$('newPromotionButton').onclick=()=>openEditor('promotion');$('closeDialog').onclick=$('cancelDialog').onclick=()=>$('editorDialog').close();
async function upload(file,folder){
 if(!file)return null;
 const isVideo=folder==='gallery-videos';
 const maxBytes=isVideo?1024*1024*1024:10*1024*1024;
 const imageTypes=['image/jpeg','image/png','image/webp','image/gif'];
 const videoTypes=['video/mp4','video/quicktime','video/webm','video/x-m4v','video/mpeg'];
 const name=(file.name||(isVideo?'video':'image')).toLowerCase();
 if(file.size>maxBytes)throw new Error(isVideo?'That video is over 1 GB. Choose a smaller video and try again.':'That image is over 10 MB. Choose a smaller photo and try again.');
 if(isVideo){
   if(!(file.type.startsWith('video/')||videoTypes.includes(file.type)||/\.(mov|mp4|m4v|webm|mpeg|mpg)$/i.test(name)))throw new Error('Unsupported video type. Upload an MP4, MOV, M4V, WebM, or MPEG video.');
 }else{
   if(!imageTypes.includes(file.type)){
     if(file.type==='image/heic'||file.type==='image/heif'||/\.hei[cf]$/i.test(name))throw new Error('This iPhone photo is HEIC/HEIF. In Photos, share/export it as JPEG first, then upload the JPEG.');
     throw new Error('Unsupported image type. Please upload a JPG, PNG, WebP, or GIF.');
   }
 }
 const clean=name.replace(/[^a-z0-9._-]+/g,'-');
 const path=`${folder}/${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}-${clean}`;
 const ctcMime = isVideo && /\.mov$/i.test(name) ? 'video/quicktime' : isVideo && /\.(mp4|m4v)$/i.test(name) ? 'video/mp4' : file.type; const {error}=await supabase.storage.from('ctc-media').upload(path,file,{cacheControl:'3600',upsert:false,contentType:ctcMime||undefined});
 if(error){if(isVideo&&/mime type|video\/quicktime/i.test(String(error.message||'')))throw new Error('Your iPhone MOV is supported by the site, but the CTC media bucket blocks video/quicktime. Run CTC-GALLERY-IPHONE-MOV-SETUP.sql once in Supabase, then retry.');throw error;}
 const {data}=supabase.storage.from('ctc-media').getPublicUrl(path);
 return data.publicUrl;
}
$('editorForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,saveButton=form.querySelector('button[type="submit"]'),fd=new FormData(form),type=editing.type,item=editing.item||{};const originalLabel=saveButton?.textContent||'SAVE';if(saveButton){saveButton.disabled=true;saveButton.textContent=(type==='gallery'||type==='promotion')?'UPLOADING…':'SAVING…'}msg($('editorMessage'),type==='gallery'?'Uploading photo…':'Saving…');try{if(type==='fight'){const p={};fields.fight.forEach(([k,,t])=>p[k]=t==='checkbox'?fd.get(k)==='on':t==='number'?Number(fd.get(k)||0):(fd.get(k)||null));p.notes=ctcEventNotes(p.notes,{CTC_SERIES_NUMBER:fd.get('ctc_series_number'),CTC_EVENT_TITLE:fd.get('ctc_event_title'),CTC_EVENT_TIME:fd.get('ctc_event_time')});const q=item.id?supabase.from('events').update(p).eq('id',item.id):supabase.from('events').insert(p);const {error}=await q;if(error)throw error;await loadEvents();document.dispatchEvent(new Event('ctc-upcoming-fights-updated'))}else if(type==='gallery'){let url=fd.get('image_url');let f=fd.get('file');if(f?.size){if(!dc.ready)throw new Error('Crop the photo and tap USE THIS CROP before saving.');f=dc.ready;msg($('editorMessage'),'Uploading cropped photo…');url=await upload(f,'gallery');}if(saveButton)saveButton.textContent='SAVING…';const p={image_url:url,caption:fd.get('caption')||null,alt_text:fd.get('alt_text')||null,sort_order:Number(fd.get('sort_order')||0),is_featured:fd.get('is_featured')==='on',is_published:fd.get('is_published')==='on'};if(!p.image_url)throw new Error('Choose an image from your device or enter an image URL.');let result;if(item.id){result=await supabase.from('gallery_items').update(p).eq('id',item.id).select('id').maybeSingle();if(result.error)throw result.error;if(!result.data)throw new Error('Nothing was saved. Sign out of Admin, sign back in, and try again.')}else{const {data:rows,error:oe}=await supabase.from('gallery_items').select('id,sort_order').order('sort_order',{ascending:false});if(oe)throw oe;for(const row of (rows||[])){const {error:se}=await supabase.from('gallery_items').update({sort_order:Number(row.sort_order||0)+1}).eq('id',row.id);if(se)throw se}p.sort_order=0;result=await supabase.from('gallery_items').insert(p).select('id').single();if(result.error)throw result.error}await loadGallery();msg($('galleryMessage'),'Photo uploaded and published successfully.','success');showAdminToast('✓ Photo uploaded successfully and added to the gallery')}else if(type==='map'){const a=parsed('map_locations',defaultMap),p={name:fd.get('name'),x:Number(fd.get('x')),y:Number(fd.get('y'))};if(item._index!=null)a[item._index]=p;else a.push(p);await setSetting('map_locations',a);settings.map_locations=JSON.stringify(a);renderMap()}else if(type==='fighter'){const p=Object.fromEntries(fields.fighter.map(([k])=>[k,fd.get(k)||'']));p.id=item.id||crypto.randomUUID();p.created_at=item.created_at||new Date().toISOString();const i=fighters.findIndex(x=>x.id===p.id);if(i>=0)fighters[i]=p;else fighters.unshift(p);savePrivateData();renderFighters();updatePrivateStats()}else if(type==='partner'){const p=Object.fromEntries(fields.partner.map(([k])=>[k,fd.get(k)||'']));p.id=item.id||crypto.randomUUID();p.created_at=item.created_at||new Date().toISOString();const i=partners.findIndex(x=>x.id===p.id);if(i>=0)partners[i]=p;else partners.unshift(p);savePrivateData();renderPartners();updatePrivateStats()}else{let url=fd.get('logo_url');const f=fd.get('file');if(f?.size)url=await upload(f,'promotions');const a=parsed('promotions',defaultPromotions),p={name:fd.get('name'),logo_url:url,sort_order:Number(fd.get('sort_order')||a.length+1)};if(item._index!=null)a[item._index]=p;else a.push(p);await setSetting('promotions',a);settings.promotions=JSON.stringify(a);renderPromotions()}msg($('editorMessage'),type==='gallery'?'Photo saved successfully.':'Saved.','success');setTimeout(()=>$('editorDialog').close(),500)}catch(x){console.error('CTC Admin save failed:',x);msg($('editorMessage'),x?.message||'Save failed. Please try again.','error')}finally{if(saveButton){saveButton.disabled=false;saveButton.textContent=originalLabel}}};
function showAdminToast(text){let t=document.getElementById('ctcAdminToast');if(!t){t=document.createElement('div');t.id='ctcAdminToast';t.className='ctc-toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=text;t.classList.add('show');clearTimeout(showAdminToast.timer);showAdminToast.timer=setTimeout(()=>t.classList.remove('show'),3200)}
function updateGallerySelectionUI(){const bar=$('bulkGalleryBar'),count=$('gallerySelectedCount'),select=$('selectGalleryButton');if(bar)bar.hidden=!gallerySelectMode;if(count)count.textContent=selectedGalleryIds.size;if(select)select.textContent=gallerySelectMode?'SELECTING…':'SELECT'}
function setGallerySelectMode(on){gallerySelectMode=on;if(!on)selectedGalleryIds.clear();loadGallery()}
$('selectGalleryButton').onclick=()=>setGallerySelectMode(!gallerySelectMode);$('cancelGallerySelect').onclick=()=>setGallerySelectMode(false);
$('deleteSelectedGallery').onclick=async()=>{if(!selectedGalleryIds.size)return msg($('galleryMessage'),'Select at least one photo first.','error');const n=selectedGalleryIds.size;if(!confirm(`Delete ${n} selected photo${n===1?'':'s'}? This cannot be undone.`))return;const btn=$('deleteSelectedGallery');btn.disabled=true;btn.textContent='DELETING…';try{const ids=[...selectedGalleryIds];const {error}=await supabase.from('gallery_items').delete().in('id',ids);if(error)throw error;selectedGalleryIds.clear();gallerySelectMode=false;await loadGallery();msg($('galleryMessage'),`${n} photo${n===1?'':'s'} deleted.`,'success');showAdminToast(`✓ ${n} gallery photo${n===1?'':'s'} deleted`)}catch(err){msg($('galleryMessage'),err.message||'Could not delete selected photos.','error')}finally{btn.disabled=false;btn.textContent='Delete selected'}};
$('galleryList').addEventListener('click',e=>{if(!gallerySelectMode)return;const card=e.target.closest('.media-card[data-id]');if(!card)return;e.preventDefault();e.stopPropagation();const id=String(card.dataset.id);selectedGalleryIds.has(id)?selectedGalleryIds.delete(id):selectedGalleryIds.add(id);card.classList.toggle('selected',selectedGalleryIds.has(id));const check=card.querySelector('.gallery-select-check');if(check)check.checked=selectedGalleryIds.has(id);updateGallerySelectionUI()});

let gd={card:null,timer:null,active:false,startY:0};
async function saveGalleryDragOrder(){const cards=[...$('galleryList').querySelectorAll('.media-card[data-id]')];for(let i=0;i<cards.length;i++){const {error}=await supabase.from('gallery_items').update({sort_order:i}).eq('id',cards[i].dataset.id);if(error)throw error}msg($('galleryMessage'),'✓ Gallery order saved.','success');await loadGallery()}
function gdBegin(c){if(gallerySelectMode)return;gd.card=c;gd.active=true;c.classList.add('dragging');navigator.vibrate?.(20)}
function gdMove(y){if(!gd.active)return;const others=[...$('galleryList').querySelectorAll('.media-card[data-id]:not(.dragging)')],target=others.find(c=>{const r=c.getBoundingClientRect();return y<r.top+r.height/2});target?$('galleryList').insertBefore(gd.card,target):$('galleryList').appendChild(gd.card)}
async function gdEnd(){clearTimeout(gd.timer);if(!gd.card)return;if(!gd.active){gd.card.classList.remove('drag-ready');gd.card=null;return}gd.active=false;gd.card.classList.remove('dragging','drag-ready');try{msg($('galleryMessage'),'Saving gallery order…');await saveGalleryDragOrder()}catch(e){msg($('galleryMessage'),e.message,'error');await loadGallery()}gd.card=null}
$('galleryList').addEventListener('touchstart',e=>{const c=e.target.closest('.media-card[data-id]');if(!c||e.target.closest('button,input')||gallerySelectMode)return;gd.card=c;gd.startY=e.touches[0].clientY;c.classList.add('drag-ready');gd.timer=setTimeout(()=>gdBegin(c),450)},{passive:true});
$('galleryList').addEventListener('touchmove',e=>{if(!gd.card)return;const y=e.touches[0].clientY;if(!gd.active&&Math.abs(y-gd.startY)>12){clearTimeout(gd.timer);gd.card.classList.remove('drag-ready');gd.card=null;return}if(gd.active){e.preventDefault();gdMove(y)}},{passive:false});$('galleryList').addEventListener('touchend',gdEnd,{passive:true});

async function moveGalleryItem(id,direction){const index=gallery.findIndex(x=>String(x.id)===String(id));const target=direction==='up'?index-1:index+1;if(index<0||target<0||target>=gallery.length)return;const current=gallery[index],other=gallery[target];msg($('galleryMessage'),'Saving new order…');const currentOrder=Number(current.sort_order)||index+1;const otherOrder=Number(other.sort_order)||target+1;const first=await supabase.from('gallery_items').update({sort_order:otherOrder}).eq('id',current.id).select('id').maybeSingle();if(first.error||!first.data){msg($('galleryMessage'),first.error?.message||'Could not move photo.','error');return}const second=await supabase.from('gallery_items').update({sort_order:currentOrder}).eq('id',other.id).select('id').maybeSingle();if(second.error||!second.data){await supabase.from('gallery_items').update({sort_order:currentOrder}).eq('id',current.id);msg($('galleryMessage'),second.error?.message||'Could not finish reordering.','error');return}await loadGallery();msg($('galleryMessage'),'Gallery order saved.','success')}
document.addEventListener('click',async e=>{const move=e.target.closest('[data-move-gallery]');if(move){const card=move.closest('[data-id]');move.disabled=true;await moveGalleryItem(card.dataset.id,move.dataset.moveGallery);return}const b=e.target.closest('[data-edit],[data-delete]');if(!b)return;const type=b.dataset.edit||b.dataset.delete;const card=b.closest('[data-id],[data-index]');let item;if(type==='fight')item=events.find(x=>String(x.id)===card.dataset.id);if(type==='gallery')item=gallery.find(x=>String(x.id)===card.dataset.id);if(type==='map')item={...parsed('map_locations',defaultMap)[Number(card.dataset.index)],_index:Number(card.dataset.index)};if(type==='promotion')item={...parsed('promotions',defaultPromotions)[Number(card.dataset.index)],_index:Number(card.dataset.index)};if(b.dataset.edit)return openEditor(type,item);if(!confirm('Delete this item?'))return;if(type==='fight')await supabase.from('events').delete().eq('id',item.id),await loadEvents();if(type==='gallery')await supabase.from('gallery_items').delete().eq('id',item.id),await loadGallery();if(type==='map'){const a=parsed('map_locations',defaultMap);a.splice(item._index,1);await setSetting('map_locations',a);settings.map_locations=JSON.stringify(a);renderMap()}if(type==='promotion'){const a=parsed('promotions',defaultPromotions);a.splice(item._index,1);await setSetting('promotions',a);settings.promotions=JSON.stringify(a);renderPromotions()}});
document.addEventListener('change',async e=>{if(e.target.matches('[data-team-status]')){const {error}=await supabase.from('team_applications').update({status:e.target.value,updated_at:new Date().toISOString()}).eq('id',e.target.dataset.teamStatus);msg($('teamApplicationsMessage'),error?error.message:'Status saved.',error?'error':'success')}if(e.target.matches('[data-sponsor-status]')){const {error}=await supabase.from('sponsor_inquiries').update({status:e.target.value,updated_at:new Date().toISOString()}).eq('id',e.target.dataset.sponsorStatus);msg($('sponsorInquiriesMessage'),error?error.message:'Status saved.',error?'error':'success')}});
supabase.auth.onAuthStateChange((event,session)=>{
 if(signingOut)return;
 if(event==='PASSWORD_RECOVERY'){inRecovery=true;showRecovery();return}
 if(inRecovery)return;
 if(event==='SIGNED_OUT'){showLogin();return}
 if((event==='SIGNED_IN'||event==='INITIAL_SESSION')&&session&&$('dashboard').hidden&&$('loginPanel').hidden===false){setTimeout(()=>start(session),0)}
});
document.addEventListener('ctc-admin-invalid-session',()=>{
 signOutAndShowLogin('Your Admin session expired. Please sign in again.',true);
});
if(signedOutLanding)showLogin('Signed out. Sign in to continue.','success');
else if(inRecovery)showRecovery();
else start();

// --- CTC Gallery Videos (stored in site_settings: gallery_videos) ---
let galleryVideos=[],editingVideoIndex=null;
function parseGalleryVideos(){try{return JSON.parse(settings.gallery_videos||'[]')}catch{return []}}
function videoThumb(v){if(v.thumbnail)return v.thumbnail;const m=(v.url||'').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/);return m?`https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`:'../assets/ctc-logo-exact.png'}
function renderGalleryVideos(){galleryVideos=parseGalleryVideos();const list=$('videoList');if(!list)return;list.innerHTML=galleryVideos.map((v,i)=>`<article class="media-card video-admin-card" data-video-index="${i}"><img src="${safe(videoThumb(v))}" alt=""><strong>${safe(v.title||'CTC Video')}</strong><small>${safe(v.description||v.url||'')}</small><div class="gallery-card-actions"><button type="button" data-video-move="up" ${i===0?'disabled':''}>↑ Up</button><button type="button" data-video-move="down" ${i===galleryVideos.length-1?'disabled':''}>↓ Down</button><button type="button" data-video-edit>Edit</button><button type="button" class="danger" data-video-delete>Delete</button></div></article>`).join('')||'<p class="muted">No videos yet. Tap + ADD VIDEO.</p>'}
function openVideoEditor(i=null){editingVideoIndex=i;const v=i==null?{}:galleryVideos[i];const f=$('videoForm');f.reset();f.title.value=v.title||'';f.url.value=v.url||'';f.thumbnail.value=v.thumbnail||'';f.description.value=v.description||'';$('videoDialogTitle').textContent=i==null?'Add video':'Edit video';$('videoEditorMessage').textContent='';$('videoDialog').showModal()}
$('adminPhotosTab').onclick=()=>{$('adminPhotosTab').classList.add('active');$('adminVideosTab').classList.remove('active');$('adminPhotosPanel').hidden=false;$('adminVideosPanel').hidden=true};
$('adminVideosTab').onclick=()=>{$('adminVideosTab').classList.add('active');$('adminPhotosTab').classList.remove('active');$('adminPhotosPanel').hidden=true;$('adminVideosPanel').hidden=false;renderGalleryVideos()};
$('newVideoButton').onclick=()=>openVideoEditor();$('closeVideoDialog').onclick=$('cancelVideoDialog').onclick=()=>$('videoDialog').close();

const videoTitleInput=$('videoForm')?.querySelector('input[name="title"]');
if(videoTitleInput){
  videoTitleInput.addEventListener('input',()=>{
    const start=videoTitleInput.selectionStart,end=videoTitleInput.selectionEnd;
    videoTitleInput.value=videoTitleInput.value.toUpperCase();
    try{videoTitleInput.setSelectionRange(start,end)}catch(_){}
  });
}

$('videoForm').onsubmit=async e=>{
  e.preventDefault();
  const form=e.currentTarget,fd=new FormData(form);
  const file=fd.get('video_file');
  const hasFile=file instanceof File&&file.size>0;
  let url=String(fd.get('url')||'').trim();
  const title=String(fd.get('title')||'').trim().toUpperCase();
  const thumbnail=String(fd.get('thumbnail')||'').trim();
  const description=String(fd.get('description')||'').trim();
  const save=form.querySelector('button[type="submit"]');

  // A phone/computer file OR a valid URL is enough. URL is not required when a file is selected.
  if(!hasFile&&!/^https?:\/\//i.test(url)){
    return msg($('videoEditorMessage'),'Choose a video from your phone or enter a full video URL.','error');
  }

  try{
    save.disabled=true;
    if(hasFile){
      
      save.textContent='UPLOADING…';
      msg($('videoEditorMessage'),'Uploading video… Keep this page open.');
      url=await upload(file,'gallery-videos');
    }

    const v={title,url,thumbnail,description},a=parseGalleryVideos();
    editingVideoIndex==null?a.unshift(v):a[editingVideoIndex]=v;
    await setSetting('gallery_videos',a);
    settings.gallery_videos=JSON.stringify(a);
    renderGalleryVideos();
    msg($('videoMessage'),'✓ Video uploaded and added to the Gallery.','success');
    $('videoDialog').close();
  }catch(err){
    msg($('videoEditorMessage'),err.message||'Video upload failed.','error');
  }finally{
    save.textContent='SAVE VIDEO';
    save.disabled=false;
  }
};
$('videoList').addEventListener('click',async e=>{const card=e.target.closest('[data-video-index]');if(!card)return;const i=Number(card.dataset.videoIndex),a=parseGalleryVideos();if(e.target.closest('[data-video-edit]'))return openVideoEditor(i);if(e.target.closest('[data-video-delete]')){if(!confirm('Delete this video from the Gallery?'))return;a.splice(i,1)}else{const b=e.target.closest('[data-video-move]');if(!b)return;const n=b.dataset.videoMove==='up'?i-1:i+1;if(n<0||n>=a.length)return;[a[i],a[n]]=[a[n],a[i]]}try{await setSetting('gallery_videos',a);settings.gallery_videos=JSON.stringify(a);renderGalleryVideos();msg($('videoMessage'),'✓ Video order saved.','success')}catch(err){msg($('videoMessage'),err.message,'error')}});

// CTC Admin-owned artwork; a URL in site_settings syncs the two portal loading screens.
const walkinSave=$('ctcWalkinArtSave'),walkinReset=$('ctcWalkinArtReset'),walkinFile=$('ctcWalkinArtFile'),walkinZoom=$('ctcWalkinArtZoom');
if(walkinSave&&walkinReset&&walkinFile){
 const walkinStatus=(text,type='')=>msg($('ctcWalkinArtMessage'),text,type);
 const previewZoom=()=>{const zoom=Math.max(.6,Math.min(1,Number(walkinZoom?.value||1)));$('ctcWalkinArtZoomValue').textContent=Math.round(zoom*100)+'%';$('ctcWalkinArtPreview').style.transform=`scale(${zoom})`};
 walkinZoom?.addEventListener('input',previewZoom);
 const loadZoom=async()=>{try{const {data}=await supabase.from('site_settings').select('setting_value').eq('setting_key','ctc_login_walkin_art_zoom').maybeSingle();walkinZoom.value=String(Math.max(.6,Math.min(1,Number(data?.setting_value||1))));previewZoom()}catch(e){console.warn('Artwork zoom:',e)}};
 loadZoom();
 walkinFile.addEventListener('change',()=>{const f=walkinFile.files?.[0];if(!f)return;const preview=$('ctcWalkinArtPreview');
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)||f.size>10*1024*1024){walkinStatus('Choose a JPG, PNG, WebP or GIF under 10 MB.','error');walkinFile.value='';return}
  if(preview.dataset.ctcObjectUrl)URL.revokeObjectURL(preview.dataset.ctcObjectUrl);preview.dataset.ctcObjectUrl=URL.createObjectURL(f);preview.src=preview.dataset.ctcObjectUrl;walkinStatus('Preview only — tap SAVE NEW ARTWORK to publish.');
 });
 const cleanPreview=()=>{const preview=$('ctcWalkinArtPreview');if(preview.dataset.ctcObjectUrl){URL.revokeObjectURL(preview.dataset.ctcObjectUrl);delete preview.dataset.ctcObjectUrl}};
 walkinSave.addEventListener('click',async()=>{const file=walkinFile.files?.[0];if(!file)return walkinStatus('Choose an image first.','error');walkinSave.disabled=true;walkinReset.disabled=true;walkinStatus('Uploading artwork…');try{
  const url=await upload(file,'login-walkin');await setSetting('ctc_login_walkin_art_url',url);settings.ctc_login_walkin_art_url=url;await setSetting('ctc_login_walkin_art_zoom',String(walkinZoom.value));cleanPreview();applyWalkinArt(url,Number(walkinZoom.value));walkinFile.value='';walkinStatus('Saved. Admin and Fighter Portal will show the new walk-in artwork at their next login.','success');
 }catch(e){walkinStatus(e.message||'Could not save artwork.','error')}finally{walkinSave.disabled=false;walkinReset.disabled=false}});
 walkinReset.addEventListener('click',async()=>{walkinSave.disabled=true;walkinReset.disabled=true;walkinStatus('Restoring original CTC artwork…');try{await setSetting('ctc_login_walkin_art_url','');settings.ctc_login_walkin_art_url='';await setSetting('ctc_login_walkin_art_zoom','1');walkinZoom.value='1';previewZoom();cleanPreview();applyWalkinArt('',1);walkinFile.value='';walkinStatus('Original CTC artwork restored.','success')}catch(e){walkinStatus(e.message||'Could not reset artwork.','error')}finally{walkinSave.disabled=false;walkinReset.disabled=false}});
}
