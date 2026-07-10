const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav');

menuButton.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  });
});

document.getElementById('year').textContent = new Date().getFullYear();


const registrationForm = document.querySelector('.ctc-form');
if (registrationForm) {
  registrationForm.addEventListener('submit', () => {
    const submitButton = registrationForm.querySelector('.submit-button');
    if (submitButton) {
      submitButton.classList.add('is-loading');
      submitButton.disabled = true;
      const label = submitButton.querySelector('.submit-label');
      if (label) label.textContent = 'Submitting...';
    }
  });
}
