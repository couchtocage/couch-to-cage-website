import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
let handler,html='';const list={set innerHTML(x){html=x},get innerHTML(){return html},addEventListener(){}};
const context={
  supabase:{},
  document:{querySelector(s){if(s==='[data-live-events]')return list;if(s==='[data-admin-card-preview]')return {};return null;}},
  location:{origin:'https://couchtocage.com',search:''},
  window:{addEventListener(type,cb){if(type==='message')handler=cb}},
  URLSearchParams,URL,Date,console
};
const src=readFileSync(new URL('../js/events-live.js',import.meta.url),'utf8').replace(/^import \{ supabase \} from '\.\/supabase-config\.js';\s*/, '');
vm.runInNewContext(src,context,{filename:'events-live.js'});
assert.equal(typeof handler,'function');
const card={id:'event-one',event_date:'2026-11-06',promotion:'Flex Fight Series',city:'New York',state:'NY',venue:'TBA',status:'confirmed',notes:'CTC_SERIES_NUMBER:64'};
const f={name:'Jameson Webber',city:'New York',gym:'N/A',amateurRecord:'5-0-0',proRecord:'0-0-0',fighterLevel:'amateur'};
handler({origin:'https://couchtocage.com',data:{type:'ctc-admin-card-preview',card,matchups:[{fighter:f,championshipBout:true,weight:'135',discipline:'MMA'}]}});
assert.match(html,/1 CTC FIGHTER ON THIS CARD/);assert.match(html,/AM 5-0-0/);assert.doesNotMatch(html,/PRO 0-0-0/);assert.doesNotMatch(html,/GYM · N\/A/);assert.match(html,/CHAMPIONSHIP BOUT/);
console.log('PASS E: Admin preview uses public fight card, single amateur record, no gym N/A, championship label and correct fighter count');
const before=html;
handler({origin:'https://attacker.invalid',data:{type:'ctc-admin-card-preview',card,matchups:[]}});
assert.equal(html,before);
console.log('PASS F: previews refuse cross-origin messages');
handler({origin:'https://couchtocage.com',data:{type:'ctc-admin-card-preview',card,matchups:[{fighter:{...f,fighterLevel:'professional',proRecord:'2-1-0',gym:'Fight Capital'},championshipBout:false}]}});
assert.match(html,/PRO 2-1-0/);assert.doesNotMatch(html,/AM 5-0-0/);assert.match(html,/Fight Capital/);assert.doesNotMatch(html,/CHAMPIONSHIP BOUT/);
console.log('PASS G: professional fighters show only pro record; real gym displays; non-championship omits label');
