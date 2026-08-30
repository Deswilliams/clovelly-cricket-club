const toggle=document.querySelector('.menu-toggle');
toggle?.addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');toggle.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('menu-open')));
document.getElementById('year').textContent=new Date().getFullYear();
