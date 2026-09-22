// Private fighter request inbox. The authenticated Supabase user determines the roster
// profile; no fighter_id is ever accepted from the browser for authorization.
const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const env=()=>({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY});
async function rest(path,{method='GET',body}={}){
 const {url,key}=env();if(!url||!key)throw Error('Fighter requests service is not configured');
 const r=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{ }),'Content-Type':'application/json',...(body?{Prefer:'return=representation'}:{})},body:body?JSON.stringify(body):undefined});
 const t=await r.text();if(!r.ok)throw Error(`Database request failed: ${t.slice(0,240)}`);return t?JSON.parse(t):[];
}
async function owner(req){
 const {url,key}=env();const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)throw Error('Sign in first');
 const r=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
 if(!r.ok)throw Error('Session expired. Sign in again.');
 const user=await r.json();
 const rows=await rest(`fighters?auth_user_id=eq.${encodeURIComponent(user.id)}&select=id,status,portal_status`);
 if(rows.length!==1)throw Error('Your verified fighter profile is not connected. Contact CTC Management.');
 if(rows[0].status==='inactive'||rows[0].portal_status==='disabled')throw Error('Your CTC portal access is disabled.');
 return rows[0].id;
}
export default async req=>{
 try{
  if(!['GET','POST'].includes(req.method))return respond(405,{error:'Method not allowed'});
  const fighterId=await owner(req);
  if(req.method==='GET')return respond(200,await rest(`ctc_fighter_requests?fighter_id=eq.${encodeURIComponent(fighterId)}&select=*&order=created_at.desc`));
  const action=new URL(req.url).searchParams.get('action')||'';
  const b=await req.json().catch(()=>({}));
  if(action==='dismiss'){
   const id=String(b.request_id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return respond(400,{error:'Invalid request'});
   const rows=await rest(`ctc_fighter_requests?id=eq.${encodeURIComponent(id)}&fighter_id=eq.${encodeURIComponent(fighterId)}&select=id`);
   if(rows.length!==1)return respond(404,{error:'Request not found on your fighter profile'});
   await rest(`ctc_fighter_requests?id=eq.${encodeURIComponent(id)}&fighter_id=eq.${encodeURIComponent(fighterId)}`,{method:'PATCH',body:{dismissed_at:new Date().toISOString()}});
   return respond(200,{ok:true});
  }
  if(action==='complete'){
   const type=String(b.request_type||'');if(!['weight','bloodwork'].includes(type))return respond(400,{error:'Invalid request type'});
   const rows=await rest(`ctc_fighter_requests?fighter_id=eq.${encodeURIComponent(fighterId)}&request_type=eq.${encodeURIComponent(type)}&status=eq.pending&select=id`);
   if(!rows.length)return respond(200,{ok:true,completed:0});
   const done=await rest(`ctc_fighter_requests?fighter_id=eq.${encodeURIComponent(fighterId)}&request_type=eq.${encodeURIComponent(type)}&status=eq.pending`,{method:'PATCH',body:{status:'completed',completed_at:new Date().toISOString()}});
   return respond(200,{ok:true,completed:done.length});
  }
  return respond(400,{error:'Unknown request action'});
 }catch(error){const m=error.message||'Request service unavailable';return respond(/Sign in|Session expired/i.test(m)?401:500,{error:m})}
};
