import { supabase } from './supabase-config.js';
function esc(v=''){return String(v).replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
async function settings(){const {data}=await supabase.from('site_settings').select('*');return Object.fromEntries((data||[]).map(x=>[x.setting_key,x.setting_value]))}
(async()=>{const s=await settings();
 const set=(sel,val)=>{const e=document.querySelector(sel);if(e&&val)e.textContent=val};
 // Migrate the OLD gallery-themed home copy to the new airplane design, but leave
 // custom content edited through the Executive Website CMS fully supported.
 const plane=!!document.querySelector('.ctc-plane-home-hero');
 const planeDefault=(value,oldValue,newValue)=>plane&&String(value||'').trim().toUpperCase()===oldValue.toUpperCase()?newValue:value;
 set('[data-home-eyebrow]',planeDefault(s.home_eyebrow,'CTC FAMILY','TRAVEL · COMPETE · GROW'));
 set('[data-home-line1]',planeDefault(s.home_line1,'EVERY EVENT.','FIGHT OPPORTUNITIES'));
 set('[data-home-line2]',planeDefault(s.home_line2,'EVERY FIGHTER. EVERY MEMORY.','FROM CITY TO CITY.'));
 set('[data-home-description]',planeDefault(s.home_description,'See the people, fight nights, weigh-ins and moments that make Couch To Cage a family.','CTC connects amateur and professional fighters with fight opportunities across the country.'));
 set('[data-fighter-count]',s.fighter_count);
 const ann=document.querySelector('[data-home-announcement]');if(ann){ann.textContent=s.homepage_announcement||'';ann.hidden=!s.homepage_announcement}
 const email=document.querySelector('[data-contact-email]');if(email&&s.contact_email){email.textContent=s.contact_email;email.href=`mailto:${s.contact_email}`};set('[data-contact-intro]',s.contact_intro);
 [['instagram_url','instagram'],['tiktok_url','tiktok'],['twitch_url','twitch']].forEach(([k,n])=>{const a=document.querySelector(`[data-social="${n}"]`);if(a&&s[k])a.href=s[k]});
 try{const promos=JSON.parse(s.promotions||'[]');const grid=document.querySelector('[data-live-promotions]');if(grid&&promos.length)grid.innerHTML=promos.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(p=>`<article class="partner-card"><div class="partner-logo"><img src="${esc(p.logo_url)}" alt="${esc(p.name)} logo" loading="lazy"></div><h3>${esc(p.name)}</h3></article>`).join('')}catch{}
 try{const locs=JSON.parse(s.map_locations||'[]');const svg=document.querySelector('.network-overlay');if(svg&&locs.length){const home=locs[0];svg.querySelector('.route-lines').innerHTML=locs.slice(1).map(m=>`<line x1="${home.x}" y1="${home.y}" x2="${m.x}" y2="${m.y}"></line>`).join('');svg.querySelectorAll('.map-pulse').forEach(x=>x.remove());locs.forEach(m=>svg.insertAdjacentHTML('beforeend',`<g class="map-pulse" transform="translate(${m.x} ${m.y})"><circle class="pulse-ring" r="21"></circle></g>`))}}catch{}
})();