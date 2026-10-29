import { supabase } from './supabase-config.js';

const FALLBACK=Array.from({length:14},(_,i)=>({
  id:`local-${i+1}`,
  image_url:`assets/gallery/ctc-family-${String(i+1).padStart(2,'0')}.webp`,
  caption:'',alt_text:`CTC Family photo ${i+1}`,category:'CTC Family',
  is_featured:i===1,is_published:true,sort_order:i
}));
const CATEGORIES=new Set(['Fight Nights','Weigh-Ins','Backstage','Fans','CTC Family']);
const grid=document.getElementById('ctcGalleryGrid');
const feature=document.getElementById('galleryFeature');
const empty=document.getElementById('galleryFilterEmpty');
const filters=document.getElementById('galleryCategoryFilters');
let photos=FALLBACK,category='All';
const safeSource=(value)=>{
  const s=String(value||'').trim();
  if(/^https:\/\//i.test(s))return s;
  if(/^assets\/[a-z0-9\/_ .-]+$/i.test(s)&&!s.includes('..'))return s;
  return 'assets/ctc-logo-exact.png';
};
const categoryName=val=>CATEGORIES.has(String(val))?String(val):'CTC Family';
function labelFor(item){return String(item.caption||item.alt_text||'CTC Family').trim().slice(0,150)}
function createCard(item,i){
  const btn=document.createElement('button');
  btn.type='button';btn.className='gallery-item ctc-gallery-card';
  btn.dataset.galleryIndex=String(i);btn.setAttribute('aria-label','Open '+labelFor(item));
  const pic=document.createElement('img');
  pic.src=safeSource(item.image_url);pic.alt=item.alt_text||item.caption||'CTC gallery photo';pic.loading='lazy';pic.decoding='async';
  const info=document.createElement('span');info.className='ctc-gallery-card-info';
  const categoryTag=document.createElement('span');categoryTag.className='ctc-gallery-card-category';categoryTag.textContent=categoryName(item.category);
  const name=document.createElement('strong');name.textContent=labelFor(item);
  info.append(categoryTag,name);
  if(item.location_label){const place=document.createElement('small');place.textContent=String(item.location_label).slice(0,100);info.append(place);}
  btn.append(pic,info);return btn;
}
function render(){
  const visible=photos.filter(p=>category==='All'||categoryName(p.category)===category);
  grid.replaceChildren(...visible.map((p,i)=>createCard(p,i)));
  empty.hidden=!!visible.length;
  if(visible.length){
    const chosen=visible.find(x=>x.is_featured)||visible[0];
    const banner=document.createElement('button');banner.type='button';banner.className='ctc-gallery-feature-button';
    banner.setAttribute('aria-label','Open featured photo: '+labelFor(chosen));
    const img=document.createElement('img');img.src=safeSource(chosen.image_url);img.alt='';img.decoding='async';
    const copy=document.createElement('span');copy.className='ctc-gallery-feature-copy';
    const eyebrow=document.createElement('small');eyebrow.textContent='FEATURED GALLERY';
    const title=document.createElement('strong');title.textContent=labelFor(chosen)==='CTC Family photo '+String(chosen.id).replace('local-','')?'CTC IN FOCUS':labelFor(chosen);
    const sub=document.createElement('span');sub.textContent='A closer look at the moments behind Couch To Cage';
    copy.append(eyebrow,title,sub);
    const arrow=document.createElement('span');arrow.className='ctc-gallery-feature-arrow';arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
    banner.append(img,copy,arrow);banner.addEventListener('click',()=>{
      const idx=visible.findIndex(x=>String(x.id)===String(chosen.id));
      grid.querySelectorAll('.gallery-item')[idx]?.click();
    });
    feature.replaceChildren(banner);feature.hidden=false;
  }else{feature.hidden=true;feature.replaceChildren();}
  // gallery-viewer.js uses the live .gallery-item selection; the selected subset is intentional.
  document.dispatchEvent(new CustomEvent('ctc:gallery-updated'));
}
['photosTab','videosTab'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>{document.getElementById('photosTab').setAttribute('aria-selected',String(id==='photosTab'));document.getElementById('videosTab').setAttribute('aria-selected',String(id==='videosTab'))}));
filters?.addEventListener('click',e=>{
  const btn=e.target.closest('button[data-category]');if(!btn)return;
  category=btn.dataset.category;
  filters.querySelectorAll('button').forEach(b=>{const yes=b===btn;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes))});
  render();
});
render();
try{
 const [{data,error},{data:layout}]=await Promise.all([
   supabase.from('gallery_items').select('id,image_url,caption,alt_text,sort_order,is_featured,is_published,category,location_label').eq('is_published',true).order('sort_order').order('id'),
   supabase.from('site_settings').select('setting_value').eq('setting_key','gallery_layout_template').maybeSingle()
 ]);
 if(error)throw error;
 if(Array.isArray(data))photos=data;
 const chosen=layout?.setting_value;
 if(['cinematic','editorial','classic'].includes(chosen))document.body.dataset.galleryTemplate=chosen;
 render();
}catch(err){console.warn('CTC Gallery: using local published photo fallback.',err);}
