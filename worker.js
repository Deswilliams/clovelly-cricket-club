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

      const apiUrl =
        `https://grassrootsapiproxy.cricket.com.au/participants/players/${playerId}` +
        `/summary-statistics?seasonId=&organisationId=&matchTypeId=&jsconfig=eccn%3Atrue`;

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

    // Keep serving the existing website normally.
    return env.ASSETS.fetch(request);
  },
};
