const el=id=>document.getElementById(id);
const categories=['Front line bowler','Fill in bowler','Not a bowler'];
let participation;
function message(text){el('message').textContent=text;}
async function api(path,options={}){const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});const body=await response.json();if(!response.ok){const error=new Error(body.error||'Unable to load participation.');error.status=response.status;throw error;}return body;}
function draw(){
 const sort=el('sort').value;const players=[...participation.players].sort((a,b)=>sort==='batting'?b.batted-a.batted||b.top-a.top||a.name.localeCompare(b.name):sort==='name'?a.name.localeCompare(b.name):sort==='bowling'?(b.category==='Not a bowler'?-1:b.balls)-(a.category==='Not a bowler'?-1:a.balls)||a.name.localeCompare(b.name):b[sort]-a[sort]||a.name.localeCompare(b.name));
 el('players').replaceChildren();
 for(const p of players){const row=document.createElement('tr');for(const v of [p.name,p.batted,p.top,p.middle,p.lower,p.played,p.category,p.gamesBowled??'N/A',p.overs??'N/A']){const td=document.createElement('td');td.textContent=String(v);if(v==='N/A')td.className='na';if(v==='Not set')td.className='category-unset';row.append(td);}el('players').append(row);}
 const missing=participation.players.filter(p=>p.category==='Not set').length;
 el('missing-roles').textContent=missing?`${missing} player${missing===1?' still needs':'s still need'} a bowling category. Recorded bowling figures are shown until the category is set.`:'';
}
async function load(){
 message('Loading completed scorecards…');
 try{participation=await api('/api/participation');el('access').hidden=true;el('dashboard').hidden=false;el('logout').hidden=false;el('edit').hidden=participation.role!=='admin';
   el('coverage').textContent=`${participation.matches} completed matches · ${participation.players.length} named players`;
   el('updated').textContent=`Checked ${new Date(participation.updated).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:'Australia/Sydney'})}`;
   el('match-list').replaceChildren();for(const g of participation.games){const li=document.createElement('li');const a=document.createElement('a');a.href=g.source;a.target='_blank';a.rel='noopener';a.textContent=`${g.round} · ${g.date} · ${g.opponent}`;li.append(a);el('match-list').append(li);}draw();message(participation.matches?'':'No completed Second Grade scorecards are available yet.');
 }catch(e){el('dashboard').hidden=true;el('access').hidden=false;el('logout').hidden=true;message(e.status===401?'':e.message);}
}
el('login').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;try{await api('/api/participation-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:el('code').value})});el('code').value='';await load();}catch(e){message(e.message);}finally{button.disabled=false;}});
el('logout').addEventListener('click',async()=>{try{await api('/api/participation-logout',{method:'POST'});location.reload();}catch(e){message(e.message);}});
el('sort').addEventListener('change',draw);
el('edit').addEventListener('click',()=>{el('role-list').replaceChildren();for(const player of [...participation.players].sort((a,b)=>a.name.localeCompare(b.name))){const label=document.createElement('label');label.textContent=player.name;const select=document.createElement('select');select.dataset.player=player.id;select.required=true;const empty=document.createElement('option');empty.value='';empty.textContent='Choose role';select.append(empty);for(const category of categories){const o=document.createElement('option');o.value=category;o.textContent=category;select.append(o);}select.value=categories.includes(player.category)?player.category:'';label.append(select);el('role-list').append(label);}el('roles').hidden=false;el('roles').scrollIntoView({behavior:'smooth',block:'start'});});
el('cancel').addEventListener('click',()=>el('roles').hidden=true);
el('roles').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;try{const roles=Object.fromEntries([...el('role-list').querySelectorAll('select')].map(s=>[s.dataset.player,s.value]));await api('/api/participation-roles',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({roles})});el('roles').hidden=true;await load();message('Bowling roles saved.');}catch(e){message(e.message);}finally{button.disabled=false;}});
load();
