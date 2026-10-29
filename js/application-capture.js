import { supabase } from './supabase-config.js';

// Netlify is the durable submission channel (including uploaded photos).
// Supabase mirrors successful registrations into the live admin roster.
const form = document.querySelector('form[name="ctc-fighter-registration"]');
if (form) {
  const disciplineMap = {
    'MMA':'mma-record','Muay Thai':'muay-thai-record','Kickboxing':'kickboxing-record','Boxing':'boxing-record','BJJ / Grappling':'bjj-record'
  };
  function syncRecordFields(){
    const selected=new Set([...form.querySelectorAll('input[name="discipline"]:checked')].map(x=>x.value));
    for(const fieldset of form.querySelectorAll('[data-record-discipline]')){
      const active=selected.has(fieldset.dataset.recordDiscipline),prefix=disciplineMap[fieldset.dataset.recordDiscipline];
      fieldset.hidden=!active;fieldset.classList.toggle('ctc-record-selected',active);
      const debut=fieldset.querySelector(`input[name="${prefix}-debut"]`);
      if(debut)debut.disabled=!active;
      const isDebut=active&&debut?.checked;
      for(const part of ['wins','losses','draws']){const input=form.elements[`${prefix}-${part}`];if(!input)continue;input.disabled=!active||isDebut;input.required=active&&!isDebut;if(isDebut)input.value='0'}
    }
  }
  form.querySelectorAll('input[name="discipline"]').forEach(x=>x.addEventListener('change',syncRecordFields));
  form.querySelectorAll('[data-record-discipline] input[type="checkbox"]').forEach(x=>x.addEventListener('change',syncRecordFields));
  syncRecordFields();

  const fileToBase64=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(Error('Could not read headshot'));r.readAsDataURL(file)});
  async function prepareHeadshot(file){
    if(!file)throw Error('Headshot is required');
    if(file.size<=2.7*1024*1024)return {name:file.name,type:file.type||'image/jpeg',base64:await fileToBase64(file)};
    try{
      const object=URL.createObjectURL(file),img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=object});
      const max=1600,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(object);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not resize headshot')),'image/jpeg',.86));
      return {name:'ctc-headshot.jpg',type:'image/jpeg',base64:await fileToBase64(blob)};
    }catch{if(file.size<=3*1024*1024)return {name:file.name,type:file.type||'image/jpeg',base64:await fileToBase64(file)};throw Error('The headshot is too large to prepare. Choose a smaller photo and try again.')}
  }
  const button = form.querySelector('.submit-button');
  const label = button?.querySelector('.submit-label');
  const originalLabel = label?.textContent || 'Submit Fighter Registration';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.cssText = 'margin:12px 0;font-weight:700;line-height:1.5;';
  button?.insertAdjacentElement('afterend', status);
  let sending = false;
  let netlifyReceived = false;

  function setBusy(busy) {
    if (button) {
      button.disabled = busy || netlifyReceived;
      button.classList.toggle('is-loading', busy);
    }
    if (label) label.textContent = busy ? 'Submitting...' : (netlifyReceived ? 'Registration received' : originalLabel);
  }

  function bounded(promise, milliseconds, message) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), milliseconds);
      })
    ]).finally(() => clearTimeout(timer));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (sending || netlifyReceived) return;

    // Browser validation is normally performed before submit; discipline is a
    // checkbox group and needs a separate check before disabling the button.
    if (!form.reportValidity()) return;
    const selected = [...form.querySelectorAll('input[name="discipline"]:checked')];
    if (!selected.length) {
      status.textContent = 'Choose at least one fighting discipline.';
      form.querySelector('input[name="discipline"]')?.focus();
      return;
    }
    const recordNames = {'MMA':'mma-record','Muay Thai':'muay-thai-record','Kickboxing':'kickboxing-record','Boxing':'boxing-record','BJJ / Grappling':'bjj-record'};
    for (const discipline of selected.map(input => input.value)) {
      const prefix=recordNames[discipline];if(!prefix)continue;
      const debut=form.elements[`${prefix}-debut`]?.checked;
      const controls=['wins','losses','draws'].map(part=>form.elements[`${prefix}-${part}`]);
      if(!debut&&controls.some(input=>input.value===''||!Number.isInteger(Number(input.value))||Number(input.value)<0)){
        status.textContent=`Enter ${discipline} wins, losses and draws as whole numbers, or choose DEBUT.`;controls.find(input=>input.value==='')?.focus();return;
      }
    }

    const tapologyInput = form.querySelector('#ctcTapologyInput');
    const noTapology = form.querySelector('#ctcNoTapology')?.checked;
    const tapologyValue = String(tapologyInput?.value || '').trim();
    if (!noTapology) {
      let url;
      try { url = new URL(tapologyValue); } catch { /* show a form message below */ }
      if (!url || !['http:', 'https:'].includes(url.protocol) || !['tapology.com', 'www.tapology.com'].includes(url.hostname.toLowerCase()) || url.username || url.password) {
        status.textContent = 'Enter a valid Tapology profile link or select "I do not have a Tapology profile (N/A)".';
        tapologyInput?.focus();
        return;
      }
    }

    sending = true;
    setBusy(true);
    status.textContent = 'Sending your registration securely. Please wait...';
    const data = new FormData(form);
    // Preserve the explicit choice in both Netlify's form record and Supabase mirror.
    data.set('tapology-url', noTapology ? 'N/A' : tapologyValue);
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 25000);
    try {
      const response = await fetch(form.getAttribute('action') || '/', {
        method: 'POST',
        body: data,
        signal: abort.signal
      });
      if (!response.ok) throw new Error('Submission server returned ' + response.status);
      netlifyReceived = true;
    } catch (error) {
      // A timeout can happen after the server received the form: do not tell
      // the fighter to repeatedly submit without checking with CTC first.
      status.textContent = error?.name === 'AbortError'
        ? 'The request timed out. We could not confirm whether it was received. Please wait before trying again.'
        : 'We could not confirm your registration. Check your connection and try again.';
      sending = false;
      setBusy(false);
      return;
    } finally {
      clearTimeout(timeout);
    }

    const value = (key) => data.get(key);
    const optionalNumber = (key) => value(key) === '' || value(key) == null ? null : Number(value(key));
    const tapology = String(value('tapology-url') || '').trim();
    const payload = {
      first_name: value('first-name'), last_name: value('last-name'),
      email: value('email'), phone: value('phone'), city: value('city'), state: value('state'),
      date_of_birth: value('date-of-birth') || null, airport_miles: value('airport-miles'),
      height: value('height'), walk_around_weight: optionalNumber('walk-around-weight'),
      weight_class: value('weight-class'), fighter_level: value('fighter-level'),
      disciplines: selected.map((input) => input.value), gym: value('gym'),
      tapology_url: tapology,
      mma_record: data.get('mma-record-debut')==='yes'?'0-0-0':(['wins','losses','draws'].map(x=>value(`mma-record-${x}`)).every(x=>x!==''&&x!=null)?['wins','losses','draws'].map(x=>value(`mma-record-${x}`)).join('-'):null),
      muay_thai_record: data.get('muay-thai-record-debut')==='yes'?'0-0-0':(['wins','losses','draws'].map(x=>value(`muay-thai-record-${x}`)).every(x=>x!==''&&x!=null)?['wins','losses','draws'].map(x=>value(`muay-thai-record-${x}`)).join('-'):null),
      kickboxing_record: data.get('kickboxing-record-debut')==='yes'?'0-0-0':(['wins','losses','draws'].map(x=>value(`kickboxing-record-${x}`)).every(x=>x!==''&&x!=null)?['wins','losses','draws'].map(x=>value(`kickboxing-record-${x}`)).join('-'):null),
      boxing_record: data.get('boxing-record-debut')==='yes'?'0-0-0':(['wins','losses','draws'].map(x=>value(`boxing-record-${x}`)).every(x=>x!==''&&x!=null)?['wins','losses','draws'].map(x=>value(`boxing-record-${x}`)).join('-'):null),
      bjj_record: data.get('bjj-record-debut')==='yes'?'0-0-0':(['wins','losses','draws'].map(x=>value(`bjj-record-${x}`)).every(x=>x!==''&&x!=null)?['wins','losses','draws'].map(x=>value(`bjj-record-${x}`)).join('-'):null),
      mma_debut: data.get('mma-record-debut')==='yes',
      muay_thai_debut: data.get('muay-thai-record-debut')==='yes',
      kickboxing_debut: data.get('kickboxing-record-debut')==='yes',
      boxing_debut: data.get('boxing-record-debut')==='yes',
      bjj_debut: data.get('bjj-record-debut')==='yes',
      amateur_record: null, years_experience: optionalNumber('years-experience'),
      availability: value('availability'), fighting_background: value('fighting-background'),
      has_bloodwork: value('has-bloodwork'),
      bloodwork_completed_date: value('bloodwork-completed-date') || null,
      highlight_link: value('highlight-link'),
      referral_source: String(value('referral-source') || '').trim(),
      referral_details: String(value('referral-details') || '').trim() || null
    };
    payload.amateur_record=payload.mma_record||payload.muay_thai_record||payload.kickboxing_record||payload.boxing_record||payload.bjj_record||'0-0-0';
    // Netlify accepted the form and uploads. Supabase is a secondary mirror;
    // its failure must not strand fighters on an internal roster warning.
    try {
      const result = await bounded(supabase.from('applications').insert(payload).select('id').single(), 7000, 'Roster sync timed out');
      if (result?.error) throw result.error;
      const headshot=data.get('headshot');
      if(result?.data?.id && headshot instanceof File && headshot.size){
        status.textContent='Registration received. Connecting your headshot to your CTC profile…';
        const prepared=await prepareHeadshot(headshot);
        const uploaded=await bounded(fetch('/.netlify/functions/ctc-application-headshot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({application_id:result.data.id,email:payload.email,file:prepared})}),12000,'Headshot upload timed out');
        const out=await uploaded.json().catch(()=>({}));if(!uploaded.ok)throw Error(out.error||'Could not connect headshot');
      }
    } catch (error) {
      console.error('CTC roster mirror failed; check Netlify form submissions:', error);
    } finally {
      window.location.assign('/fighter-thank-you.html');
    }

  }, { capture: true });
}
