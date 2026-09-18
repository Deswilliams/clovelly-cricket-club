const toggle=document.querySelector('.menu-toggle');
toggle?.addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');toggle.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('menu-open')));
document.getElementById('year').textContent=new Date().getFullYear();


// Live Clovelly fixtures and results
async function loadClovellyFixtures() {
  const container = document.getElementById("live-fixtures");
  if (!container) return;

  try {
    const response = await fetch("/api/clovelly-fixtures");
    if (!response.ok) throw new Error("Unable to load fixtures");

   const data = await response.json();
const games = Array.isArray(data) ? data : (data.games || []);
    if (!games.length) {
      container.innerHTML = "<p>No fixtures are currently available.</p>";
      return;
    }

    const results = games.filter(game => game.status === "FINAL");
    const upcoming = games.filter(game => game.status !== "FINAL");

    const gameCard = (game, isResult = false) => {
      let resultText = "";

      if (isResult) {
        if (game.clovellyOutcome === "WON") resultText = "Won";
        else if (game.clovellyOutcome === "LOST") resultText = "Lost";
        else resultText = "Final";
      } else {
        resultText = "Upcoming";
      }

      const dateText = game.scheduled
        ? new Date(game.scheduled).toLocaleString("en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })
        : "";

      return `
        <article class="fixture-card">
          <p class="fixture-grade">${game.grade || ""}</p>
          <h3>${game.round || ""}</h3>
          <p><strong>${resultText}</strong> vs ${game.opponent || "Opponent TBC"}</p>
          ${dateText ? `<p>${dateText}</p>` : ""}
          ${game.venue ? `<p>${game.venue}</p>` : ""}
          ${game.playhqUrl
            ? `<a href="${game.playhqUrl}" target="_blank" rel="noopener">View match on PlayHQ →</a>`
            : ""}
        </article>
      `;
    };

    container.innerHTML = `
      <div class="fixtures-group">
        <h3>Upcoming Matches</h3>
        <div class="fixtures-grid">
          ${upcoming.length
            ? upcoming.map(game => gameCard(game)).join("")
            : "<p>No upcoming matches.</p>"}
        </div>
      </div>

      <div class="fixtures-group">
        <h3>Recent Results</h3>
        <div class="fixtures-grid">
          ${results.length
            ? results.map(game => gameCard(game, true)).join("")
            : "<p>No recent results.</p>"}
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Fixtures error:", error);
    container.innerHTML =
      "<p>Fixtures and results are temporarily unavailable. Please view them on PlayHQ.</p>";
  }
}

loadClovellyFixtures();
