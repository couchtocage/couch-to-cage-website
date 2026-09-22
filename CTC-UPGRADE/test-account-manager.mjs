import assert from 'node:assert/strict';
import handler from '../netlify/functions/ctc-admin-api.mjs';
process.env.SUPABASE_URL='https://mock.supabase.invalid';
process.env.SUPABASE_SECRET_KEY='mock-service-key';
process.env.RESEND_API_KEY='mock-resend-key';
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const admin=uid(999);
const fighters=[
{id:uid(1),first_name:'Yusif',last_name:'Thomas',email:'yusif@test.invalid',auth_user_id:uid(101),status:'active'},
{id:uid(2),first_name:'Jeremiah',last_name:'Parker Jones',email:'jeremiah@test.invalid',auth_user_id:null,status:'active'},
{id:uid(3),first_name:'Treve',last_name:'Gielder',email:'treve@test.invalid',auth_user_id:uid(103),status:'active'},
{id:uid(4),first_name:'Brendan',last_name:'Simpson',email:'brendan@test.invalid',auth_user_id:uid(104),status:'active'},
{id:uid(5),first_name:'Ali',last_name:'Kahzaal',email:'',auth_user_id:null,status:'active'},
];
const requests=[{id:uid(301),request_type:'weight',status:'pending',fighter_id:uid(1)},{id:uid(302),request_type:'bloodwork',status:'completed',fighter_id:uid(1)}];
const dismissals=[];const accounts=[];const emails=[];let created=0;
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opts={})=>{
 const u=new URL(url),body=opts.body?JSON.parse(opts.body):{},method=opts.method||'GET';
 if(u.hostname==='api.resend.com'){emails.push(body);return reply({id:'sent-'+emails.length})}
 if(u.pathname==='/auth/v1/user')return reply({id:admin});
 if(u.pathname==='/auth/v1/admin/users'){
  created++;accounts.push(body);return reply({id:uid(200+created)});
 }
 const table=u.pathname.split('/rest/v1/')[1]?.split('?')[0];
 if(table==='admin_users')return reply([{user_id:admin}]);
 const collections={fighters,ctc_fighter_requests:requests,ctc_admin_notification_dismissals:dismissals};
 const rows=collections[table];if(!rows)return reply({message:'Unknown mock table '+table},500);
 if(method==='GET'){
  let selected=rows;
  for(const [key,value] of u.searchParams){
   if(key==='id'&&value.startsWith('eq.'))selected=selected.filter(x=>x.id===value.slice(3));
   if(key==='id'&&value.startsWith('in.'))selected=selected.filter(x=>value.slice(4,-1).split(',').includes(x.id));
   if(key==='status'&&value.startsWith('eq.'))selected=selected.filter(x=>x.status===value.slice(3));
  }
  return reply(selected);
 }
 if(method==='PATCH'){
  const x=rows.find(row=>row.id===u.searchParams.get('id')?.slice(3));if(!x)return reply([],404);
  Object.assign(x,body);return reply([x]);
 }
 if(method==='POST'){rows.push(...(Array.isArray(body)?body:[body]));return reply([])}
 return reply({message:'Unexpected method'},500)
};
async function call(action,body){const r=await handler(new Request('https://ctc.test/.netlify/functions/ctc-admin-api?action='+action,{method:'POST',headers:{authorization:'Bearer mock-admin'},body:JSON.stringify(body)}));const j=await r.json();assert.equal(r.status,200,JSON.stringify(j));return j}
const p=await call('card-activate-fighters',{date:'2026-10-24',preview:true});
assert.deepEqual(p.results.map(x=>x.state),['already_active','ready_to_activate','already_active','already_active','missing_email']);
assert.equal(created,0);assert.equal(emails.length,0);
console.log('PASS A: preview does not activate or email; missing email flagged; three existing skipped');
const c=await call('card-activate-fighters',{date:'2026-10-24',preview:false});

assert.equal(created,1);assert.equal(emails.length,1);
assert.equal(c.results[1].state,'activated');assert.equal(c.results[1].emailed,true);
assert.equal(fighters[1].auth_user_id,uid(201));
assert.match(emails[0].html,/Hello CTC Family,/);assert.match(emails[0].from,/fighters@couchtocage.com/);
console.log('PASS B: activates only one eligible fighter, sends CTC-family email, links roster id');
const again=await call('card-activate-fighters',{date:'2026-10-24',preview:false});
assert.equal(created,1);assert.equal(emails.length,1);assert.equal(again.results[1].state,'already_active');
console.log('PASS C: repeating action is idempotent; no account or password duplicate');
const n=await call('notification-clear-all',{request_ids:requests.map(x=>x.id)});
assert.equal(n.cleared,1);assert.equal(requests[0].status,'pending');assert.equal(requests[1].status,'completed');assert.equal(dismissals.length,1);
console.log('PASS D: clear all dismisses only completed response; original requests preserved');
// Separate Account Manager: one existing roster fighter, Admin chosen password.
const manualId=uid(7);
fighters.push({id:manualId,first_name:'Manual',last_name:'Example',email:'manual@ctc.test',auth_user_id:null,status:'active'});
const singlePreview=await call('account-manager-preview',{fighter_id:manualId});
assert.equal(singlePreview.results.length,1);assert.equal(singlePreview.results[0].state,'ready_to_activate');
assert.equal(created,1);
console.log('PASS E: individual preview only checks existing roster, no account created');
const manualPass='UniqueManualPwd8765!';
const account=await call('fighter-activate-account',{id:manualId,password_mode:'manual',temporary_password:manualPass});
assert.equal(account.email,'manual@ctc.test');assert.equal(account.activation_email.sent,true);
assert.equal(accounts.at(-1).password,manualPass);
assert.equal(accounts.at(-1).user_metadata.ctc_password_change_required,true);
assert.equal(fighters.at(-1).auth_user_id,uid(202));
assert.match(emails.at(-1).html,/Hello CTC Family,/);assert.match(emails.at(-1).html,/UniqueManualPwd8765!/);
console.log('PASS F: manual temporary password creates one account, links exact roster ID and sends CTC email');
const existing=await call('fighter-activate-account',{id:manualId,password_mode:'manual',temporary_password:'AnotherSecurePwd934!'});
assert.equal(existing.already_active,true);assert.equal(created,2);assert.equal(emails.length,2);
console.log('PASS G: an existing account is skipped without resetting password or sending a duplicate email');
const bad=await handler(new Request('https://ctc.test/.netlify/functions/ctc-admin-api?action=card-activate-fighters',{method:'POST',headers:{authorization:'Bearer mock-admin'},body:JSON.stringify({date:'2026-10-24',preview:false,password_mode:'manual'})}));
assert.equal(bad.status,400);assert.match((await bad.json()).error,/generated unique passwords/i);
console.log('PASS H: no shared manually chosen password for an entire fight card');
// If a fighter clears a request without uploading, a new Admin request must re-show it.
requests[0].dismissed_at = '2026-09-20T12:00:00.000Z';
const againRequested=await call('request-create',{fighter_id:uid(1),request_type:'weight'});
assert.equal(againRequested.reopened,true);
assert.equal(requests[0].dismissed_at,null);
assert.equal(requests[0].status,'pending');
console.log('PASS I: re-requesting previously dismissed weigh-in reopens fighter notification');
