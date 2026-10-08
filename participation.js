import initialRoles from './participation-roles.js';
const TEAM_ID = '7d3bcbdf-9dd6-48ac-9540-446ad507b018';
const API = 'https://grassrootsapiproxy.cricket.com.au';
export const BOWLING_CATEGORIES = ['Front line bowler', 'Fill in bowler', 'Not a bowler'];
const named = name => typeof name === 'string' && name.trim() && !name.includes('*');
export function ballsFromOvers(overs) {
  const n = Number(overs); const whole = Math.floor(n); const balls = Math.round((n - whole) * 10);
  if (!Number.isFinite(n) || n < 0 || balls > 5) throw new Error('Invalid cricket overs');
  return whole * 6 + balls;
}
export function oversFromBalls(balls) { return `${Math.floor(balls / 6)}.${balls % 6}`; }
export function compareBattingOpportunity(a,b) {
  return b.batted-a.batted || b.top-a.top || a.name.localeCompare(b.name);
}
const dismissedTypes=new Set(['bowled','caught','caught and bowled','lbw','run out','stumped','hit wicket','obstructing the field','obstructing field','timed out','retired out','handled the ball','hit the ball twice']);
export function dismissalCount(bat){
 const type=String(bat.dismissalType||'').trim().toLowerCase();
 if(dismissedTypes.has(type))return 1;
 if(['not out','retired hurt','retired not out','retired','absent hurt','did not bat'].includes(type)||bat.dismissalTypeId===1)return 0;
 return null;
}
const statNumber=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;
export function aggregateParticipation(matches, roles = {}) {
  const players = new Map(); const games = [];
  for (const match of matches) {
    if (match.status !== 'COMPLETED') continue;
    const team = match.teams?.find(t => t.id === TEAM_ID);
    if (!team || !Array.isArray(team.players) || !Array.isArray(match.innings)) throw new Error('Incomplete scorecard');
    const battingInnings = match.innings.filter(i => i.battingTeamId === TEAM_ID);
    const bowlingInnings = match.innings.filter(i => i.battingTeamId !== TEAM_ID);
    games.push({round: match.round?.name, date: match.matchSchedule?.[0]?.startDateTime?.slice(0,10), opponent: match.teams.find(t=>t.id!==TEAM_ID)?.displayName, source: `https://play.cricket.com.au/match/${match.id}`});
    for (const player of team.players) {
      if (!named(player.name) || !player.participantId) continue;
      const id = player.participantId;
      if (!players.has(id)) players.set(id,{id,name:player.name,category:roles[id] || 'Not set',played:0,batted:0,gamesBatted:0,top:0,middle:0,lower:0,otherPositions:0,positionsMissing:0,gamesBowled:0,balls:0,seasonRuns:0,seasonDismissals:0,seasonWickets:0,seasonBattingIncomplete:false,seasonBowlingIncomplete:false});
      const total = players.get(id);
      const bats = battingInnings.flatMap(i=>i.batting||[]).filter(b=>b.participantId===id && b.dismissalType !== 'Did Not Bat');
      const bowls = bowlingInnings.flatMap(i=>i.bowling||[]).filter(b=>b.participantId===id);
      const balls = bowls.reduce((sum,b)=>sum+ballsFromOvers(b.oversBowled),0);
      // Club definition: a team listing, DNB entry or fielding entry alone is not a played match.
      if (bats.length || balls > 0) total.played++;
      total.batted += bats.length;
      if (bats.length) total.gamesBatted++;
      for(const bat of bats) {
        const runs=statNumber(bat.runsScored),out=dismissalCount(bat);
        if(runs===null||out===null)total.seasonBattingIncomplete=true;
        total.seasonRuns+=runs??0;total.seasonDismissals+=out??0;
        if (bat.batOrder >= 1 && bat.batOrder <= 5) total.top++;
        else if (bat.batOrder >= 6 && bat.batOrder <= 8) total.middle++;
        else if (bat.batOrder >= 9 && bat.batOrder <= 11) total.lower++;
        else if (bat.batOrder >= 12) total.otherPositions++;
        else total.positionsMissing++;
      }
      if (balls > 0) total.gamesBowled++;
      total.balls += balls;
      for(const bowl of bowls){const wickets=statNumber(bowl.wicketsTaken);if(wickets===null)total.seasonBowlingIncomplete=true;total.seasonWickets+=wickets??0;}
    }
  }
  return {matches:games.length,games,players:[...players.values()].map(p=>({...p,seasonBattingAverage:!p.seasonBattingIncomplete&&p.seasonDismissals?p.seasonRuns/p.seasonDismissals:null,seasonWickets:p.seasonBowlingIncomplete?null:p.seasonWickets,battedPct:p.played?p.gamesBatted/p.played:null,topPct:p.batted?p.top/p.batted:null,middlePct:p.batted?p.middle/p.batted:null,lowerPct:p.batted?p.lower/p.batted:null,gamesBowled:p.category==='Not a bowler'?null:p.gamesBowled,overs:p.category==='Not a bowler'?null:oversFromBalls(p.balls)})).sort(compareBattingOpportunity)};
}
async function readJson(url) {
  const response=await fetch(url,{headers:{Accept:'application/json'},cf:{cacheTtl:300,cacheEverything:true}});
  if(!response.ok)throw new Error('Scorecard service unavailable');
  return response.json();
}
function respond(data,status=200,headers={}){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow',...headers}});}
const enc=new TextEncoder();
async function hash(value){return new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value)));}
async function equalSecret(a,b){const x=await hash(a),y=await hash(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
async function key(secret){return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
const toBase64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const fromBase64 = s => Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
async function makeToken(role,secret){const payload=toBase64(enc.encode(JSON.stringify({role,expires:Date.now()+12*60*60*1000})));const sig=await crypto.subtle.sign('HMAC',await key(secret),enc.encode(payload));return `${payload}.${toBase64(new Uint8Array(sig))}`;}
async function session(request,env){
  try {const token=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ccc_participation='))?.slice(18);if(!token)return null;
    const [payload,sig]=token.split('.');const ok=await crypto.subtle.verify('HMAC',await key(env.PARTICIPATION_ADMIN_CODE),fromBase64(sig),enc.encode(payload));
    const claims=JSON.parse(new TextDecoder().decode(fromBase64(payload)));return ok && claims.expires>Date.now() && claims.role==='admin'?claims:null;
  } catch {return null;}
}
export async function participationRequest(request,env){
  const path=new URL(request.url).pathname;
  if(!path.startsWith('/api/participation'))return null;
  if(!env.PARTICIPATION_STORE)return respond({error:'The club dashboard is being set up. Please check back soon.'},503);
  if(path==='/api/participation-logout' && request.method==='POST')return respond({ok:true},200,{'Set-Cookie':'ccc_participation=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
  if(path==='/api/participation-login' && request.method==='POST'){
    if(!env.PARTICIPATION_ADMIN_CODE)return respond({error:'Administrator access is being set up.'},503);
    if(request.headers.get('Origin')!==new URL(request.url).origin)return respond({error:'Request rejected'},403);
    let body;try{body=await request.json();}catch{return respond({error:'Invalid request'},400);}
    if(typeof body.code!=='string' || body.code.length>256)return respond({error:'Invalid access code'},401);
    const admin=await equalSecret(body.code,env.PARTICIPATION_ADMIN_CODE);
    if(!admin)return respond({error:'That admin password was not recognised.'},401);
    return respond({role:'admin'},200,{'Set-Cookie':`ccc_participation=${await makeToken('admin',env.PARTICIPATION_ADMIN_CODE)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`});
  }
  const auth=env.PARTICIPATION_ADMIN_CODE?await session(request,env):null;
  if(path==='/api/participation-roles' && request.method==='PUT'){
    if(auth?.role!=='admin' || request.headers.get('Origin')!==new URL(request.url).origin)return respond({error:'Club administrator access is required.'},403);
    let body;try{body=await request.json();}catch{return respond({error:'Invalid role list'},400);}
    const entries=Object.entries(body.roles||{});if(entries.length>200 || entries.some(([id,role])=>!/^[a-f0-9-]{36}$/.test(id)||!BOWLING_CATEGORIES.includes(role)))return respond({error:'Choose a valid bowling category for each player.'},400);
    const existing=await env.PARTICIPATION_STORE.get('second-grade-roles','json')||{};
    await env.PARTICIPATION_STORE.put('second-grade-roles',JSON.stringify({...existing,...Object.fromEntries(entries)}));
    return respond({ok:true});
  }
  if(path==='/api/participation-career' && request.method==='GET'){
    const id=new URL(request.url).searchParams.get('player');
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id||''))return respond({error:'Invalid player'},400);
    try{
      const data=await readJson(`${API}/participants/players/${id}/summary-statistics?seasonId=&organisationId=&matchTypeId=&jsconfig=eccn%3Atrue`);
      if(!data||typeof data!=='object'||(!('battingAverage' in data)&&!('bowlingWickets' in data)))throw new Error('Incomplete statistics');
      return respond({id,battingAverage:statNumber(data.battingAverage),wickets:statNumber(data.bowlingWickets)});
    }catch{return respond({error:'Career statistics are temporarily unavailable.'},502);}
  }
  if(path==='/api/participation' && request.method==='GET'){
    try{
      const list=await readJson(`${API}/scores/teams/${TEAM_ID}/matches?jsconfig=eccn%3Atrue`);
      if(!Array.isArray(list.matches))throw new Error('Incomplete fixtures');
      const complete=list.matches.filter(m=>m.status==='COMPLETED').sort((a,b)=>(a.matchSchedule?.[0]?.startDateTime||'').localeCompare(b.matchSchedule?.[0]?.startDateTime||''));
      const scorecards=[];
      // Fetch in batches to respect Worker subrequest and service limits.
      for(let i=0;i<complete.length;i+=5){scorecards.push(...await Promise.all(complete.slice(i,i+5).map(m=>readJson(`${API}/scores/matches/${m.id}?responseModifier=includeScorecard&jsconfig=eccn%3Atrue`))));}
      const roles={...initialRoles,...(await env.PARTICIPATION_STORE.get('second-grade-roles','json')||{})};
      return respond({...aggregateParticipation(scorecards,roles),role:auth?.role==='admin'?'admin':'public',updated:new Date().toISOString()});
    }catch{return respond({error:'The latest scorecards could not be loaded. Please try again shortly.'},502);}
  }
  return respond({error:'Not found'},404);
}
