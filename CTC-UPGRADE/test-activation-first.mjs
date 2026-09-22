// Offline mocked REST regression for the September activation-first fight-card importer.
// Run: node CTC-UPGRADE/test-activation-first.mjs (does not call real Supabase).
import assert from 'node:assert/strict';
import handler from '../netlify/functions/ctc-admin-api.mjs';
process.env.SUPABASE_URL='https://mock.supabase.invalid';
process.env.SUPABASE_SECRET_KEY='mock-service-key';
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const makeFighter=(first_name,last_name,n,active=true)=>({id:uid(n),first_name,last_name,status:'active',auth_user_id:active?uid(100+n):null,gym:''});
const fighters=[makeFighter('Yusif','Thomas',1),makeFighter('Jeremiah','Parker Jones',2,false),makeFighter('Treve','Gielder',3,false),makeFighter('Brendan','Simpson',4),makeFighter('Ali','Kahzaal',5,false)];
let events=[],matchups=[],sequence=5000,createdFighters=0,updatedMatchups=0;
const clone=x=>JSON.parse(JSON.stringify(x));
globalThis.fetch=async(url,opts={})=>{
 const u=new URL(url),method=opts.method||'GET',body=opts.body?JSON.parse(opts.body):{};
 const reply=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
 if(u.pathname==='/auth/v1/user')return reply({id:uid(999)});
 const resource=u.pathname.split('/rest/v1/')[1]?.split('?')[0];
 if(resource==='admin_users')return reply([{user_id:uid(999)}]);
 const collections={fighters,events,fighter_matchups:matchups};
 const collection=collections[resource];
 if(!collection)return reply({error:'unexpected resource '+u.pathname},500);
 if(method==='GET')return reply(clone(collection));
 if(resource==='fighters'&&method==='POST')createdFighters++;
 if(resource==='fighter_matchups'&&method==='PATCH')updatedMatchups++;
 const exactId=u.searchParams.get('id')?.replace(/^eq\./,'');
 if(method==='PATCH'){
  const row=collection.find(item=>item.id===exactId);
  if(!row)return reply([],404);
  Object.assign(row,body);return reply([clone(row)]);
 }
 if(method==='POST'){
  const row={id:uid(++sequence),...body};collection.push(row);return reply([clone(row)]);
 }
 return reply({error:'unexpected method '+method},500);
};
const load=async date=>{
 const res=await handler(new Request(`https://ctc.test/.netlify/functions/ctc-admin-api?action=sync-oct-nov-cards`,{method:'POST',headers:{Authorization:'Bearer mock-token','Content-Type':'application/json'},body:JSON.stringify({date,preview:false})}));
 const result=await res.json();assert.equal(res.status,200,JSON.stringify(result));
 return result;
};
let result=await load('2026-10-24');
assert.equal(result.completed,2);assert.equal(result.missing.length,3);
assert.equal(createdFighters,0);assert.equal(matchups.length,2);
assert.equal(events.filter(e=>String(e.notes).includes('CTC_MATCHUP_ID:')).length,2);
console.log('PASS 1: two activated fighters published, three held, zero fighter profiles created');
fighters[1].auth_user_id=uid(102);fighters[2].auth_user_id=uid(103);
result=await load('2026-10-24');
assert.equal(result.completed,4);assert.deepEqual(result.missing,['Ali Kahzaal']);
assert.equal(matchups.length,4);assert.equal(createdFighters,0);
assert.equal(matchups.find(m=>m.fighter_id===uid(2)).fight_date,'2026-10-24');
console.log('PASS 2: Jeremiah Parker Jones alias and Treve attach to real activated IDs after activation');
const before=clone(matchups),updatesBefore=updatedMatchups;
result=await load('2026-10-24');assert.equal(result.completed,4);
assert.deepEqual(matchups,before);assert.equal(updatedMatchups,updatesBefore);
assert.equal(events.filter(e=>String(e.notes).includes('CTC_MATCHUP_ID:')).length,4);
console.log('PASS 3: clicking LOAD again does not duplicate fighters, matchups or overwrite bout edits');
fighters[4].auth_user_id=uid(105);result=await load('2026-10-24');
assert.equal(result.completed,5);assert.equal(result.missing.length,0);
assert.equal(matchups.length,5);assert.equal(createdFighters,0);
console.log('PASS 4: all five fighters attach after activation, with zero pending profile inserts');
// November's existing generic card must gain the official Flex 64 brand on LOAD.
fighters.push(makeFighter('Bradley','Terwilliger',31),makeFighter('Jameson','Webber',32),makeFighter('Brian','Tracy',33));
const oldGeneric={id:uid(4700),event_date:'2026-11-06',city:'New York',state:'NY',venue:'TBA',promotion:'Promotion TBA',notes:'CTC_ROSTER_CARD:2026-11-06\nCTC_SERIES_NUMBER:OLD',is_published:true};
events.push(oldGeneric);
result=await load('2026-11-06');
assert.equal(result.completed,3);
assert.equal(oldGeneric.promotion,'Flex Fight Series');
assert.match(oldGeneric.notes,/CTC_SERIES_NUMBER:64/);
assert.doesNotMatch(oldGeneric.notes,/CTC_SERIES_NUMBER:OLD/);
assert.equal(oldGeneric.venue,'TBA');
console.log('PASS 5: November generic existing card updates to official Flex Series 64, venue TBA');
