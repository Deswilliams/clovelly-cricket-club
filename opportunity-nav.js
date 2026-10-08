const menuButton=document.querySelector('.menu-toggle');
menuButton.addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');menuButton.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.main-nav a').forEach(link=>link.addEventListener('click',()=>{document.body.classList.remove('menu-open');menuButton.setAttribute('aria-expanded','false');}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('menu-open')){document.body.classList.remove('menu-open');menuButton.setAttribute('aria-expanded','false');menuButton.focus();}});
