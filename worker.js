const PLAYERS = {
  nathan: "3a54926b-c415-42f0-9dd0-e98c9a0ebfc8",
  rodney: "926c8c2c-b8f5-4296-9b88-1af41fbbb3f5",
  john: "86b390ce-03eb-42f6-8c8f-b809ac342c0e",
  des: "36c7996d-68f5-4a59-8190-b12644c25ff9",
  tony: "263f2221-8c45-492c-aeac-9bc5b0f938fe",
  william: "7aebcc06-ad36-4ec8-b83b-0e70bfb6e3f0",
  bulent: "0cc9c5d6-762f-4c0a-b458-f7c569bcbf4a",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Example:
    // /api/player-stats?player=des
    if (url.pathname === "/api/player-stats") {
      const playerKey = url.searchParams.get("player");

      if (!playerKey || !PLAYERS[playerKey]) {
        return Response.json(
          {
            error: "Unknown player",
            availablePlayers: Object.keys(PLAYERS),
          },
          { status: 400 }
        );
      }

     const playerId = PLAYERS[playerKey];

const scope = (url.searchParams.get("scope") || "career").toLowerCase();

const organisationId =
  scope === "clovelly"
    ? "a80dffbf-86d8-eb11-a7ad-2818780da0cc"
    : "";

const apiUrl =
  `https://grassrootsapiproxy.cricket.com.au/participants/players/${playerId}` +
  `/summary-statistics?seasonId=&organisationId=${organisationId}&matchTypeId=&jsconfig=eccn%3Atrue`;

      try {
        const response = await fetch(apiUrl, {
          headers: {
            Accept: "application/json",
          },
          cf: {
            cacheTtl: 3600,
            cacheEverything: true,
          },
        });

        if (!response.ok) {
          return Response.json(
            {
              error: "Unable to retrieve player statistics",
              status: response.status,
            },
            { status: 502 }
          );
        }

        const data = await response.json();

const stats = {
  player: playerKey,
  matches: data.matches ?? 0,
  runs: data.battingAggregate ?? 0,
  wickets: data.bowlingWickets ?? 0,
  catches:
    (data.fieldingCatchesNonWK ?? 0) +
    (data.fieldingCatchesWK ?? 0),
  highestScore: data.battingHighScore ?? null,
  bestBowling: data.bowlingBestInnings ?? null,
  battingAverage: data.battingAverage ?? null,
  bowlingAverage: data.bowlingAverage ?? null,
};

        return Response.json(stats, {
          headers: {
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch (error) {
        return Response.json(
          {
            error: "Player statistics service unavailable",
          },
          { status: 500 }
        );
      }
    }
// Test PlayHQ public API connection
if (url.pathname === "/api/playhq-test") {
  const organisationId = "42286367-02b6-46d5-9a98-e744385639ef";

  const response = await fetch(
    `https://api.playhq.com/v1/organisations/${organisationId}/seasons`,
    {
      headers: {
        "Accept": "application/json",
        "x-api-key": env.PLAYHQ_API_KEY,
        "x-phq-tenant": "ca"
      }
    }
  );

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") || "application/json"
    }
  });
}
    // Get Clovelly teams for the current 2026/27 season
if (url.pathname === "/api/playhq-teams") {
  const seasonId = "df0653cf-2ebc-4663-ab61-0027099852e4";

  const response = await fetch(
    `https://api.playhq.com/v1/seasons/${seasonId}/teams`,
    {
      headers: {
        "Accept": "application/json",
        "x-api-key": env.PLAYHQ_API_KEY,
        "x-phq-tenant": "ca"
      }
    }
  );

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") || "application/json"
    }
  });
}
// Clean list of Clovelly teams and grade IDs
if (url.pathname === "/api/clovelly-teams") {
  const seasonId = "df0653cf-2ebc-4663-ab61-0027099852e4";
  const organisationId = "42286367-02b6-46d5-9a98-e744385639ef";

  const response = await fetch(
    `https://api.playhq.com/v1/seasons/${seasonId}/teams`,
    {
      headers: {
        "Accept": "application/json",
        "x-api-key": env.PLAYHQ_API_KEY,
        "x-phq-tenant": "ca"
      }
    }
  );

  const data = await response.json();

  const clovellyTeams = (data.data || [])
    .filter(team => team.club?.id === organisationId)
    .map(team => ({
      teamName: team.name,
      teamId: team.id,
      gradeName: team.grade?.name,
      gradeId: team.grade?.id
    }));

  return Response.json(clovellyTeams);
}
    // Get fixtures for both Clovelly teams
if (url.pathname === "/api/playhq-fixtures") {
  const grades = [
    {
      team: "Clovelly Cricket Club 1",
      grade: "2nd Grade",
      gradeId: "e9b5467f-1dce-4fce-8602-cbfad840661f"
    },
    {
      team: "Clovelly Cricket Club 2",
      grade: "4th Grade",
      gradeId: "b9fff07b-457c-4438-8ecc-d5cf6dc60ce7"
    }
  ];

  const results = await Promise.all(
    grades.map(async (item) => {
      const response = await fetch(
        `https://api.playhq.com/v2/grades/${item.gradeId}/games`,
        {
          headers: {
            "Accept": "application/json",
            "x-api-key": env.PLAYHQ_API_KEY,
            "x-phq-tenant": "ca"
          }
        }
      );

      const data = await response.json();

      return {
        team: item.team,
        grade: item.grade,
        status: response.status,
        data
      };
    })
  );

  return Response.json(results);
}
// Clean Clovelly fixtures for website use
if (url.pathname === "/api/clovelly-fixtures") {
  const grades = [
    {
  team: "Clovelly Cricket Club 1",
  teamId: "7461ed7c-4161-409b-b588-7504d4267b8b",
  grade: "2nd Grade",
  gradeId: "e9b5467f-1dce-4fce-8602-cbfad840661f"
},
   {
  team: "Clovelly Cricket Club 2",
  teamId: "838e7720-1522-4ba9-9b43-183748464458",
  grade: "4th Grade",
  gradeId: "b9fff07b-457c-4438-8ecc-d5cf6dc60ce7"
}
  ];

  const allGames = [];

  for (const item of grades) {
    const response = await fetch(
      `https://api.playhq.com/v2/grades/${item.gradeId}/games`,
      {
        headers: {
          "Accept": "application/json",
          "x-api-key": env.PLAYHQ_API_KEY,
          "x-phq-tenant": "ca"
        }
      }
    );

    const data = await response.json();

for (const round of data.rounds || []) {
  for (const game of round.games || []) {
    const clovellyInGame = (game.teams || []).some(
      team => team.id === item.teamId
    );

    if (!clovellyInGame) continue;

    allGames.push({
      team: item.team,
      grade: item.grade,
      round: round.name,
      gameId: game.id,
      status: game.status,
scheduled: game.schedule || null,
      teams: (game.teams || []).map(team => ({
        name: team.name,
        home: team.isHomeTeam,
        outcome: team.outcome
      }))
      });
  }
}

  }

  return Response.json(allGames);
}
    // Keep serving the existing website normally.
return env.ASSETS.fetch(request);
  }
};
