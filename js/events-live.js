import { supabase } from './supabase-config.js';

const list = document.querySelector('[data-live-events]');
const count = document.querySelector('[data-event-count]');
const countText = document.querySelector('[data-event-count-text]');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[char]));
}

function normalize(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseMatchupNotes(notes = '') {
  const lines = String(notes || '').split(/\r?\n/);
  const get = prefix => lines.find(line => line.startsWith(prefix))?.slice(prefix.length).trim() || '';
  return {
    matchupId: get('CTC_MATCHUP_ID:'),
    parentEventId: get('CTC_PARENT_EVENT_ID:'),
    matchup: get('MATCHUP:'),
    opponentRecord: get('OPPONENT_RECORD:'),
    weight: get('WEIGHT:'),
    eventName: get('EVENT:'),
    championshipBout: get('CTC_CHAMPIONSHIP_BOUT:') === '1'
  };
}

function isMatchupEvent(event) {
  return Boolean(parseMatchupNotes(event.notes).matchupId);
}

function findParentEvent(matchupEvent, baseEvents) {
  const meta = parseMatchupNotes(matchupEvent.notes);
  if (meta.parentEventId) {
    const direct = baseEvents.find(event => String(event.id) === String(meta.parentEventId));
    if (direct) return direct;
  }

  const sameDate = baseEvents.filter(event => String(event.event_date || '') === String(matchupEvent.event_date || ''));
  if (!sameDate.length) return null;
  if (sameDate.length === 1) return sameDate[0];

  const scored = sameDate.map(event => {
    let score = 0;
    if (normalize(event.promotion) && normalize(event.promotion) === normalize(matchupEvent.promotion)) score += 6;
    if (normalize(event.venue) && normalize(event.venue) === normalize(matchupEvent.venue)) score += 5;
    if (normalize(event.city) && normalize(event.city) === normalize(matchupEvent.city)) score += 2;
    if (normalize(event.state) && normalize(event.state) === normalize(matchupEvent.state)) score += 1;
    return { event, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].event : null;
}

function presetFor(name='') {
  const id=normalize(name).replace(/[^a-z0-9]/g,'');
  if (id.includes('flexfight')) return {key:'flex',logo:'assets/partners/flex-fight-series-new-user.png',name:'Flex Fight Series'};
  if (id.includes('combatnight')) return {key:'combat',logo:'assets/partners/combat-night.webp',name:'Combat Night'};
  if (id.includes('tuffnuff')) return {key:'tuff',logo:'assets/partners/tuff-n-uff.webp',name:'Tuff-N-Uff'};
  return {key:'custom',logo:'',name:String(name||'Promotion TBA')};
}
function eventNote(notes,key){return String(notes||'').split(/\r?\n/).find(x=>x.startsWith(key+':'))?.slice(key.length+1).trim()||''}
function eventTitle(event,preset){
 const series=eventNote(event.notes,'CTC_SERIES_NUMBER');
 const subtitle=eventNote(event.notes,'CTC_EVENT_TITLE');
 if(preset.key==='flex')return series||subtitle?`Flex Fight Series${series?' '+series:''}${subtitle?': '+subtitle:''}`:(event.promotion||'Flex Fight Series');
 return subtitle?`${event.promotion||'CTC Fight Card'}: ${subtitle}`:event.promotion||'CTC FIGHT NIGHT';
}
function formatWeight(value) {
  const raw=String(value??'').trim();
  if(!raw)return 'Weight TBA';
  return /\b(?:lb|lbs|kg)\b/i.test(raw)?raw:raw+' lbs';
}
function fighterPortrait(src,alt) {
  return `<div class="ctc-card-portrait">${src?`<img loading="lazy" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" onerror="this.hidden=true;this.parentElement.classList.add('portrait-missing')">`:`<span class="ctc-photo-missing">HEADSHOT<br>COMING SOON</span>`}</div>`;
}
function publicGym(value) {
  const gym=String(value??'').trim();
  // A roster placeholder is not a gym. Keep CTC membership independent of gym affiliation.
  return gym && !/^(?:n\s*\/?\s*a|not\s+provided|none|unknown|no\s+gym|tba|tbd|-)$/i.test(gym) ? gym : '';
}
function fighterSide(fighter, weight, discipline, opponent=false) {
  const location=[fighter.city,fighter.state].filter(Boolean).join(', ');
  const gym=publicGym(fighter.gym);
  const pro=/(?:^|\b)pro(?:fessional)?(?:$|\b)/i.test(fighter.fighterLevel||'') || (!fighter.fighterLevel && fighter.proRecord && fighter.proRecord!=='0-0-0');
  const records=pro?(fighter.proRecord?`PRO ${fighter.proRecord}`:''):(fighter.amateurRecord?`AM ${fighter.amateurRecord}`:'');
  const shownRecord=records||(fighter.record||'');
  return `<div class="ctc-card-side${opponent?' ctc-card-opponent':''}">
    ${fighterPortrait(fighter.headshot,`${fighter.name} headshot`)}
    <div class="ctc-card-fighter-copy"><strong>${escapeHtml(fighter.name||'CTC Fighter')}</strong>
      ${location?`<span class="ctc-fighter-city">${escapeHtml(location)}</span>`:''}
      ${gym?`<span class="ctc-fighter-gym">GYM · ${escapeHtml(gym)}</span>`:''}
      <span>${escapeHtml(shownRecord||'Record not listed')}</span>
      <span>${escapeHtml(formatWeight(weight||fighter.weight))}</span>
      <span class="ctc-card-discipline">${escapeHtml(discipline||'Discipline TBA')}</span>
    </div></div>`;
}
function formatMatchup(matchup, i) {
  const opponent=matchup.opponent;
  return `<div class="ctc-public-bout${opponent?' has-opponent':' solo-fighter'}">${matchup.championshipBout?'<div class="ctc-championship-strip">★ CHAMPIONSHIP BOUT</div>':''}
   ${fighterSide(matchup.fighter,matchup.weight,matchup.discipline)}
   <div class="ctc-card-center"><span class="ctc-bout-number">${opponent?'MATCHUP '+(i+1):'BOUT TBA'}</span>
   <span class="ctc-bout-discipline">${escapeHtml(matchup.discipline||'FIGHT DETAILS TBA')}</span>
   ${opponent?'<strong>VS</strong>':''}</div>
   ${opponent?fighterSide(opponent,matchup.weight,matchup.discipline,true):''}
  </div>`;
}
function formatFallbackMatchup(matchupEvent, i) {
  const meta=parseMatchupNotes(matchupEvent.notes);
  if(!meta.matchup)return '';
  const names=meta.matchup.split(/\s+vs\s+/i);
  return formatMatchup({fighter:{name:names[0]||meta.matchup},opponent:names[1]?{name:names.slice(1).join(' vs '),record:meta.opponentRecord}:null,weight:meta.weight,discipline:matchupEvent.discipline,championshipBout:meta.championshipBout},i);
}
function formatEvent(event, matchups = [], initiallyOpen=false, detailPage=false) {
  const date = new Date(`${event.event_date}T12:00:00`);
  const valid=!Number.isNaN(date.getTime());
  const month = valid?date.toLocaleDateString('en-US',{month:'short'}).toUpperCase():'TBA';
  const day = valid?date.toLocaleDateString('en-US',{day:'numeric'}):'—';
  const longDate=valid?date.toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'}):'Date to be announced';
  const location = [event.city,event.state].filter(Boolean).join(', ');
  const venue=event.venue||'Venue TBA';
  const status=(event.status||'planning').toUpperCase();
  const preset=presetFor(event.promotion);
  const title=eventTitle(event,preset);
  const series=eventNote(event.notes,'CTC_SERIES_NUMBER');
  const subtitle=eventNote(event.notes,'CTC_EVENT_TITLE');
  const headerTitle=preset.key==='flex'&&subtitle?`<span class="ctc-flex-title-main">Flex Fight Series${series?' '+escapeHtml(series):''}</span><span class="ctc-flex-title-sub">: ${escapeHtml(subtitle)}</span>`:escapeHtml(title);
  const time=eventNote(event.notes,'CTC_EVENT_TIME');
  const markup=matchups.map((m,i)=>m.fighter?formatMatchup(m,i):formatFallbackMatchup(m,i)).filter(Boolean).join('');
  const boutCount=matchups.length;
  const backLink=detailPage?'':`<a class="ctc-detail-link" href="fight-card.html?event=${encodeURIComponent(String(event.id))}" aria-label="View ${escapeHtml(title)} full fight card">VIEW FULL FIGHT CARD →</a>`;
  return `<details class="event-card ctc-event-fightcard ctc-promo-${preset.key}${detailPage?' ctc-detail-page':''}" ${initiallyOpen?'open':''}>
    <summary class="ctc-event-trigger" aria-label="Open ${escapeHtml(title)} event and fight card">
      <div class="ctc-fight-event-hero">
        <div class="ctc-promo-logo-wrap">${preset.logo?`<img class="ctc-card-promotion-logo" src="${escapeHtml(preset.logo)}" alt="${escapeHtml(preset.name)} logo" loading="lazy">`:`<img class="ctc-card-promotion-logo ctc-default-promo-logo" src="assets/ctc-logo-transparent.png" alt="Couch To Cage logo" loading="lazy">`}</div>
        <div class="ctc-event-hero-copy"><p class="ctc-hero-eyebrow">CTC FIGHT CALENDAR <span>•</span> ${escapeHtml(status)}</p><h3>${headerTitle}</h3>
          <p class="ctc-event-meta"><span>▣ ${escapeHtml(longDate)}</span><span>⌖ ${escapeHtml(location||'Location TBA')}</span></p><p class="ctc-event-venue">${escapeHtml(venue)}${time?` <span class="ctc-event-time">· ${escapeHtml(time)}</span>`:''}</p></div>
        <span class="ctc-corner-motto">BLEED BLUE.<br>TOUCH GOLD.</span>
        <div class="ctc-event-date-tile"><span>${escapeHtml(month)}</span><strong>${escapeHtml(day)}</strong></div>
      </div>
      <div class="ctc-event-openbar"><span>${boutCount?`${boutCount} CTC ${boutCount===1?'FIGHTER':'FIGHTERS'} ON THIS CARD`:'EVENT DETAILS & FIGHT CARD'}</span><span class="ctc-event-open-action">${detailPage?'FIGHT CARD BELOW':'TAP TO EXPAND'} <span aria-hidden="true" class="ctc-chevron">⌄</span></span></div>
    </summary>
    ${backLink}
    <div class="ctc-card-expanded">
      <div class="ctc-card-tabs" role="tablist" aria-label="${escapeHtml(title)} tabs"><button type="button" role="tab" aria-selected="true" class="is-current" data-card-tab="fights">FIGHT CARD</button><button type="button" role="tab" aria-selected="false" data-card-tab="info">EVENT INFO</button></div>
      <div class="ctc-card-panel ctc-panel-fights" role="tabpanel">
        ${markup?`<p class="ctc-card-section-label">OUR FIGHTERS · ${boutCount}</p>${markup}`:`<div class="ctc-no-bouts"><strong>FIGHT CARD TO BE ANNOUNCED</strong><p>No CTC fighter matchups have been published for this event yet.</p></div>`}
      </div>
      <div class="ctc-card-panel ctc-panel-info" role="tabpanel" hidden><p class="ctc-card-section-label">EVENT INFORMATION</p><dl><div><dt>PROMOTION</dt><dd>${escapeHtml(title)}</dd></div><div><dt>DATE</dt><dd>${escapeHtml(longDate)}</dd></div><div><dt>VENUE</dt><dd>${escapeHtml(venue)}</dd></div>${time?`<div><dt>TIME</dt><dd>${escapeHtml(time)}</dd></div>`:''}<div><dt>LOCATION</dt><dd>${escapeHtml(location||'TBA')}</dd></div>${event.discipline?`<div><dt>DISCIPLINE</dt><dd>${escapeHtml(event.discipline)}</dd></div>`:''}<div><dt>STATUS</dt><dd>${escapeHtml(status)}</dd></div></dl></div>
    </div>
  </details>`;
}
async function loadEvents() {
  if (!list) return;
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_published', true)
    .order('event_date', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('CTC events could not load from Supabase:', error.message);
    list.innerHTML='<div class="ctc-events-message">Upcoming fights could not load. Please refresh and try again.</div>';
    if(count)count.textContent='—';
    if(countText)countText.textContent='Unable to load the fight calendar right now.';
    return;
  }
  const now=new Date();
  const today=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
  const baseEvents = (data||[]).filter(event => !isMatchupEvent(event)
    &&(!event.event_date||String(event.event_date).slice(0,10)>=today)
    &&!['cancelled','closed','completed'].includes(normalize(event.status)));
  const matchupEvents = (data||[]).filter(event => isMatchupEvent(event));
  const grouped = new Map(baseEvents.map(event => [String(event.id), []]));

  matchupEvents.forEach(matchupEvent => {
    const parent = findParentEvent(matchupEvent, baseEvents);
    if (parent) grouped.get(String(parent.id))?.push(matchupEvent);
  });

  // Published matchup rows are public, but fighter profiles are read server-side and reduced
  // to public card fields only. Fall back to published matchup notes if this endpoint is offline.
  try {
    const response=await fetch('/.netlify/functions/ctc-public-fightcards',{cache:'no-store'});
    if(!response.ok)throw new Error('Fight-card details unavailable');
    const payload=await response.json();
    if(Array.isArray(payload.matchups)){
      for(const matchup of payload.matchups){
        if(grouped.has(String(matchup.parentEventId))){
          const rows=grouped.get(String(matchup.parentEventId));
          const position=rows.findIndex(row=>parseMatchupNotes(row.notes).matchupId===String(matchup.id));
          if(position>=0)rows[position]=matchup;
        }
      }
    }
  }catch(error){console.warn('Using CTC public matchup fallback:',error.message)}

  for(const rows of grouped.values())rows.sort((a,b)=>{
   const left=a.fighter?.name||parseMatchupNotes(a.notes).matchup;
   const right=b.fighter?.name||parseMatchupNotes(b.notes).matchup;
   return left.localeCompare(right);
  });
  const detailPage=Boolean(document.querySelector('[data-event-detail]'));
  const selectedId=new URLSearchParams(location.search).get('event');
  const visible=detailPage?baseEvents.filter(e=>String(e.id)===String(selectedId||'')):baseEvents;
  list.innerHTML=visible.length?visible.map((event,i)=>formatEvent(event,grouped.get(String(event.id))||[],detailPage||i===0,detailPage)).join(''):(detailPage?'<div class="ctc-events-message"><strong>FIGHT CARD NOT AVAILABLE</strong><p>This event may be unpublished, past its date, or the link may be incorrect. <a href="events.html">Back to Upcoming Fights</a></p></div>':'<div class="ctc-events-message"><strong>NO UPCOMING FIGHTS ANNOUNCED</strong><p>Check back soon for new CTC fight cards.</p></div>');
  if(count)count.textContent=String(baseEvents.length);
  if(countText)countText.innerHTML=`CTC currently has <strong>${baseEvents.length} upcoming fight ${baseEvents.length===1?'opportunity':'opportunities'}</strong> scheduled. Apply now to get matched!`;
  if(detailPage){document.title=(visible[0]?eventTitle(visible[0],presetFor(visible[0].promotion)):'Fight Card')+' | Couch To Cage';}
}

if(!document.querySelector('[data-admin-card-preview]'))loadEvents();
else window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='ctc-admin-card-preview')return;
 const card=event.data.card,items=event.data.matchups||[];
 if(!card||!list)return;
 list.innerHTML=formatEvent(card,items,true,true);
});

// One interaction for every dynamically loaded event card, including mobile.
list?.addEventListener('click',event=>{
 const summary=event.target.closest('.ctc-event-trigger');
 if(summary){
  event.preventDefault();
  if(!document.querySelector('[data-event-detail]')){
   const link=summary.closest('.ctc-event-fightcard')?.querySelector('.ctc-detail-link');
   if(link)location.assign(link.href);
  }
  return;
 }
 const tab=event.target.closest('[data-card-tab]');if(!tab)return;
 event.preventDefault();
 const card=tab.closest('.ctc-event-fightcard');if(!card)return;
 const info=tab.dataset.cardTab==='info';
 card.querySelector('.ctc-panel-fights').hidden=info;
 card.querySelector('.ctc-panel-info').hidden=!info;
 card.querySelectorAll('[data-card-tab]').forEach(button=>{
  const active=button===tab;button.classList.toggle('is-current',active);button.setAttribute('aria-selected',String(active));
 });
});
