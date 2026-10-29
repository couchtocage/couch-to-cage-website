/* Pure interface enhancement: steps are jump links, never hidden form panels.
   All controls remain visible to native required validation and to Netlify. */
(() => {
  const form = document.querySelector('form[name="ctc-fighter-registration"]');
  const nav = document.querySelector('.ctc-registration-steps');
  if (!form || !nav) return;
  const links = [...nav.querySelectorAll('a[href^="#ctc-step-"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  const label = document.getElementById('ctcActiveSectionLabel');
  const progress = document.getElementById('ctcRegistrationProgress');
  if (sections.some(section => !section)) return;
  let current = -1;
  function updateActive(index) {
    if (index === current || index < 0) return;
    current = index;
    links.forEach((link, i) => {
      link.classList.toggle('is-active', i === index);
      if (i === index) link.setAttribute('aria-current','step');
      else link.removeAttribute('aria-current');
    });
    if (label) label.textContent = `SECTION ${index+1} OF ${sections.length} · ${links[index].textContent.replace(/^\s*\d+\s*/, '').trim().toUpperCase()}`;
    if (progress) progress.style.width = `${(index+1)/sections.length*100}%`;
  }
  const updateFromScroll = () => {
    let active = 0;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= 200) active = i;
    }
    updateActive(active);
  };
  let pending = false;
  addEventListener('scroll', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; updateFromScroll(); });
  }, {passive:true});
  links.forEach((link, i) => link.addEventListener('click', () => updateActive(i)));
  updateFromScroll();
})();
