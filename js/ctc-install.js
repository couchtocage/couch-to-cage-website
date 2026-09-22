// Registered on the homepage, public pages and portals; install never requires access to private data.
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
let installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;document.querySelectorAll('[data-ctc-app-install]').forEach(el=>el.hidden=false)});
window.addEventListener('appinstalled',()=>{installPrompt=null;document.querySelectorAll('[data-ctc-app-install]').forEach(el=>el.hidden=true)});
document.querySelectorAll('[data-ctc-app-install]').forEach(el=>el.addEventListener('click',async()=>{if(installPrompt){const p=installPrompt;installPrompt=null;await p.prompt();await p.userChoice}else location.href='/install.html'}));
