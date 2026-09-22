import { randomInt } from 'node:crypto';
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const env=()=>({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY});
async function rest(path,{method='GET',body,headers={}}={}){const {url,key}=env();if(!url||!key)throw new Error('Missing Supabase server environment variables');const r=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});const t=await r.text();if(!r.ok)throw new Error(t||`Supabase ${r.status}`);return t?JSON.parse(t):null}
async function authAdmin(path,{method='POST',body}={}){
 const {url,key}=env();
 if(!url||!key)throw new Error('Missing Supabase server environment variables');
 const r=await fetch(`${url}/auth/v1/admin/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch{j={message:t}}
 if(!r.ok)throw new Error(j.msg||j.message||j.error_description||j.error||`Supabase Auth ${r.status}`);
 return j;
}
async function signedTravelUrl(path){const {url,key}=env();const r=await fetch(`${url}/storage/v1/object/sign/ctc-travel/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600})});const j=await r.json().catch(()=>({}));if(!r.ok||!j.signedURL)throw new Error(j.message||'Could not open itinerary');return `${url}/storage/v1${j.signedURL}`;}
async function requireAdmin(req){const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)throw new Error('Not signed in');const {url,key}=env();const r=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});if(!r.ok){const body=await r.text().catch(()=>'');throw new Error(`Invalid session (Supabase ${r.status}: ${body||'empty response'})`)}const user=await r.json();const rows=await rest(`admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`);if(!rows?.length)throw new Error('Admin access required');return user}
export default async(req)=>{try{const adminUser=await requireAdmin(req);
async function activateRosterFighter(id,{password_mode='generate',temporary_password=''}={}){
 if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid fighter');
 const fighter=(await rest(`fighters?id=eq.${encodeURIComponent(id)}&select=id,first_name,last_name,email,auth_user_id,status,portal_status`))?.[0];
 if(!fighter)throw new Error('Fighter not found');
 const email=String(fighter.email||'').trim().toLowerCase();
 if(!email)throw new Error('Fighter has no roster email');
 if(fighter.auth_user_id)return {ok:true,already_active:true,user_id:fighter.auth_user_id,email};
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
 if(!['generate','manual'].includes(password_mode))throw new Error('Choose how to set the temporary password');
 if(password_mode==='manual'&&(temporary_password.length<12||temporary_password.length>128||!/[A-Za-z]/.test(temporary_password)||!/\d/.test(temporary_password)))throw new Error('Manual temporary password must contain 12–128 characters with letters and a number');
 let password=password_mode==='manual'?temporary_password:'';
 if(password_mode==='generate')for(let i=0;i<24;i++)password+=alphabet[randomInt(alphabet.length)];
 let user;
 try{
   user=await authAdmin('users',{body:{email,password,email_confirm:true,user_metadata:{ctc_role:'fighter',fighter_id:id,ctc_password_change_required:true}}});
 }catch(e){
   const msg=String(e.message||'');
   if(/already|registered|exists/i.test(msg)){
     throw new Error('An auth account already exists for this email. Have the fighter use Forgot Password, or link the existing account before activating.');
   }
   throw e;
 }
 const userId=user?.id||user?.user?.id;
 if(!userId)throw new Error('Supabase did not return the new user ID');
 const rows=await rest(`fighters?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{auth_user_id:userId,portal_status:'active',status:fighter.status==='inactive'?'active':fighter.status},headers:{Prefer:'return=representation'}});
 
 let activationEmail={sent:false};
 try{
  const mail=await sendEmail({to:email,subject:'Your CTC Fighter Portal Account Is Active',headline:'Your Fighter Account Is Ready',message:`Hello CTC Family,

CTC Management activated your Fighter Portal account for you.

LOGIN EMAIL
${email}

TEMPORARY PASSWORD
${password}

HOW TO SIGN IN
1. Tap the Fighter Portal button below.
2. Enter the login email and temporary password shown above.
3. Sign in to your Fighter Portal.
4. Set your own private password when prompted on first sign-in.
5. Review your profile, weight, bloodwork, and fight information and make sure everything is current.

Keep this login information private. Do not forward this email or share your password.

Bleed Blue. Touch Gold.
CTC Management`,buttonText:'OPEN FIGHTER PORTAL',buttonUrl:'https://couchtocage.com/fighter-portal/'});
  activationEmail={sent:true,id:mail.id};
 }catch(e){activationEmail={sent:false,error:e.message}}
 return {ok:true,user_id:userId,fighter:rows?.[0]||null,email,activation_email:activationEmail};
}
const u=new URL(req.url),action=u.searchParams.get('action')||'';if(req.method==='GET'){
 if(action==='message-threads'){
  const fighters=await rest('fighters?select=id,first_name,last_name,email,auth_user_id,status,portal_status&order=first_name.asc');
  let messages=[],attachmentsReady=true;
  try{messages=await rest('ctc_messages?select=id,fighter_id,sender_role,body,attachment_name,attachment_path,attachment_type,read_at,created_at&order=created_at.desc')}
  catch(error){
   if(/42703|attachment_(?:name|path|type).*does not exist/i.test(String(error.message||error))){
    attachmentsReady=false;
    messages=await rest('ctc_messages?select=id,fighter_id,sender_role,body,read_at,created_at&order=created_at.desc');
   }else throw error;
  }
  return json(200,{fighters,messages,attachments_ready:attachmentsReady});
 }
 if(action==='message-thread'){return json(200,await rest(`ctc_messages?fighter_id=eq.${encodeURIComponent(u.searchParams.get('fighter_id')||'')}&select=*&order=created_at.asc`))}
 if(action==='fighters')return json(200,await rest('fighters?select=*&order=first_name.asc,last_name.asc'));
 if(action==='matchups'){const [rows,events]=await Promise.all([rest('fighter_matchups?select=*&order=fight_date.asc'),rest('events?select=id,notes,is_published')]);const marker=id=>`CTC_MATCHUP_ID:${id}`;return json(200,(rows||[]).map(m=>{const ev=(events||[]).find(x=>String(x.notes||'').includes(marker(m.id)));return {...m,is_public:!!ev?.is_published,public_event_id:ev?.id||null}}));}
 if(action==='upcoming-events'){const rows=await rest('events?select=id,promotion,event_date,city,state,venue,discipline,status,notes,is_published&order=event_date.asc');const today=new Date().toISOString().slice(0,10);return json(200,(rows||[]).filter(e=>!String(e.notes||'').includes('CTC_MATCHUP_ID:')).filter(e=>!e.event_date||String(e.event_date)>=today).filter(e=>!['cancelled','closed','completed'].includes(String(e.status||'').toLowerCase())));}
 if(action==='documents')return json(200,await rest('fighter_documents?select=*&order=created_at.desc'));
 if(action==='requests')return json(200,await rest('ctc_fighter_requests?select=*&order=created_at.desc'));
 if(action==='weight-history'){const id=u.searchParams.get('fighter_id')||'';return json(200,await rest(`fighter_weight_history?fighter_id=eq.${encodeURIComponent(id)}&select=*&order=recorded_at.desc`));}
 if(action==='notification-dismissed'){return json(200,await rest(`ctc_admin_notification_dismissals?admin_user_id=eq.${encodeURIComponent(adminUser.id)}&select=request_id,stage`));}
 if(action==='travel'){const id=u.searchParams.get('matchup_id')||'';if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid matchup');return json(200,(await rest(`ctc_fighter_travel?matchup_id=eq.${encodeURIComponent(id)}&select=*`))?.[0]||null)}
 if(action==='notifications'){const [weights,documents,requests,messages]=await Promise.all([rest('fighter_weight_history?select=*&order=recorded_at.desc&limit=100'),rest('fighter_documents?select=*&order=created_at.desc&limit=100'),rest('ctc_fighter_requests?select=*&order=created_at.desc&limit=100'),rest('ctc_messages?sender_role=eq.fighter&select=*&order=created_at.desc&limit=100')]);return json(200,{weights,documents,requests,messages});}
 if(action==='broadcast-recipients')return json(200,await rest('fighters?select=id,first_name,last_name,email,status,ready_to_fight&status=neq.inactive&order=first_name.asc,last_name.asc'));
 if(action==='broadcast-history')return json(200,[]);
 if(action==='applications'){
  const [apps,fighters]=await Promise.all([
   rest('applications?select=*&order=created_at.desc'),
   rest('fighters?select=first_name,last_name,email,status')
  ]);
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
  const rosterEmails=new Set((fighters||[]).filter(f=>f.status!=='inactive').map(f=>norm(f.email)).filter(Boolean));
  const rosterNames=new Set((fighters||[]).filter(f=>f.status!=='inactive').map(f=>norm(`${f.first_name||''} ${f.last_name||''}`)).filter(Boolean));
  const activeStatuses=new Set(['','new','pending','submitted','review','reviewing']);
  const pending=(apps||[]).filter(a=>{
   const email=norm(a.email),name=norm(`${a.first_name||''} ${a.last_name||''}`),status=norm(a.status);
   const alreadyRoster=(email&&rosterEmails.has(email))||(name&&rosterNames.has(name));
   return !alreadyRoster&&activeStatuses.has(status);
  });
  return json(200,pending);
 }
 return json(400,{error:'Unknown action'});
}
const b=await req.json();
if(action==='notification-clear-all'){
 const ids=[...new Set((Array.isArray(b.request_ids)?b.request_ids:[]).map(String))];
 if(ids.length>100||ids.some(id=>!/^[0-9a-f-]{36}$/i.test(id)))throw new Error('Invalid notification IDs');
 if(!ids.length)return json(200,{ok:true,cleared:0});
 const completed=await rest(`ctc_fighter_requests?id=in.(${ids.join(',')})&status=eq.completed&select=id`);
 const entries=completed.map(x=>({admin_user_id:adminUser.id,request_id:x.id,stage:'completed'}));
 if(entries.length)await rest('ctc_admin_notification_dismissals?on_conflict=admin_user_id,request_id,stage',{method:'POST',body:entries,headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
 return json(200,{ok:true,cleared:entries.length});
}
if(action==='notification-dismiss'){
 const id=String(b.request_id||'');if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid request');
 const stage=String(b.stage||'');if(!['pending','completed'].includes(stage))throw new Error('Choose a valid notification status');
 await rest('ctc_admin_notification_dismissals',{method:'POST',body:{admin_user_id:adminUser.id,request_id:id,stage},headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
 return json(200,{ok:true});
}
if(action==='travel-save'){
 const matchId=String(b.matchup_id||'');if(!/^[0-9a-f-]{36}$/i.test(matchId))throw new Error('Choose a saved matchup');
 const match=(await rest(`fighter_matchups?id=eq.${encodeURIComponent(matchId)}&select=id,fighter_id`))?.[0];if(!match)throw new Error('Matchup not found');
 const allowed=['mode','carrier','service_number','booking_reference','depart_from','arrive_at','departure_at','arrival_at','depart_timezone','arrive_timezone','terminal','gate','travel_url','notes'];
 const update={matchup_id:matchId,fighter_id:match.fighter_id};for(const k of allowed)update[k]=String(b[k]??'').trim()||null;
 if(!['flight','bus','train','car','other'].includes(update.mode))throw new Error('Choose travel type');
 if(update.travel_url){let u;try{u=new URL(update.travel_url)}catch{}if(!u||!['https:','http:'].includes(u.protocol))throw new Error('Enter a valid travel link');}
 if(update.departure_at&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(update.departure_at))throw new Error('Invalid departure time');
 if(update.arrival_at&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(update.arrival_at))throw new Error('Invalid arrival time');
 if(!update.depart_timezone&&update.departure_at)throw new Error('Specify the departure location time zone');
 const data=await rest('ctc_fighter_travel?on_conflict=matchup_id',{method:'POST',body:update,headers:{Prefer:'resolution=merge-duplicates,return=representation'}});
 return json(200,data?.[0]||null);
}
if(action==='travel-upload'){
 const mid=String(b.matchup_id||'');if(!/^[0-9a-f-]{36}$/i.test(mid))throw new Error('Invalid matchup');
 const match=(await rest(`fighter_matchups?id=eq.${encodeURIComponent(mid)}&select=id,fighter_id`))?.[0];if(!match)throw new Error('Matchup not found');
 const contentType=String(b.content_type||'');const allowed=['application/pdf','image/jpeg','image/png','image/webp'];if(!allowed.includes(contentType))throw new Error('Upload a PDF, JPG, PNG or WebP itinerary');
 const encoded=String(b.data||'');if(encoded.length>4300000||encoded.length<8||!/^[a-zA-Z0-9+/=]+$/.test(encoded))throw new Error('Itinerary must be under 3 MB');
 const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));if(bytes.length>3000000)throw new Error('Itinerary must be under 3 MB');
 const ext={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[contentType];
 const path=`${match.fighter_id}/${mid}/${crypto.randomUUID()}.${ext}`;const {url,key}=env();
 const upload=await fetch(`${url}/storage/v1/object/ctc-travel/${path}`,{method:'POST',headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':contentType,'x-upsert':'false'},body:bytes});
 if(!upload.ok)throw new Error('Itinerary upload failed: '+(await upload.text()).slice(0,250));
 const row=await rest('ctc_fighter_travel?on_conflict=matchup_id',{method:'POST',body:{matchup_id:mid,fighter_id:match.fighter_id,itinerary_path:path},headers:{Prefer:'resolution=merge-duplicates,return=representation'}});
 return json(200,{ok:true,filename:String(b.filename||'Itinerary').slice(0,180),travel:row?.[0]});
}
if(action==='travel-file'){
 const mid=String(b.matchup_id||'');if(!/^[0-9a-f-]{36}$/i.test(mid))throw new Error('Invalid matchup');
 const row=(await rest(`ctc_fighter_travel?matchup_id=eq.${encodeURIComponent(mid)}&select=itinerary_path`))?.[0];if(!row?.itinerary_path)throw new Error('No itinerary on this fight');
 return json(200,{url:await signedTravelUrl(row.itinerary_path)});
}
// Admin-only permanent message and conversation deletion. Storage files are private and
// deleted by the server after corresponding message records have been removed.
async function deleteMessageFiles(paths){const distinct=[...new Set(paths.filter(Boolean))];if(!distinct.length)return null;const {url,key}=env();const r=await fetch(`${url}/storage/v1/object/ctc-message-attachments`,{method:'DELETE',headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':'application/json'},body:JSON.stringify({prefixes:distinct})});if(!r.ok)return `Message deleted; attachment cleanup needs retry: ${(await r.text()).slice(0,120)}`;return null}
if(action==='message-delete'){const id=String(b.message_id||'');if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid message ID');const rows=await rest(`ctc_messages?id=eq.${encodeURIComponent(id)}&select=id,attachment_path`);if(!rows?.length)throw new Error('Message not found');await rest(`ctc_messages?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});const warning=await deleteMessageFiles(rows.map(x=>x.attachment_path));return json(200,{ok:true,deleted:1,warning});}
if(action==='message-thread-delete'){const fighterId=String(b.fighter_id||'');if(!/^[0-9a-f-]{36}$/i.test(fighterId))throw new Error('Choose a valid fighter');const rows=await rest(`ctc_messages?fighter_id=eq.${encodeURIComponent(fighterId)}&select=id,attachment_path`);await rest(`ctc_messages?fighter_id=eq.${encodeURIComponent(fighterId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});const warning=await deleteMessageFiles((rows||[]).map(x=>x.attachment_path));return json(200,{ok:true,deleted:rows?.length||0,warning});}
if(action==='message-send'){const id=String(b.fighter_id||'');const body=String(b.body||'').trim();if(!id||!body||body.length>5000)throw new Error('Invalid message');const fighter=await rest(`fighters?id=eq.${encodeURIComponent(id)}&select=id`);if(!fighter?.length)throw new Error('Fighter not found');const data=await rest('ctc_messages',{method:'POST',body:{fighter_id:id,sender_role:'admin',body},headers:{Prefer:'return=representation'}});return json(200,data?.[0]||data)}
if(action==='message-read'){await rest(`ctc_messages?fighter_id=eq.${encodeURIComponent(b.fighter_id)}&sender_role=eq.fighter&read_at=is.null`,{method:'PATCH',body:{read_at:new Date().toISOString()},headers:{Prefer:'return=minimal'}});return json(200,{ok:true})}
if(action==='request-create'){const id=String(b.fighter_id||'');const type=b.request_type;if(!/^[0-9a-f-]{36}$/i.test(id)||!['weight','bloodwork'].includes(type))throw new Error('Invalid fighter or request type');const exists=await rest(`fighters?id=eq.${encodeURIComponent(id)}&select=id`);if(!exists.length)throw new Error('Fighter not found');const pending=await rest(`ctc_fighter_requests?fighter_id=eq.${encodeURIComponent(id)}&request_type=eq.${encodeURIComponent(type)}&status=eq.pending&select=*&order=created_at.desc&limit=1`);if(pending?.length){const previous=pending[0];if(previous.dismissed_at){const reopened=await rest(`ctc_fighter_requests?id=eq.${encodeURIComponent(previous.id)}&fighter_id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{dismissed_at:null},headers:{Prefer:'return=representation'}});return json(200,{...(reopened?.[0]||previous),already_pending:true,reopened:true});}return json(200,{...previous,already_pending:true});}const rows=await rest('ctc_fighter_requests',{method:'POST',body:{fighter_id:id,request_type:type},headers:{Prefer:'return=representation'}});return json(200,{...(rows?.[0]||{}),already_pending:false});}
if(action==='weight-flag'){const id=String(b.id||'');const comment=String(b.comment||'').trim();if(!id||!comment)throw new Error('Weight and comment required');const data=await rest(`fighter_weight_history?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:{status:'invalid',admin_comment:comment,updated_at:new Date().toISOString()},headers:{Prefer:'return=representation'}});return json(200,data?.[0]||data)}
if(action==='fighter-activate-account')return json(200,await activateRosterFighter(String(b.id||''),{password_mode:b.password_mode||'generate',temporary_password:String(b.temporary_password||'')}));
if(action==='fighter-save'){const id=b.id;const p={...b};delete p.id;const path=id?`fighters?id=eq.${encodeURIComponent(id)}`:'fighters';const data=await rest(path,{method:id?'PATCH':'POST',body:p,headers:{Prefer:'return=representation'}});return json(200,data?.[0]||data)}
if(action==='fighter-deactivate'){const data=await rest(`fighters?id=eq.${encodeURIComponent(b.id)}`,{method:'PATCH',body:{status:'inactive',portal_status:'disabled'},headers:{Prefer:'return=representation'}});return json(200,data?.[0]||data)}
if(action==='fighter-access'){const data=await rest(`fighters?id=eq.${encodeURIComponent(b.id)}`,{method:'PATCH',body:{portal_status:b.portal_status},headers:{Prefer:'return=representation'}});return json(200,data?.[0]||data)}
// Two dated CTC rosters supplied by management. This only matches existing fighter IDs;
// it never fabricates contact details or links a fight to a guessed account.
if(action==='account-manager-preview'){
 const id=String(b.fighter_id||'');if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Choose an existing roster fighter');
 const f=(await rest(`fighters?id=eq.${encodeURIComponent(id)}&select=id,first_name,last_name,email,auth_user_id,status`))?.[0];if(!f)throw new Error('Fighter not found');
 const state=f.status==='inactive'?'inactive':f.auth_user_id?'already_active':!String(f.email||'').trim()?'missing_email':'ready_to_activate';
 return json(200,{results:[{name:[f.first_name,f.last_name].filter(Boolean).join(' '),state,email:f.email||null,fighter_id:f.id}]});
}
if(action==='card-activate-fighters'){
 const card=String(b.date||'');
 const names={
  '2026-10-24':['Yusif Thomas','Jeremiah Parker Jones','Treve Gielder','Brendan Simpson','Ali Kahzaal'],
  '2026-11-06':['Jonathan Smith','Bryant Franklin','Richie Irving III','Bradley Terwilliger','Jameson Webber','Brian Tracy']
 }[card];
 if(!names)throw new Error('Choose the October 24 or November 6 card');
 const normalize=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[“”"']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const aliases={'jeremiah parker jones':['jeremiah parker jones','jeremiah jones']};
 const fighters=await rest('fighters?select=id,first_name,last_name,email,auth_user_id,status');
 const check=names.map(name=>{
   const variants=aliases[normalize(name)]||[normalize(name)];
   const found=fighters.filter(f=>variants.includes(normalize(`${f.first_name||''} ${f.last_name||''}`)));
   let state=found.length!==1?(found.length?'duplicate_name':'missing_roster'):
    found[0].status==='inactive'?'inactive':found[0].auth_user_id?'already_active':
    !String(found[0].email||'').trim()?'missing_email':'ready_to_activate';
   return {name,state,fighter:found.length===1?found[0]:null};
 });
 if(b.preview)return json(200,{date:card,preview:true,results:check.map(x=>({name:x.name,state:x.state,email:x.fighter?.email||null}))});
 if(b.password_mode==='manual')throw new Error('For confirmed cards use generated unique passwords. Use one fighter at a time for manual passwords.');
 const results=[];
 for(const item of check){
  const r={name:item.name,state:item.state,email:item.fighter?.email||null};
  if(item.state==='ready_to_activate'){
   try{const done=await activateRosterFighter(item.fighter.id,{password_mode:'generate'});
    r.state=done.already_active?'already_active':'activated';r.emailed=!!done.activation_email?.sent;
    if(!r.emailed&&!done.already_active)r.error=done.activation_email?.error||'Login email was not sent';
   }catch(e){r.state='error';r.error=e.message}
  }
  results.push(r);
 }
 return json(200,{date:card,results});
}
if(action==='sync-oct-nov-cards'){
 const plans=[
  {date:'2026-10-24',promotion:'Flex Fight Series',city:'Melville',state:'NY',venue:'Gossip Night Club',eventTitle:'Glow Bash 2',seriesNumber:'63',time:'3:00 PM – 11:30 PM EDT',fighters:['Yusif Thomas','Jeremiah Parker Jones','Treve Gielder','Brendan Simpson','Ali Kahzaal']},
  {date:'2026-11-06',promotion:'Flex Fight Series',city:'New York',state:'NY',venue:'TBA',eventTitle:'',seriesNumber:'64',time:'',fighters:['Jonathan Smith','Bryant Franklin','Richie Irving III','Bradley Terwilliger','Jameson Webber','Brian Tracy']}
 ];
 // A single date loads independently; omitting date retains compatibility with old clients.
 const requestedDate=String(b.date||'').trim();
 if(requestedDate&&!['2026-10-24','2026-11-06'].includes(requestedDate))return json(400,{error:'Choose the October 24 or November 6 fight card.'});
 const selectedPlans=requestedDate?plans.filter(p=>p.date===requestedDate):plans;
 const fightCapitalGym=new Set(['jonathan smith','jameson webber']);
 const championshipFighters=new Set(['bryant franklin','jameson webber','jamison webber']);
 const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[“”"']/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
   // Normal roster workflow: only existing, activated fighters are eligible. Never
  // POST a placeholder or match a new auth account by name. The portal itself
  // connects to an approved roster profile by verified email (link-fighter.mjs).
  const rows=await rest('fighters?select=id,first_name,last_name,nickname,email,auth_user_id,status,gym');
  const rosterIndex=new Map();
  for(const f of rows){
    if(!f.auth_user_id||String(f.status||'').toLowerCase()==='inactive')continue;
    const key=normalize(`${f.first_name||''} ${f.last_name||''}`);
    if(!key)continue;
    if(!rosterIndex.has(key))rosterIndex.set(key,[]);
    rosterIndex.get(key).push(f);
  }
  // Known administrative name variation, never an unrestricted fuzzy match.
  const rosterAliases=new Map([['jeremiah parker jones',['jeremiah parker jones','jeremiah jones']]]);
  const assignments=selectedPlans.flatMap(plan=>plan.fighters.map(name=>{
    const key=normalize(name),keys=rosterAliases.get(key)||[key];
    const people=[...new Map(keys.flatMap(k=>rosterIndex.get(k)||[]).map(f=>[f.id,f])).values()];
    return {plan,name,people};
  }));
  const missing=assignments.filter(x=>!x.people.length).map(x=>x.name);
  const ambiguous=assignments.filter(x=>x.people.length>1).map(x=>x.name);
  const matched=assignments.filter(x=>x.people.length===1);
  const overview={ok:true,preview:!!b.preview,dates:selectedPlans.map(p=>({date:p.date,city:p.city,state:p.state,venue:p.venue,promotion:p.promotion,title:p.eventTitle,seriesNumber:p.seriesNumber,time:p.time,fighters:p.fighters})),matched:matched.map(x=>({name:x.name,date:x.plan.date,activated:true,gym:fightCapitalGym.has(normalize(x.name))?'Fight Capital':x.people[0].gym||''})),missing,ambiguous};
  if(b.preview)return json(200,overview);
const allEvents=await rest('events?select=*');
 const allMatchups=await rest('fighter_matchups?select=*');
 const results=[],errors=[];
 const eventFor={};
 for(const plan of selectedPlans){
   const group=matched.filter(x=>x.plan.date===plan.date);
   if(!group.length)continue;
   const marker=`CTC_ROSTER_CARD:${plan.date}`;
   const existing=(allEvents||[]).filter(e=>!String(e.notes||'').includes('CTC_MATCHUP_ID:')&&
      (String(e.notes||'').includes(marker)||
       (String(e.event_date||'')===plan.date&&normalize(e.state)==='ny'&&
       (normalize(e.city)===normalize(plan.city)||(plan.date==='2026-10-24'&&normalize(e.city)==='new york'))&&
       (plan.date!=='2026-10-24'||normalize(e.promotion).includes('flex fight')||/^(tbd|to be announced|promotion tba|ctc fight card)$/i.test(String(e.promotion||'').trim())))));
   let parent=existing.find(e=>String(e.notes||'').includes(marker));
   if(!parent){
     if(existing.length===1)parent=existing[0];
     if(existing.length>1){errors.push({date:plan.date,error:'Multiple New York events are scheduled for this date. Choose the correct card manually; no automatic attachment was made.'});continue}
   }
   try{
     if(parent){
       const cleanNotes=String(parent.notes||'').split(/\r?\n/).filter(line=>!/^CTC_(SERIES_NUMBER|EVENT_TITLE|EVENT_TIME):/.test(line));
       const notes=[...cleanNotes,!String(parent.notes||'').includes(marker)?marker:'',plan.seriesNumber?`CTC_SERIES_NUMBER:${plan.seriesNumber}`:'',plan.eventTitle?`CTC_EVENT_TITLE:${plan.eventTitle}`:'',plan.time?`CTC_EVENT_TIME:${plan.time}`:''].filter(Boolean).join('\n');
       const title=/^(?:tbd|to be announced|promotion tba|ctc fight card)$/i.test(String(parent.promotion||'').trim())?'Promotion TBA':parent.promotion;
       const updated=await rest(`events?id=eq.${encodeURIComponent(parent.id)}`,{method:'PATCH',body:{event_date:plan.date,city:plan.city,state:plan.state,venue:plan.venue,promotion:plan.promotion,status:'confirmed',is_published:true,notes,updated_at:new Date().toISOString()},headers:{Prefer:'return=representation'}});
       parent=updated?.[0]||parent;
     }else{
       const made=await rest('events',{method:'POST',body:{promotion:plan.promotion,event_date:plan.date,city:plan.city,state:plan.state,venue:plan.venue,status:'confirmed',is_published:true,notes:[marker,plan.seriesNumber?`CTC_SERIES_NUMBER:${plan.seriesNumber}`:'',plan.eventTitle?`CTC_EVENT_TITLE:${plan.eventTitle}`:'',plan.time?`CTC_EVENT_TIME:${plan.time}`:''].filter(Boolean).join('\n')},headers:{Prefer:'return=representation'}});
       parent=made?.[0];
     }
     if(!parent?.id)throw new Error('Could not save the parent event');
     eventFor[plan.date]=parent;
   }catch(e){errors.push({date:plan.date,error:e.message});continue}
 }
 for(const item of matched){
   const parent=eventFor[item.plan.date];if(!parent)continue;
   const f=item.people[0],selectedMarker=`CTC_EVENT_ID:${parent.id}`;
   const candidates=(allMatchups||[]).filter(m=>String(m.fighter_id)===String(f.id)&&String(m.fight_date||'')===item.plan.date);
   if(candidates.length>1){errors.push({name:item.name,error:'Multiple existing matchups on this date; resolve them in Matchmaking.'});continue}
   const existing=candidates[0];
   // A second LOAD reconciles newly activated fighters, not previously edited bouts.
   // Confirm this matchup is on this specific event before treating it as saved.
   const oldParent=String(existing?.notes||'').match(/(?:^|\n)CTC_EVENT_ID:([0-9a-f-]+)(?:\n|$)/i)?.[1];
   if(oldParent&&String(oldParent)!==String(parent.id)){
     errors.push({name:item.name,error:'Fighter already assigned to a different event on this date; no changes made.'});continue;
   }
   if(existing&&String(oldParent)===String(parent.id)){
     const publicMarker=`CTC_MATCHUP_ID:${existing.id}`;
     const alreadyPublic=(allEvents||[]).some(e=>e.is_published&&String(e.notes||'').split(/\r?\n/).includes(publicMarker));
     if(alreadyPublic){
       results.push({name:item.name,date:item.plan.date,fighter_id:f.id,published:true,activated:true,existing:true,matchup_id:existing.id});
       continue;
     }
   }
   const isFC=fightCapitalGym.has(normalize(item.name));
   const existingNotes=String(existing?.notes||'').split(/\r?\n/).filter(x=>!/^CTC_EVENT_ID:/i.test(x));
   const titleFlag=String(existing?.notes||'').match(/(?:^|\n)CTC_CHAMPIONSHIP_BOUT:([01])(?:\n|$)/i)?.[1];
   const championshipFlag=titleFlag??(item.plan.date==='2026-11-06'&&championshipFighters.has(normalize(item.name))?'1':null);
   const notes=[...existingNotes.filter(x=>!/^CTC_CHAMPIONSHIP_BOUT:/i.test(x)),selectedMarker,championshipFlag===null?'':`CTC_CHAMPIONSHIP_BOUT:${championshipFlag}`].filter(Boolean).join('\n');
   // Fight Capital is these fighters' gym, NOT a promotion or event name.
   // Each matchup is linked to a verified, activated roster profile.
   const fields={fighter_id:f.id,status:'confirmed',fight_date:item.plan.date,
     promotion:parent.promotion||'Promotion TBA',
     event_name:parent.promotion==='Flex Fight Series'?'Flex Fight Series '+item.plan.seriesNumber+': '+item.plan.eventTitle:'CTC Fight Card',
     city:item.plan.city,state:item.plan.state,venue:item.plan.venue,notes};
   try{
     if(isFC&&String(f.gym||'').trim()!=='Fight Capital'){
       const gymUpdate=await rest(`fighters?id=eq.${encodeURIComponent(f.id)}`,{method:'PATCH',body:{gym:'Fight Capital'},headers:{Prefer:'return=representation'}});
       if(!gymUpdate?.[0]?.id)throw new Error('Could not update fighter gym');
     }
     const saved=await rest(existing?`fighter_matchups?id=eq.${encodeURIComponent(existing.id)}`:'fighter_matchups',{method:existing?'PATCH':'POST',body:fields,headers:{Prefer:'return=representation'}});
     const m=saved?.[0]||existing;if(!m?.id)throw new Error('Could not save fighter matchup');
     const pubMarker=`CTC_MATCHUP_ID:${m.id}`;
     const publicEvent=(allEvents||[]).find(e=>String(e.notes||'').split(/\r?\n/).includes(pubMarker));
     const publicNotes=[pubMarker,`CTC_PARENT_EVENT_ID:${parent.id}`,`MATCHUP:${item.name}${m.opponent_name?' vs '+m.opponent_name:''}`,String(m.notes||'').includes('CTC_CHAMPIONSHIP_BOUT:1')?'CTC_CHAMPIONSHIP_BOUT:1':'',
       m.opponent_record?`OPPONENT_RECORD:${m.opponent_record}`:'',
       (m.opponent_name&&String(m.notes||'').match(/(?:^|\n)CTC_OPPONENT_PHOTO_URL:([^\n]+)/i)?.[1])?`OPPONENT_PHOTO_URL:${String(m.notes||'').match(/(?:^|\n)CTC_OPPONENT_PHOTO_URL:([^\n]+)/i)[1]}`:'',
       m.contracted_weight?`WEIGHT:${m.contracted_weight}`:'',
       ].filter(Boolean).join('\n');
     const publicPayload={promotion:parent.promotion||'Promotion TBA',event_date:item.plan.date,city:item.plan.city,state:item.plan.state,venue:item.plan.venue,discipline:m.discipline||parent.discipline||null,status:'confirmed',is_published:true,notes:publicNotes,updated_at:new Date().toISOString()};
     const pub=await rest(publicEvent?`events?id=eq.${encodeURIComponent(publicEvent.id)}`:'events',{method:publicEvent?'PATCH':'POST',body:publicPayload,headers:{Prefer:'return=representation'}});
     if(!pub?.[0]?.id&&!publicEvent)throw new Error('Could not publish fighter on event card');
     await rest(`fighters?id=eq.${encodeURIComponent(f.id)}`,{method:'PATCH',body:{ready_to_fight:true},headers:{Prefer:'return=minimal'}});
     results.push({name:item.name,date:item.plan.date,fighter_id:f.id,published:true,activated:!!f.auth_user_id,existing:!!existing,matchup_id:m.id});
   }catch(e){errors.push({name:item.name,date:item.plan.date,error:e.message})}
 }
 return json(200,{...overview,preview:false,missing:assignments.filter(x=>!x.people.length).map(x=>x.name),createdProfiles:[],results,errors,completed:results.length,requested:assignments.length,eventsSaved:Object.keys(eventFor).length});
}
if(action==='matchup-save'){
 const id=String(b.id||''),fighterId=String(b.fighter_id||'');
 if(!/^[0-9a-f-]{36}$/i.test(fighterId))throw new Error('Choose a fighter from the CTC roster');
 // New assignments wait for an activated roster profile; existing assignments stay intact.
 const fighter=(await rest(`fighters?id=eq.${encodeURIComponent(fighterId)}&select=id,auth_user_id,status`))?.[0];
 if(!fighter)throw new Error('That fighter is no longer in the roster');
 if(!id&&!fighter.auth_user_id)throw new Error('Activate this fighter’s existing roster profile before assigning a new matchup.');
 if(id&&!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid matchup');
 const p={...b};delete p.id;delete p.auth_user_id;delete p.is_public;delete p.portal_connection;delete p.championship_bout;
 const data=await rest(id?`fighter_matchups?id=eq.${encodeURIComponent(id)}`:'fighter_matchups',{method:id?'PATCH':'POST',body:p,headers:{Prefer:'return=representation'}});
 if(['pending','confirmed'].includes(p.status)){await rest(`fighters?id=eq.${encodeURIComponent(fighterId)}`,{method:'PATCH',body:{ready_to_fight:true},headers:{Prefer:'return=minimal'}});}
 return json(200,data?.[0]||data)
}
if(action==='matchup-publication'){
 const id=String(b.id||'');
 const publish=!!b.publish;
 if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid matchup');
 const matchup=(await rest(`fighter_matchups?id=eq.${encodeURIComponent(id)}&select=*`))?.[0];
 if(!matchup)throw new Error('Matchup not found');
 const fighter=(await rest(`fighters?id=eq.${encodeURIComponent(matchup.fighter_id)}&select=id,first_name,last_name,nickname,auth_user_id`))?.[0];
 if(!fighter)throw new Error('Fighter not found');
 if(publish&&!fighter.auth_user_id)throw new Error('Activate this fighter’s existing roster profile before publishing their matchup.');
 // Publishing uses the roster fighter_id of an activated profile.
 const fighterName=[fighter.first_name,fighter.nickname?`“${fighter.nickname}”`:'',fighter.last_name].filter(Boolean).join(' ');
 const marker=`CTC_MATCHUP_ID:${id}`;
 const allEvents=await rest('events?select=id,promotion,event_date,city,state,venue,discipline,status,notes,is_published');
 const existing=(allEvents||[]).find(x=>String(x.notes||'').includes(marker));
 if(!publish){
  if(existing)await rest(`events?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',body:{is_published:false,updated_at:new Date().toISOString()},headers:{Prefer:'return=minimal'}});
  return json(200,{ok:true,is_public:false});
 }
 if(!matchup.fight_date)throw new Error('Add a fight date before publishing');
 // Opponent is optional: a roster fighter can be published before an opponent is announced.
 if(!(matchup.event_name||matchup.promotion))throw new Error('Add an event or promotion before publishing');
 if(matchup.status==='cancelled')throw new Error('Cancelled matchups cannot be published');
 const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
 const baseEvents=(allEvents||[]).filter(e=>!String(e.notes||'').includes('CTC_MATCHUP_ID:'));
 const sameDate=baseEvents.filter(e=>String(e.event_date||'')===String(matchup.fight_date||''));
 const selectedId=String(matchup.notes||'').match(/(?:^|\n)CTC_EVENT_ID:([0-9a-f-]+)(?:\n|$)/i)?.[1];
 const selectedParent=selectedId?baseEvents.find(e=>String(e.id)===selectedId):null;
 if(selectedId&&!selectedParent)throw new Error('The selected Upcoming Fight no longer exists. Select a current fight and save again.');
 const ranked=sameDate.map(event=>{let score=0;if(norm(event.promotion)&&norm(event.promotion)===norm(matchup.promotion))score+=6;if(norm(event.venue)&&norm(event.venue)===norm(matchup.venue))score+=5;if(norm(event.city)&&norm(event.city)===norm(matchup.city))score+=2;if(norm(event.state)&&norm(event.state)===norm(matchup.state))score+=1;return {event,score}}).sort((a,z)=>z.score-a.score);
 const parent=selectedParent||(ranked[0]?.score>0?ranked[0].event:(sameDate.length===1?sameDate[0]:null));
 if(!parent)throw new Error('Choose an existing Upcoming Fight before publishing this matchup.');
 if(['cancelled','closed','completed'].includes(String(parent.status||'').toLowerCase()))throw new Error('This Upcoming Fight is closed or cancelled; reopen the event before publishing matchups.');
 const publicStatus=matchup.status==='confirmed'?'confirmed':matchup.status==='completed'?'closed':'matching';
 const notes=[marker,`CTC_PARENT_EVENT_ID:${parent.id}`,`MATCHUP:${fighterName}${matchup.opponent_name?' vs '+matchup.opponent_name:''}`,String(matchup.notes||'').includes('CTC_CHAMPIONSHIP_BOUT:1')?'CTC_CHAMPIONSHIP_BOUT:1':'',matchup.opponent_record?`OPPONENT_RECORD:${matchup.opponent_record}`:'',String(matchup.notes||'').match(/(?:^|\n)CTC_OPPONENT_PHOTO_URL:([^\n]+)/i)?.[1]?`OPPONENT_PHOTO_URL:${String(matchup.notes||'').match(/(?:^|\n)CTC_OPPONENT_PHOTO_URL:([^\n]+)/i)[1]}`:'',matchup.contracted_weight?`WEIGHT:${matchup.contracted_weight}`:'',matchup.event_name?`EVENT:${matchup.event_name}`:'',matchup.notes?`ADMIN_NOTE:${String(matchup.notes).replace(/(?:^|\n)CTC_EVENT_ID:[0-9a-f-]+(?=\n|$)/gi,'').replace(/(?:^|\n)CTC_OPPONENT_PHOTO_URL:[^\n]*(?=\n|$)/gi,'').replace(/(?:^|\n)CTC_CHAMPIONSHIP_BOUT:[01](?=\n|$)/gi,'').replace(/\n/g,' ').trim()}`:''].filter(Boolean).join('\n');
 const payload={promotion:parent.promotion||matchup.promotion||matchup.event_name||'CTC Fight',event_date:parent.event_date||matchup.fight_date,city:parent.city||matchup.city||'Location',state:parent.state||matchup.state||'TBD',venue:parent.venue||matchup.venue||matchup.event_name||'Location TBD',discipline:matchup.discipline||parent.discipline||null,status:publicStatus,notes,is_published:true,updated_at:new Date().toISOString()};
 let row;
 if(existing){const data=await rest(`events?id=eq.${encodeURIComponent(existing.id)}`,{method:'PATCH',body:payload,headers:{Prefer:'return=representation'}});row=data?.[0]||data}
 else{const data=await rest('events',{method:'POST',body:payload,headers:{Prefer:'return=representation'}});row=data?.[0]||data}
 // A published matchup cannot appear publicly if its parent event is still unpublished.
 if(!parent.is_published)await rest(`events?id=eq.${encodeURIComponent(parent.id)}`,{method:'PATCH',body:{is_published:true,updated_at:new Date().toISOString()},headers:{Prefer:'return=minimal'}});
 return json(200,{ok:true,is_public:true,parent_event_id:parent.id,event:row});
}
if(action==='archive-card'||action==='delete-card'){
 const card=String(b.event_id||'');if(!/^[0-9a-f-]{36}$/i.test(card))throw new Error('Invalid fight card');
 const parent=(await rest(`events?id=eq.${encodeURIComponent(card)}&select=*`))?.[0];if(!parent)throw new Error('Fight card not found');
 if(String(parent.notes||'').includes('CTC_MATCHUP_ID:'))throw new Error('This is an individual matchup, not a parent fight card');
 const [matchups,publicRows]=await Promise.all([rest('fighter_matchups?select=id,fighter_id,notes,fight_date'),rest('events?select=id,notes')]);
 const linked=(matchups||[]).filter(m=>String(m.notes||'').split(/\r?\n/).includes(`CTC_EVENT_ID:${card}`));
 const published=(publicRows||[]).filter(e=>String(e.notes||'').split(/\r?\n/).includes(`CTC_PARENT_EVENT_ID:${card}`));
 if(action==='delete-card'){
   if(linked.length||published.length)throw new Error(`This card has ${linked.length} linked matchups and ${published.length} published fighter records. Archive it to preserve fighter history. Unlink only if you intentionally want a permanent deletion.`);
   await rest(`events?id=eq.${encodeURIComponent(card)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});return json(200,{ok:true,deleted:true});
 }
 await rest(`events?id=eq.${encodeURIComponent(card)}`,{method:'PATCH',body:{status:'completed',is_published:false,updated_at:new Date().toISOString()},headers:{Prefer:'return=minimal'}});
 return json(200,{ok:true,archived:true,linked_matchups:linked.length,published_fighter_records:published.length});
}
if(action==='document-url'){const row=(await rest(`fighter_documents?id=eq.${encodeURIComponent(b.id)}&select=*`))?.[0];if(!row)throw new Error('Document not found');const path=row.file_path||row.storage_path;if(!path)throw new Error('Document file path missing');const {url,key}=env();const r=await fetch(`${url}/storage/v1/object/sign/fighter-documents/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600})});const j=await r.json();if(!r.ok)throw new Error(j.message||'Could not open document');return json(200,{url:`${url}/storage/v1${j.signedURL}`})}
if(action==='document-delete'){const id=String(b.id||'');const row=(await rest(`fighter_documents?id=eq.${encodeURIComponent(id)}&select=*`))?.[0];if(!row)throw new Error('Document not found');if(row.review_status!=='rejected'&&!(row.expiration_date&&new Date(row.expiration_date)<new Date()))throw new Error('Only rejected or expired uploads may be deleted');await rest(`fighter_documents?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});const path=row.file_path||row.storage_path;if(path){const {url,key}=env();const result=await fetch(`${url}/storage/v1/object/fighter-documents/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'DELETE',headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})}});if(!result.ok)return json(200,{ok:true,storageCleanupWarning:'Database entry removed; storage file cleanup failed'})}return json(200,{ok:true})}
if(action==='document-review'){const data=await rest(`fighter_documents?id=eq.${encodeURIComponent(b.id)}`,{method:'PATCH',body:{review_status:b.review_status,reviewed_at:new Date().toISOString()},headers:{Prefer:'return=representation'}});return json(200,data?.[0]||data)}
// Keep branded footer in one place, and never send a portal email without its action button.
const CTC_PORTAL_ACTIVATION_URL='https://couchtocage.com/fighter-portal/?activate=1';
const isPortalEmail=text=>/\b(?:fighter\s+portal|portal\s+(?:login|account|activation)|fighter\s+login|activate\s+(?:(?:your|my|the|a)\s+)?(?:fighter\s+)?account|access\s+fighter\s+portal)\b/i.test(String(text||''));
function removeRepeatedEmailFooter(message){
 let text=String(message||'').trim();
 // The email template itself always adds BLEED BLUE. TOUCH GOLD. as the final footer.
 // Preserve an optional CTC Management sign-off after a manually typed slogan.
 text=text.replace(/(?:\r?\n)+\s*BLEED\s+BLUE\.\s*TOUCH\s+GOLD\.\s*(?=(?:\r?\n\s*CTC Management\s*)?$)/i,'');
 return text.trimEnd();
}
function resolveEmailButton({subject='',headline='',message='',buttonText='',buttonUrl=''},portalAuto=false){
 let text=String(buttonText||'').trim(),url=String(buttonUrl||'').trim();
 const portal=portalAuto&&isPortalEmail([subject,headline,message].join(' '));
 if(portal&&!text&&!url){text='ACTIVATE FIGHTER ACCOUNT';url=CTC_PORTAL_ACTIVATION_URL;}
 if(Boolean(text)!==Boolean(url))throw new Error('Button text and button link must BOTH be filled in before sending.');
 if(url){let parsed;try{parsed=new URL(url)}catch{};if(!parsed||!['http:','https:'].includes(parsed.protocol))throw new Error('Enter a valid http(s) button link.');}
 return {buttonText:text,buttonUrl:url};
}
async function sendEmail({to,subject,headline,message,buttonText,buttonUrl,pictureGuide=false,attachment=null}){message=String(message||'').replace(/^(?:hey|hi|dear)\s+(?:\[first name\]|[^\n,]+),?\s*/i,'').trim();if(!/^hello ctc family[,!]?/i.test(message))message='Hello CTC Family,\n\n'+message;const key=process.env.RESEND_API_KEY;if(!key)throw new Error('RESEND_API_KEY is not configured');const esc=v=>String(v||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));const paras=esc(removeRepeatedEmailFooter(message)).split(/\n{2,}/).map(x=>`<p style="margin:0 0 16px;line-height:1.65;color:#e8edf7">${x.replace(/\n/g,'<br>')}</p>`).join('');const button=buttonText&&buttonUrl?`<p style="margin:26px 0"><a href="${esc(buttonUrl)}" style="display:inline-block;background:#f5c242;color:#07101d;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:10px">${esc(buttonText)}</a></p>`:'';const pictures=pictureGuide?`<div style="padding:10px 0"><h2 style="color:#f5c242">iPhone — Safari</h2>${[1,2,3,4].map(i=>`<img alt="iPhone install step ${i}" src="https://couchtocage.com/assets/app/iphone-${i}.png" width="560" style="width:100%;max-width:560px;height:auto;margin:8px 0;border-radius:10px" />`).join('')}<h2 style="color:#f5c242">Android — Chrome</h2>${[1,2,3,4].map(i=>`<img alt="Android install step ${i}" src="https://couchtocage.com/assets/app/android-${i}.png" width="560" style="width:100%;max-width:560px;height:auto;margin:8px 0;border-radius:10px" />`).join('')}<p><a href="https://couchtocage.com/install.html" style="color:#f5c242">Open the full picture walkthrough</a></p></div>`:'';const html=`<div style="background:#030711;padding:28px;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;border:1px solid #7b6325;border-radius:18px;padding:30px;background:#07101d"><div style="font-size:13px;letter-spacing:2px;color:#f5c242;font-weight:800">COUCH TO CAGE</div><h1 style="color:white;margin:12px 0 20px">${esc(headline||subject)}</h1>${paras}${pictures}${button}<p style="margin-top:28px;color:#f5c242;font-weight:800">BLEED BLUE. TOUCH GOLD.</p></div></div>`;const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:'CTC Management <fighters@couchtocage.com>',reply_to:'officialcouchtocage@gmail.com',to:[to],subject,html,...(attachment?{attachments:[attachment]}:{})})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||`Resend ${r.status}`);return j}
if(action==='decline-application'){const a=(await rest(`applications?id=eq.${encodeURIComponent(b.id)}&select=*`))?.[0];if(!a)throw new Error('Application not found');const data=await rest(`applications?id=eq.${encodeURIComponent(b.id)}`,{method:'PATCH',body:{status:'declined'},headers:{Prefer:'return=representation'}});let email={sent:false};if(a.email){const t=b.emailTemplate||{};try{const j=await sendEmail({to:a.email,subject:String(t.subject||'Couch To Cage Application Update'),headline:String(t.headline||'Thank You for Applying to CTC'),message:String(t.message||'Thank you for your interest in Couch To Cage and for taking the time to submit your fighter application.\n\nAt this time, we are not adding your application to the CTC fighter roster. We appreciate your interest and wish you the best with your training and upcoming opportunities.\n\nBleed Blue. Touch Gold.'),buttonText:String(t.buttonText||''),buttonUrl:String(t.buttonUrl||'')});email={sent:true,id:j.id}}catch(e){email={sent:false,error:e.message}}}return json(200,{application:data?.[0]||data,email})}
if(action==='approve-application'){const a=(await rest(`applications?id=eq.${encodeURIComponent(b.id)}&select=*`))?.[0];if(!a)throw new Error('Application not found');const rec=String(a.amateur_record||'0-0-0').match(/(\d+)\D+(\d+)(?:\D+(\d+))?/);const fighter={first_name:a.first_name||'Unknown',last_name:a.last_name||'Unknown',email:a.email,phone:a.phone||null,date_of_birth:a.date_of_birth||null,hometown:[a.city,a.state].filter(Boolean).join(', ')||null,gym:a.gym||'N/A',disciplines:Array.isArray(a.disciplines)&&a.disciplines.length?a.disciplines:['N/A'],weight_class:a.weight_class||null,current_weight:a.walk_around_weight||null,amateur_wins:+(rec?.[1]||0),amateur_losses:+(rec?.[2]||0),amateur_draws:+(rec?.[3]||0),tapology_url:(/^https?:\/\/(?:www\.)?tapology\.com\//i.test(String(a.tapology_url||'').trim())?String(a.tapology_url).trim():null),status:'active',portal_status:'not_activated'};const data=await rest('fighters?on_conflict=email',{method:'POST',body:fighter,headers:{Prefer:'resolution=merge-duplicates,return=representation'}});await rest(`applications?id=eq.${encodeURIComponent(b.id)}`,{method:'PATCH',body:{status:'approved'},headers:{Prefer:'return=minimal'}});let email={sent:false};if(a.email){const t=b.emailTemplate||{};try{const j=await sendEmail({to:a.email,subject:String(t.subject||'Welcome to Couch To Cage'),headline:String(t.headline||`Welcome to CTC, ${a.first_name||'Fighter'}`),message:String(t.message||'Your fighter application has been approved. Welcome to Couch To Cage.\n\nIMPORTANT: When accessing your Fighter Portal, use the SAME EMAIL ADDRESS you used when you applied to Couch To Cage. This is how the portal connects you to your approved fighter profile.\n\nUse the Fighter Portal to keep your profile, weight, bloodwork, and fight information up to date. CTC will also use the portal and email to communicate important fighter updates and opportunities.\n\nBleed Blue. Touch Gold.'),buttonText:String(t.buttonText||'ACTIVATE FIGHTER ACCOUNT'),buttonUrl:String(t.buttonUrl||'https://couchtocage.com/fighter-portal/?activate=1')});email={sent:true,id:j.id}}catch(e){email={sent:false,error:e.message}}}return json(200,{fighter:data?.[0]||data,email})}
if(action==='application-email-test'){const type=b.type==='decline'?'decline':'approval',t=b.template||{},to=String(b.testEmail||'officialcouchtocage@gmail.com').trim();const defaults=type==='decline'?{subject:'Couch To Cage Application Update',headline:'Thank You for Applying to CTC',message:'Thank you for your interest in Couch To Cage and for taking the time to submit your fighter application.\n\nAt this time, we are not adding your application to the CTC fighter roster. We appreciate your interest and wish you the best with your training and upcoming opportunities.\n\nBleed Blue. Touch Gold.',buttonText:'',buttonUrl:''}:{subject:'Welcome to Couch To Cage',headline:'Welcome to the CTC Roster',message:'Your fighter application has been approved. Welcome to Couch To Cage.\n\nIMPORTANT: When accessing your Fighter Portal, use the SAME EMAIL ADDRESS you used when you applied to Couch To Cage.\n\nUse the Fighter Portal to keep your profile, weight, bloodwork, and fight information up to date.\n\nBleed Blue. Touch Gold.',buttonText:'ACTIVATE FIGHTER ACCOUNT',buttonUrl:'https://couchtocage.com/fighter-portal/?activate=1'};try{const j=await sendEmail({to,subject:String(t.subject||defaults.subject),headline:String(t.headline||defaults.headline),message:String(t.message||defaults.message),buttonText:String(t.buttonText??defaults.buttonText),buttonUrl:String(t.buttonUrl??defaults.buttonUrl)});return json(200,{sent:true,id:j.id})}catch(e){return json(200,{sent:false,error:e.message})}}
if(action==='travel-reminder-send'){
 const mid=String(b.matchup_id||'');if(!/^[0-9a-f-]{36}$/i.test(mid))throw new Error('Invalid matchup');
 const match=(await rest(`fighter_matchups?id=eq.${encodeURIComponent(mid)}&select=*`))?.[0];if(!match)throw new Error('Matchup not found');
 const f=(await rest(`fighters?id=eq.${encodeURIComponent(match.fighter_id)}&select=first_name,last_name,email`))?.[0];if(!f?.email)throw new Error('Add the fighter’s verified roster email before sending travel details');
 const t=(await rest(`ctc_fighter_travel?matchup_id=eq.${encodeURIComponent(mid)}&select=*`))?.[0];if(!t?.departure_at)throw new Error('Add the departure date and time before sending travel details');
 const when=String(t.departure_at).replace('T',' ')+' '+String(t.depart_timezone||'time zone to confirm');
 const info=[`Travel: ${t.mode||'Scheduled transportation'}`,`Carrier: ${t.carrier||'Please check your portal'}`,`Service number: ${t.service_number||'See booking'}`,`Departure: ${t.depart_from||'See booking'}`,`Arrival: ${t.arrive_at||'See booking'}`,`Departure time (local to departure city): ${when}`,t.terminal?`Terminal: ${t.terminal}`:'',t.gate?`Gate: ${t.gate}`:''].filter(Boolean).join('\n');
 const email=await sendEmail({to:f.email,subject:'CTC MANAGEMENT — Your Travel Details & Check-In Reminder',headline:'YOUR CTC TRAVEL DETAILS',message:`Hello CTC Family,\n\nCTC MANAGEMENT here with a reminder for your upcoming fight travel.\n\n${info}\n\nPlease check in when your airline or transportation provider opens check-in, keep up with your flight/bus times, and confirm your terminal, gate, or station before departure. Carrier schedules can change.\n\nView your latest travel details and booking link in your Fighter Portal under Upcoming Fights. If you have any questions or concerns, please reach out to us through Messages on your account.\n\nCTC Management`,buttonText:'VIEW MY FIGHT & TRAVEL',buttonUrl:'https://couchtocage.com/fighter-portal/'});
 return json(200,{sent:true,id:email.id,to:f.email});
}
if(action==='broadcast-send'){const subject=String(b.subject||'').trim(),headline=String(b.headline||subject).trim(),message=String(b.message||'').trim();if(!subject||!message)throw new Error('Subject and message are required');const {buttonText,buttonUrl}=resolveEmailButton({subject,headline,message,buttonText:b.buttonText,buttonUrl:b.buttonUrl},true);let recipients=[];if(b.test){recipients=[String(b.testEmail||'officialcouchtocage@gmail.com').trim()]}else{const all=await rest(b.audience==='all-fighters'?'fighters?select=id,email,status,ready_to_fight':'fighters?select=id,email,status,ready_to_fight&status=neq.inactive');if(b.audience==='ready')recipients=(all||[]).filter(x=>x.ready_to_fight).map(x=>x.email);else if(b.audience==='selected')recipients=(all||[]).filter(x=>(b.ids||[]).includes(x.id)).map(x=>x.email);else recipients=(all||[]).map(x=>x.email)}recipients=[...new Set(recipients.filter(Boolean))];if(!recipients.length)throw new Error('No recipients selected');
let attachment=null;if(b.attachment){const a=b.attachment,filename=String(a.name||'').slice(0,120).replace(/[\\/\0-\x1f<>:\"|?*]/g,'_'),type=String(a.type||'').toLowerCase(),content=String(a.base64||'');const allowed=['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];if(!filename||!allowed.includes(type)||!/^[A-Za-z0-9+/]+={0,2}$/.test(content)||content.length>Math.ceil(3*1024*1024*4/3)+8||Buffer.from(content,'base64').length>3*1024*1024)throw new Error('Broadcast attachment must be a JPG, PNG, WebP, PDF, TXT, DOC or DOCX up to 3 MB');attachment={filename,content};}
const results=[];for(const to of recipients){try{const j=await sendEmail({to,subject,headline,message,buttonText,buttonUrl,pictureGuide:b.template_type==='install',attachment});results.push({to,ok:true,id:j.id})}catch(e){results.push({to,ok:false,error:e.message})}}return json(200,{sent:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,total:results.length,results})}
return json(400,{error:'Unknown action'});
}catch(e){const message=e.message||String(e);return json(/invalid session|not signed in/i.test(message)?401:/admin access required/i.test(message)?403:400,{error:message})}}
