const out=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const esc=v=>String(v||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function send({to,subject,headline,message}){
 const key=process.env.RESEND_API_KEY;if(!key)throw new Error('RESEND_API_KEY is not configured');
 const paras=esc(message).split(/\n{2,}/).map(x=>`<p style="margin:0 0 16px;line-height:1.65;color:#e8edf7">${x.replace(/\n/g,'<br>')}</p>`).join('');
 const html=`<div style="background:#030711;padding:28px;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;border:1px solid #7b6325;border-radius:18px;padding:30px;background:#07101d"><div style="font-size:13px;letter-spacing:2px;color:#f5c242;font-weight:800">COUCH TO CAGE</div><h1 style="color:white;margin:12px 0 20px">${esc(headline)}</h1>${paras}<p style="margin-top:28px;color:#f5c242;font-weight:800">BLEED BLUE. TOUCH GOLD.</p></div></div>`;
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:'CTC Management <fighters@couchtocage.com>',reply_to:'officialcouchtocage@gmail.com',to:[to],subject,html})});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||`Resend ${r.status}`);return j;
}
export default async req=>{
 try{
  if(req.method!=='POST')return out(405,{error:'Method not allowed'});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Server setup incomplete');
  const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!token)throw new Error('Sign in first');
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
  if(!ur.ok)throw new Error('Sign in first');
  const user=await ur.json(),email=String(user.email||'').trim();
  if(!email)throw new Error('Account email unavailable');
  const body=await req.json().catch(()=>({})),type=String(body.type||'');
  let subject,headline,message;
  if(type==='password_changed'){
   subject='Your CTC Fighter Portal Password Was Changed';
   headline='Password Changed Successfully';
   message=`Your Couch To Cage Fighter Portal password was changed successfully.

Account: ${email}

If you made this change, no further action is needed.

If you did not change your password, use Forgot Password on the Fighter Portal immediately and contact CTC Management.`;
  }else if(type==='email_change_requested'){
   const next=String(body.new_email||'').trim();
   subject='CTC Fighter Portal Email Change Requested';
   headline='Email Change Requested';
   message=`A request was made to change your Couch To Cage Fighter Portal sign-in email.

Current email: ${email}
Requested new email: ${next||'Not provided'}

The sign-in email will not change until the required verification link is confirmed.

If you did not request this change, do not confirm it and contact CTC Management.`;
  }else if(type==='email_changed'){
   subject='Your CTC Fighter Portal Email Was Changed';
   headline='Email Changed Successfully';
   message=`Your Couch To Cage Fighter Portal sign-in email was changed successfully.

Your current login email is now:
${email}

Use this email the next time you sign in.

If you did not make this change, contact CTC Management immediately.`;
  }else return out(400,{error:'Unknown notification type'});
  const sent=await send({to:email,subject,headline,message});
  return out(200,{sent:true,id:sent.id});
 }catch(e){return out(400,{sent:false,error:e.message||String(e)})}
};
