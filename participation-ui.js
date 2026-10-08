const el=id=>document.getElementById(id);
const categories=['Front line bowler','Fill in bowler','Not a bowler'];
let participation;
let sortColumn='batted',sortDirection='desc';
function message(text){el('message').textContent=text;}
const percentage=value=>value===null||value===undefined?'—':`${Math.round(value*100)}%`;
const orderFigure=(count,pct)=>`${count} (${percentage(pct)})`;
async function api(path,options={}){const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});const body=await response.json();if(!response.ok){const error=new Error(body.error||'Unable to load participation.');error.status=response.status;throw error;}return body;}
const average=value=>value===null||value===undefined||!Number.isFinite(Number(value))?'—':Number(value).toFixed(2);
const count=value=>value===null||value===undefined?'—':String(value);
const careerAverage=p=>p.careerStatus==='loaded'?average(p.careerBattingAverage):p.careerStatus==='unavailable'?'—':'…';
const careerWickets=p=>p.careerStatus==='loaded'?count(p.careerWickets):p.careerStatus==='unavailable'?'—':'…';
const careerRequests=new Map();
async function loadCareer(data){
 let next=0;
 async function worker(){while(next<data.players.length){const player=data.players[next++];
   try{if(!careerRequests.has(player.id))careerRequests.set(player.id,api(`/api/participation-career?player=${encodeURIComponent(player.id)}`));const stats=await careerRequests.get(player.id);if(stats.id!==player.id)throw new Error('Player mismatch');player.careerBattingAverage=stats.battingAverage;player.careerWickets=stats.wickets;player.careerStatus='loaded';}
   catch{player.careerStatus='unavailable';careerRequests.delete(player.id);}
 } }
 await Promise.all(Array.from({length:Math.min(4,data.players.length)},worker));
 if(participation===data){draw();const failed=data.players.filter(p=>p.careerStatus==='unavailable').length;el('career-status').textContent=failed?`Career figures are temporarily unavailable for ${failed} player${failed===1?'':'s'}. Season and participation figures are still shown.`:'';}
}
function node(tag,className,text){const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=String(text);return element;}
function valueForSort(player,column){
 if(column==='balls'||column==='gamesBowled')return player.category==='Not a bowler'?null:player[column];
 if(column==='careerBattingAverage'||column==='careerWickets')return player.careerStatus==='loaded'?player[column]:null;
 if(column==='category'&&player.category==='Not set')return null;
 return player[column]??null;
}
function comparePlayers(a,b){
 const x=valueForSort(a,sortColumn),y=valueForSort(b,sortColumn);
 if(x===null||y===null)return x===y?a.name.localeCompare(b.name):x===null?1:-1;
 const sign=sortDirection==='desc'?-1:1;
 const difference=typeof x==='string'?x.localeCompare(y):x-y;
 return sign*difference||(sortColumn==='batted'?sign*(a.top-b.top):0)||a.name.localeCompare(b.name);
}
function drawSort(){
 const textColumn=sortColumn==='name'||sortColumn==='category';
 for(const button of document.querySelectorAll('.column-sort')){
  const key=button.dataset.sort,active=key===sortColumn,isText=key==='name'||key==='category';
  button.parentElement.setAttribute('aria-sort',active?(sortDirection==='desc'?'descending':'ascending'):'none');
  button.querySelector('.sort-icon').textContent=active?(sortDirection==='desc'?'↓':'↑'):'↕';
  const next=active?(sortDirection==='desc'?'asc':'desc'):isText?'asc':'desc';
  button.setAttribute('aria-label',`Sort ${button.dataset.label}: ${isText?(next==='asc'?'A to Z':'Z to A'):(next==='desc'?'most first':'least first')}`);
 }
 const label=sortColumn==='batted'?'Batting opportunity':document.querySelector(`[data-sort="${sortColumn}"]`).dataset.label;
 el('sort-summary').textContent=`${label} · ${textColumn?(sortDirection==='asc'?'A–Z':'Z–A'):(sortDirection==='desc'?'most first':'least first')}`;
 el('reset-sort').hidden=sortColumn==='batted'&&sortDirection==='desc';
}
function draw(){
 const players=[...participation.players].sort(comparePlayers);
 drawSort();
 el('players').replaceChildren();
 for(const p of players){
  const row=node('tr');const values=[p.name,p.played,p.batted,percentage(p.battedPct),orderFigure(p.top,p.topPct),orderFigure(p.middle,p.middlePct),orderFigure(p.lower,p.lowerPct),p.category,p.gamesBowled??'N/A',p.overs??'N/A',average(p.seasonBattingAverage),careerAverage(p),count(p.seasonWickets),careerWickets(p)];
  values.forEach((v,index)=>{const td=node(index===0?'th':'td','',v);if(index===0)td.setAttribute('scope','row');
   if(v==='N/A')td.className='na';
   if(index===1)td.className='matches-cell';
   if(index===2)td.className='innings-cell';
   if(index>=3&&index<=6){td.className=`metric-cell ${['batted','top','middle','lower'][index-3]}-cell`;const track=node('span','table-track'),fill=node('span','table-fill');const pct=[p.battedPct,p.topPct,p.middlePct,p.lowerPct][index-3];track.setAttribute('aria-hidden','true');fill.style.width=`${Math.max(0,Math.min(100,(pct??0)*100))}%`;track.append(fill);td.append(track);}
   if(index===7){td.className='role-cell';td.textContent='';td.append(node('span',`table-role ${p.category==='Front line bowler'?'role-front':p.category==='Fill in bowler'?'role-fill':p.category==='Not set'?'category-unset':'role-none'}`,p.category));}
   if([6,9,11].includes(index))td.className+=' group-end';
   row.append(td);
  });el('players').append(row);
 }
 const missing=participation.players.filter(p=>p.category==='Not set').length;
 el('missing-roles').textContent=missing?`${missing} player${missing===1?' still needs':'s still need'} a bowling category. Recorded bowling figures are shown until the category is set.`:'';
 const ungrouped=participation.players.filter(p=>p.otherPositions||p.positionsMissing);
 el('other-positions').textContent=ungrouped.length?`Innings outside the order bands or with no recorded position: ${ungrouped.map(p=>`${p.name}: ${p.otherPositions+p.positionsMissing}`).join('; ')}. These remain in total batting innings but are not counted in the three order bands.`:'';
}
async function load(){
 message('Loading completed scorecards…');
 try{participation=await api('/api/participation');el('access').hidden=true;el('dashboard').hidden=false;el('logout').hidden=participation.role!=='admin';el('admin-login').hidden=participation.role==='admin';el('edit').hidden=participation.role!=='admin';
   el('summary-matches').textContent=String(participation.matches);el('summary-players').textContent=String(participation.players.filter(p=>p.played>0).length);el('summary-innings').textContent=String(participation.players.reduce((sum,p)=>sum+p.batted,0));
   el('coverage').textContent=`${participation.matches} completed matches · ${participation.players.length} named players`;
   el('updated').textContent=`Checked ${new Date(participation.updated).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:'Australia/Sydney'})}`;
   el('match-list').replaceChildren();for(const g of participation.games){const li=document.createElement('li');const a=document.createElement('a');a.href=g.source;a.target='_blank';a.rel='noopener';a.textContent=`${g.round} · ${g.date} · ${g.opponent}`;li.append(a);el('match-list').append(li);}draw();el('career-status').textContent=participation.players.length?'Loading career figures…':'';void loadCareer(participation);message(participation.matches?'':'No completed Second Grade scorecards are available yet.');
 }catch(e){el('dashboard').hidden=true;el('access').hidden=true;el('logout').hidden=true;el('admin-login').hidden=false;message(e.message);}
}
el('admin-login').addEventListener('click',()=>{el('access').hidden=!el('access').hidden;if(!el('access').hidden)el('code').focus();});
el('login').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;try{await api('/api/participation-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:el('code').value})});el('code').value='';await load();}catch(e){message(e.message);}finally{button.disabled=false;}});
el('logout').addEventListener('click',async()=>{try{await api('/api/participation-logout',{method:'POST'});location.reload();}catch(e){message(e.message);}});
document.querySelectorAll('.column-sort').forEach(button=>button.addEventListener('click',()=>{
 const column=button.dataset.sort;
 sortDirection=sortColumn===column?(sortDirection==='desc'?'asc':'desc'):(column==='name'||column==='category'?'asc':'desc');
 sortColumn=column;if(participation)draw();
}));
el('reset-sort').addEventListener('click',()=>{sortColumn='batted';sortDirection='desc';if(participation)draw();});
el('edit').addEventListener('click',()=>{el('role-list').replaceChildren();for(const player of [...participation.players].sort((a,b)=>a.name.localeCompare(b.name))){const label=document.createElement('label');label.textContent=player.name;const select=document.createElement('select');select.dataset.player=player.id;select.required=true;const empty=document.createElement('option');empty.value='';empty.textContent='Choose role';select.append(empty);for(const category of categories){const o=document.createElement('option');o.value=category;o.textContent=category;select.append(o);}select.value=categories.includes(player.category)?player.category:'';label.append(select);el('role-list').append(label);}el('roles').hidden=false;el('roles').scrollIntoView({behavior:'smooth',block:'start'});});
el('cancel').addEventListener('click',()=>el('roles').hidden=true);
el('roles').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;try{const roles=Object.fromEntries([...el('role-list').querySelectorAll('select')].map(s=>[s.dataset.player,s.value]));await api('/api/participation-roles',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({roles})});el('roles').hidden=true;await load();message('Bowling roles saved.');}catch(e){message(e.message);}finally{button.disabled=false;}});
load();
