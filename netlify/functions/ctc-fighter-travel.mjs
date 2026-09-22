const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export default async req=>{try{
 if(req.method!=='POST')return json(405,{error:'POST required'});
 const {SUPABASE_URL:url,SUPABASE_SECRET_KEY,SUPABASE_SERVICE_ROLE_KEY}=process.env;const key=SUPABASE_SECRET_KEY||SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Travel service not configured');
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return json(401,{error:'Sign in first'});
 const u=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
 if(!u.ok)return json(401,{error:'Session expired. Sign in again.'});
 const user=await u.json();const b=await req.json();const id=String(b.matchup_id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return json(400,{error:'Invalid fight'});
 const headers={apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})};
 const fighterResponse=await fetch(`${url}/rest/v1/fighters?auth_user_id=eq.${encodeURIComponent(user.id)}&select=id`,{headers});if(!fighterResponse.ok)throw new Error('Fighter lookup failed');
 const fighters=await fighterResponse.json();if(fighters.length!==1)return json(403,{error:'No linked fighter profile'});
 const path=`ctc_fighter_travel?matchup_id=eq.${encodeURIComponent(id)}&fighter_id=eq.${encodeURIComponent(fighters[0].id)}&select=itinerary_path`;
 const r=await fetch(`${url}/rest/v1/${path}`,{headers});if(!r.ok)throw new Error('Itinerary lookup failed');const rows=await r.json();if(!rows?.[0]?.itinerary_path)return json(404,{error:'No itinerary uploaded for this fight'});
 const s=await fetch(`${url}/storage/v1/object/sign/ctc-travel/${rows[0].itinerary_path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:600})});const j=await s.json().catch(()=>({}));
 if(!s.ok||!j.signedURL)throw new Error(j.message||'Could not open itinerary');return json(200,{url:`${url}/storage/v1${j.signedURL}`});
 }catch(e){return json(400,{error:e.message||String(e)})}};
