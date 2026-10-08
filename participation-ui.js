const el=id=>document.getElementById(id);
const categories=['Front line bowler','Fill in bowler','Not a bowler'];
let participation;
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
function renderCards(players){
 el('player-cards').replaceChildren();
 for(const p of players){
  const card=node('article','player-card'),head=node('div','player-card-head'),identity=node('div');
  head.append(node('span','player-initials',p.name.split(/\s+/).filter(Boolean).map(n=>n[0]).slice(0,2).join('')));
  identity.append(node('h2','',p.name),node('span',`role-badge ${p.category==='Front line bowler'?'role-front':p.category==='Fill in bowler'?'role-fill':''}`,p.category));head.append(identity);card.append(head);
  const stats=node('div','card-stats');for(const [value,label] of [[p.batted,'Batting innings'],[p.played,'Matches played']]){const stat=node('div','card-stat');stat.append(node('strong','',value),node('span','',label));stats.append(stat);}card.append(stats);
  const metric=node('div','metric-heading');metric.append(node('span','','Matches played → batted'),node('strong','',percentage(p.battedPct)));card.append(metric);
  const track=node('div','batted-track'),fill=node('span','batted-fill');fill.style.width=`${Math.max(0,Math.min(100,(p.battedPct??0)*100))}%`;track.setAttribute('aria-hidden','true');track.append(fill);card.append(track);
  card.append(node('div','metric-heading','Where they batted'));
  const stack=node('div','order-stack');stack.setAttribute('aria-hidden','true');
  const bands=[['top','Top 5',p.top,p.topPct],['middle','6–8',p.middle,p.middlePct],['lower','9–11',p.lower,p.lowerPct]];
  for(const [band,,count] of [...bands,['other','Other',(p.otherPositions||0)+(p.positionsMissing||0)]]){const segment=node('span',`band-${band}`);segment.style.width=`${p.batted?count/p.batted*100:0}%`;stack.append(segment);}card.append(stack);
  const labels=node('div','card-order-labels');for(const [,label,count,pct] of bands){const band=node('div');band.append(node('span','',label),node('strong','',orderFigure(count,pct)));labels.append(band);}card.append(labels);
  const ungrouped=(p.otherPositions||0)+(p.positionsMissing||0);if(ungrouped)card.append(node('p','card-ungrouped',`${ungrouped} innings outside these bands or with no recorded position.`));
  const performance=node('table','card-performance');const caption=node('caption','','Batting average & wickets');performance.append(caption);
  const heading=node('tr');for(const [tag,label] of [['th',''],['th','This season'],['th','Career']]){const cell=node(tag,'',label);cell.setAttribute('scope','col');heading.append(cell);}const thead=node('thead');thead.append(heading);performance.append(thead);
  const tbody=node('tbody');for(const [label,season,career] of [['Batting avg',average(p.seasonBattingAverage),careerAverage(p)],['Wickets',count(p.seasonWickets),careerWickets(p)]]){const row=node('tr'),title=node('th','',label);title.setAttribute('scope','row');row.append(title,node('td','',season),node('td','',career));tbody.append(row);}performance.append(tbody);card.append(performance);
  if(p.careerStatus==='unavailable')card.append(node('p','card-ungrouped','Career figures temporarily unavailable.'));
  const bowling=node('div','card-bowling');bowling.append(node('span','',p.category==='Not a bowler'?'Bowling: N/A':`${p.gamesBowled??0} games bowled`),node('span','',p.category==='Not a bowler'?'':`${p.overs??'0'} overs`));card.append(bowling);el('player-cards').append(card);
 }
}
function setView(view){const cards=view==='cards';el('player-cards').hidden=!cards;el('table-view').hidden=cards;el('view-cards').setAttribute('aria-pressed',String(cards));el('view-table').setAttribute('aria-pressed',String(!cards));}

function draw(){
 const sort=el('sort').value;const players=[...participation.players].sort((a,b)=>sort==='batting'?b.batted-a.batted||b.top-a.top||a.name.localeCompare(b.name):sort==='name'?a.name.localeCompare(b.name):sort==='bowling'?(b.category==='Not a bowler'?-1:b.balls)-(a.category==='Not a bowler'?-1:a.balls)||a.name.localeCompare(b.name):b[sort]-a[sort]||a.name.localeCompare(b.name));
 renderCards(players);
 el('players').replaceChildren();
 for(const p of players){const row=document.createElement('tr');for(const v of [p.name,p.batted,percentage(p.battedPct),orderFigure(p.top,p.topPct),orderFigure(p.middle,p.middlePct),orderFigure(p.lower,p.lowerPct),p.played,p.category,p.gamesBowled??'N/A',p.overs??'N/A',average(p.seasonBattingAverage),careerAverage(p),count(p.seasonWickets),careerWickets(p)]){const td=document.createElement('td');td.textContent=String(v);if(v==='N/A')td.className='na';if(v==='Not set')td.className='category-unset';row.append(td);}el('players').append(row);}
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
el('sort').addEventListener('change',draw);
el('view-cards').addEventListener('click',()=>setView('cards'));
el('view-table').addEventListener('click',()=>setView('table'));
el('edit').addEventListener('click',()=>{el('role-list').replaceChildren();for(const player of [...participation.players].sort((a,b)=>a.name.localeCompare(b.name))){const label=document.createElement('label');label.textContent=player.name;const select=document.createElement('select');select.dataset.player=player.id;select.required=true;const empty=document.createElement('option');empty.value='';empty.textContent='Choose role';select.append(empty);for(const category of categories){const o=document.createElement('option');o.value=category;o.textContent=category;select.append(o);}select.value=categories.includes(player.category)?player.category:'';label.append(select);el('role-list').append(label);}el('roles').hidden=false;el('roles').scrollIntoView({behavior:'smooth',block:'start'});});
el('cancel').addEventListener('click',()=>el('roles').hidden=true);
el('roles').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;try{const roles=Object.fromEntries([...el('role-list').querySelectorAll('select')].map(s=>[s.dataset.player,s.value]));await api('/api/participation-roles',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({roles})});el('roles').hidden=true;await load();message('Bowling roles saved.');}catch(e){message(e.message);}finally{button.disabled=false;}});
load();
