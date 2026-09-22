const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('menu-open', isOpen);
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    });
  });
}

const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}


const registrationForm = document.querySelector('.ctc-form');

if (registrationForm) {
  registrationForm.addEventListener('submit', () => {
    const submitButton = registrationForm.querySelector('.submit-button');
    const label = submitButton?.querySelector('.submit-label');

    if (submitButton) {
      submitButton.classList.add('is-loading');
      submitButton.disabled = true;
    }
    if (label) label.textContent = 'Submitting...';
  });
}

// conditional bloodwork date field (does not alter native Netlify submission)
const bloodworkChoices = document.querySelectorAll('input[name="has-bloodwork"]');
const bloodworkDateField = document.getElementById('bloodworkDateField');
const bloodworkDate = document.getElementById('bloodworkDate');

if (bloodworkChoices.length > 0 && bloodworkDateField && bloodworkDate) {
  bloodworkChoices.forEach((choice) => {
    choice.addEventListener('change', () => {
      const needsDate = choice.checked && choice.value === 'Yes';
      bloodworkDateField.hidden = !needsDate;
      bloodworkDate.required = needsDate;
      if (!needsDate) bloodworkDate.value = '';
    });
  });
}

// full-screen gallery viewer (live gallery + arrows + mobile swipe)
const lightbox=document.getElementById('galleryLightbox'),lightboxImage=document.getElementById('lightboxImage');let currentGalleryIndex=0,touchStartX=null;
function galleryButtons(){return [...document.querySelectorAll('.gallery-item')]}
function showGalleryImage(index){const buttons=galleryButtons();if(!buttons.length||!lightbox||!lightboxImage)return;currentGalleryIndex=(index+buttons.length)%buttons.length;const img=buttons[currentGalleryIndex].querySelector('img');lightboxImage.src=img.currentSrc||img.src;lightboxImage.alt=img.alt||'Expanded CTC Family photo'}
function openGallery(index){showGalleryImage(index);lightbox.hidden=false;document.body.classList.add('lightbox-open')}
function closeGallery(){if(!lightbox)return;lightbox.hidden=true;document.body.classList.remove('lightbox-open');galleryButtons()[currentGalleryIndex]?.focus()}
if(lightbox&&lightboxImage){document.addEventListener('click',e=>{const g=e.target.closest('.gallery-item');if(g){openGallery(galleryButtons().indexOf(g));return}if(e.target.closest('.lightbox-close'))closeGallery();else if(e.target.closest('.lightbox-prev'))showGalleryImage(currentGalleryIndex-1);else if(e.target.closest('.lightbox-next'))showGalleryImage(currentGalleryIndex+1);else if(e.target===lightbox)closeGallery()});document.addEventListener('keydown',e=>{if(lightbox.hidden)return;if(e.key==='Escape')closeGallery();if(e.key==='ArrowLeft')showGalleryImage(currentGalleryIndex-1);if(e.key==='ArrowRight')showGalleryImage(currentGalleryIndex+1)});lightbox.addEventListener('touchstart',e=>touchStartX=e.changedTouches?.[0]?.clientX??null,{passive:true});lightbox.addEventListener('touchend',e=>{if(touchStartX==null)return;const dx=(e.changedTouches?.[0]?.clientX??touchStartX)-touchStartX;touchStartX=null;if(Math.abs(dx)>45)showGalleryImage(currentGalleryIndex+(dx<0?1:-1))},{passive:true})}

/* ---- Fighter map: drag to pan, scroll/pinch/buttons to zoom ---- */
(function initNetworkMap() {
  const viewport = document.querySelector('[data-map-viewport]');
  const stage = document.querySelector('[data-map-stage]');
  if (!viewport || !stage) return;

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  let scale = 1;
  let x = 0;
  let y = 0;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  function clampAndApply() {
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const maxX = 0;
    const maxY = 0;
    const minX = vw - vw * scale;
    const minY = vh - vh * scale;
    x = Math.min(maxX, Math.max(minX, x));
    y = Math.min(maxY, Math.max(minY, y));
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  function reset() {
    scale = 1;
    x = 0;
    y = 0;
    clampAndApply();
  }

  function zoomBy(factor, centerX, centerY) {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const cx = centerX ?? vw / 2;
    const cy = centerY ?? vh / 2;
    const prevScale = scale;
    scale *= factor;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    const ratio = scale / prevScale;
    x = cx - (cx - x) * ratio;
    y = cy - (cy - y) * ratio;
    clampAndApply();
  }

  viewport.addEventListener('pointerdown', (event) => {
    dragging = true;
    viewport.classList.add('is-dragging');
    startX = event.clientX;
    startY = event.clientY;
    originX = x;
    originY = y;
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    x = originX + (event.clientX - startX);
    y = originY + (event.clientY - startY);
    clampAndApply();
  });

  function endDrag(event) {
    dragging = false;
    viewport.classList.remove('is-dragging');
    if (event?.pointerId !== undefined && viewport.hasPointerCapture?.(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('pointerleave', () => { if (dragging) dragging = false; viewport.classList.remove('is-dragging'); });

  viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomBy(factor, cx, cy);
  }, { passive: false });

  // Pinch-to-zoom for touch devices
  let pinchStartDist = null;
  let pinchStartScale = 1;
  viewport.addEventListener('touchstart', (event) => {
    if (event.touches.length === 2) {
      const [a, b] = event.touches;
      pinchStartDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchStartScale = scale;
    }
  }, { passive: true });
  viewport.addEventListener('touchmove', (event) => {
    if (event.touches.length === 2 && pinchStartDist) {
      event.preventDefault();
      const [a, b] = event.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const rect = viewport.getBoundingClientRect();
      const cx = (a.clientX + b.clientX) / 2 - rect.left;
      const cy = (a.clientY + b.clientY) / 2 - rect.top;
      const targetScale = pinchStartScale * (dist / pinchStartDist);
      zoomBy(targetScale / scale, cx, cy);
    }
  }, { passive: false });
  viewport.addEventListener('touchend', () => { pinchStartDist = null; });

  document.querySelector('[data-map-zoom-in]')?.addEventListener('click', () => zoomBy(1.3));
  document.querySelector('[data-map-zoom-out]')?.addEventListener('click', () => zoomBy(1 / 1.3));
  document.querySelector('[data-map-reset]')?.addEventListener('click', reset);

  window.addEventListener('resize', clampAndApply);
  reset();
})();


// Keep the muted hero video looping inline on browsers that delay autoplay.
const ctcHeroVideo = document.querySelector('.ctc-hero-video');
if (ctcHeroVideo) {
  ctcHeroVideo.muted = true;
  ctcHeroVideo.defaultMuted = true;
  const startHeroVideo = () => ctcHeroVideo.play().catch(() => {});
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startHeroVideo, { once: true });
  } else {
    startHeroVideo();
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ctcHeroVideo.paused) startHeroVideo();
  });
}

// iOS Safari can retain a horizontal document offset even when overflow-x is hidden.
// Keep the site pinned to x = 0 while preserving normal vertical scrolling.
(function lockHorizontalDocumentScroll() {
  const resetX = () => {
    if (window.scrollX !== 0) {
      window.scrollTo(0, window.scrollY);
    }
    document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;
  };

  window.addEventListener('scroll', resetX, { passive: true });
  window.addEventListener('resize', resetX, { passive: true });
  window.addEventListener('orientationchange', resetX, { passive: true });
  document.addEventListener('DOMContentLoaded', resetX, { once: true });
  resetX();
})();
