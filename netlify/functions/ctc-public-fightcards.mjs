// Public, read-only fighter card data. Service credentials remain server-side.
const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const env=()=>({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY});
async function rest(path){const {url,key}=env();if(!url||!key)throw new Error('CTC fight-card service not configured');const r=await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})}});if(!r.ok)throw new Error(`CTC fight-card service (${r.status})`);return await r.json()}
const line=(notes,prefix)=>String(notes||'').split(/\r?\n/).find(x=>x.startsWith(prefix))?.slice(prefix.length).trim()||'';
const cleanUrl=value=>{try{const u=new URL(String(value||''));return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
export default async req=>{try{
 if(req.method!=='GET')return respond(405,{error:'Method not allowed'});
 const events=await rest('events?select=id,is_published,notes,discipline,event_date&is_published=eq.true');
 const parents=new Map(events.filter(e=>!line(e.notes,'CTC_MATCHUP_ID:')).map(e=>[String(e.id),e]));
 const publicRows=events.filter(e=>line(e.notes,'CTC_MATCHUP_ID:')&&parents.has(line(e.notes,'CTC_PARENT_EVENT_ID:')));
 if(!publicRows.length)return respond(200,{matchups:[]});
 const ids=[...new Set(publicRows.map(e=>line(e.notes,'CTC_MATCHUP_ID:')).filter(id=>/^[0-9a-f-]{36}$/i.test(id)))];
 if(!ids.length)return respond(200,{matchups:[]});
 const rows=await rest(`fighter_matchups?select=id,fighter_id,opponent_name,opponent_record,contracted_weight,discipline,status,notes&`+`id=in.(${ids.join(',')})`);
 const fightersIds=[...new Set(rows.map(m=>m.fighter_id).filter(id=>/^[0-9a-f-]{36}$/i.test(String(id))))];
 const fighters=fightersIds.length?await rest(`fighters?select=*&`+`id=in.(${fightersIds.join(',')})`):[];
 const byMatch=new Map(rows.map(m=>[String(m.id),m])),byFighter=new Map(fighters.map(f=>[String(f.id),f]));
 const matchups=publicRows.map(event=>{
  const m=byMatch.get(line(event.notes,'CTC_MATCHUP_ID:'));
  const f=m&&byFighter.get(String(m.fighter_id));
  if(!m||!f)return null;
  const parentId=line(event.notes,'CTC_PARENT_EVENT_ID:');
  const parent=parents.get(parentId);
  const photoLine=String(m.opponent_name||'')?line(m.notes,'CTC_OPPONENT_PHOTO_URL:'):'';
  const opponentPhoto=cleanUrl(photoLine||String(event.notes||'').split(/\r?\n/).find(x=>x.startsWith('OPPONENT_PHOTO_URL:'))?.slice(19).trim()||'');
  return {parentEventId:parentId,id:String(m.id),championshipBout:line(m.notes,'CTC_CHAMPIONSHIP_BOUT:')==='1',status:m.status||'',weight:m.contracted_weight||f.target_weight||f.current_weight||'',gym:String(f.gym||'').trim(),discipline:m.discipline||parent?.discipline||(Array.isArray(f.disciplines)?f.disciplines.join(', '):f.disciplines)||'',fighter:{name:[f.first_name,f.nickname?`“${f.nickname}”`:'',f.last_name].filter(Boolean).join(' '),city:f.city||f.hometown||'',state:f.state||'',headshot:cleanUrl(f.headshot_url),gym:String(f.gym||'').trim(),amateurRecord:[f.amateur_wins,f.amateur_losses,f.amateur_draws].every(x=>x==null)?'':[f.amateur_wins||0,f.amateur_losses||0,f.amateur_draws||0].join('-'),proRecord:[f.pro_wins,f.pro_losses,f.pro_draws].every(x=>x==null)?'':[f.pro_wins||0,f.pro_losses||0,f.pro_draws||0].join('-'),weight:f.target_weight||f.current_weight||'',fighterLevel:String(f.fighter_level||f.level||'').trim()},opponent:m.opponent_name?{name:m.opponent_name,record:m.opponent_record||'',headshot:opponentPhoto}:null};
 }).filter(Boolean);
 return respond(200,{matchups});
 }catch(e){return respond(503,{error:e.message||'Fight-card service unavailable'})}};
