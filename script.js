const toggle = document.querySelector('.menu-toggle');
const closeMenu = () => {
  document.body.classList.remove('menu-open');
  toggle?.setAttribute('aria-expanded', 'false');
};
toggle?.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  toggle.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const clubTeams = [
  { id: '7461ed7c-4161-409b-b588-7504d4267b8b', name: 'Clovelly Cricket Club 1', grade: '2nd Grade' },
  { id: '838e7720-1522-4ba9-9b43-183748464458', name: 'Clovelly Cricket Club 2', grade: '4th Grade' }
];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const matchDate = game => Date.parse(game.scheduled?.[0]?.dateTime || '') || 0;
const safeMatchUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && /(^|\.)playhq\.com$/.test(url.hostname) ? url.href : null; }
  catch { return null; }
};
async function fetchJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Match feed unavailable');
  return response.json();
}
function normaliseRawFixtures(feeds) {
  return feeds.flatMap(feed => {
    const team = clubTeams.find(t => t.name === feed.team);
    if (!team || feed.status !== 200) return [];
    return (feed.data?.rounds || []).flatMap(round => (round.games || [])
      .filter(game => game.teams?.some(t => t.id === team.id))
      .map(game => ({teamId:team.id, grade:team.grade, round:round.name, status:game.status,
        scheduled:game.schedule || [], opponent:game.teams.find(t => t.id !== team.id)?.name || 'Opponent details on PlayHQ',
        clovellyOutcome:game.teams.find(t => t.id === team.id)?.outcome, playhqUrl:game.url})));
  });
}
function gameCard(game, kind = 'result') {
  const date = matchDate(game);
  const dateText = date ? new Date(date).toLocaleString('en-AU', {timeZone:'Australia/Sydney', weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}) : 'Date to be confirmed';
  const labels = {WON:'Won',LOST:'Lost',DRAW:'Draw',DRAWN:'Draw',TIED:'Tie'};
  const status = game.status === 'FINAL' ? (labels[game.clovellyOutcome] || 'Final') : ({UPCOMING:'Upcoming',LIVE:'In progress',ABANDONED:'Abandoned',CANCELLED:'Cancelled'}[game.status] || 'See match details');
  const link = safeMatchUrl(game.playhqUrl);
  const statusClass = game.clovellyOutcome === 'WON' ? ' won' : game.clovellyOutcome === 'LOST' ? ' lost' : '';
  const dateMarkup = date ? `<time datetime="${new Date(date).toISOString()}">${escapeHTML(dateText)}</time>` : escapeHTML(dateText);
  return `<article class="fixture-card fixture-${kind}"><p class="fixture-grade"><span class="fixture-round">${escapeHTML(game.round)}</span><span class="fixture-status${statusClass}">${escapeHTML(status)}</span></p><h4>${kind === 'next' ? 'Clovelly v ' : 'v '}${escapeHTML(game.opponent || 'Opponent details on PlayHQ')}</h4><p>${dateMarkup}</p>${game.venue ? `<p>${escapeHTML(game.venue)}</p>` : ''}${link ? `<a href="${escapeHTML(link)}" target="_blank" rel="noopener">Match details →</a>` : ''}</article>`;
}
async function loadClovellyFixtures() {
  const container = document.getElementById('live-fixtures');
  if (!container) return;
  try {
    let games;
    try {
      const data = await fetchJSON('/api/clovelly-fixtures');
      games = Array.isArray(data) ? data : (data.games || []);
      if (!games.length) throw new Error('Empty cleaned feed');
    } catch {
      games = normaliseRawFixtures(await fetchJSON('/api/playhq-fixtures'));
    }
    if (!games.length) throw new Error('No matches returned');
    container.innerHTML = `<div class="teams-grid">${clubTeams.map(team => {
      const matches = games.filter(game => game.teamId === team.id || game.grade === team.grade);
      const upcoming = matches.filter(game => game.status === 'UPCOMING' && (!matchDate(game) || matchDate(game) >= Date.now() - 86400000)).sort((a,b) => matchDate(a)-matchDate(b)).slice(0,1);
      const results = matches.filter(game => game.status === 'FINAL').sort((a,b) => matchDate(b)-matchDate(a)).slice(0,1);
      return `<article class="team-fixtures"><header class="team-header"><div><h3>Clovelly</h3><p>2026/27 season</p></div><span class="grade-badge">${team.grade}</span></header><div class="team-content"><div class="fixture-block"><h3 class="fixture-block-title">Next match</h3>${upcoming.length ? upcoming.map(game => gameCard(game, 'next')).join('') : '<p class="no-matches">Check PlayHQ for the next scheduled match.</p>'}</div><div class="fixture-block"><h3 class="fixture-block-title">Latest result</h3>${results.length ? results.map(game => gameCard(game, 'result')).join('') : '<p class="no-matches">Results will appear here after play.</p>'}</div></div></article>`;
    }).join('')}</div>`;
  } catch {
    container.innerHTML = '<p class="fixtures-message">Follow our 2nd Grade and 4th Grade teams. <a href="https://ca.playhq.com/org/42286367-02b6-46d5-9a98-e744385639ef/games" target="_blank" rel="noopener">View fixtures &amp; results on PlayHQ →</a></p>';
  }
}
loadClovellyFixtures();
