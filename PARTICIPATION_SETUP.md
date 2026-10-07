# Second Grade participation

The public page is `selection.html`; detailed figures are in the squad-only `participation.html` dashboard. Existing player statistics and fixture routes are preserved.

## One-time Cloudflare setup

1. Create a Workers KV namespace and bind it to the existing Worker as `PARTICIPATION_STORE`. Store its real namespace ID in a `kv_namespaces` entry in `wrangler.jsonc`; keep the existing asset and API settings.
2. Set two different, strong Worker secrets: `PARTICIPATION_ACCESS_CODE` for squad read-only access and `PARTICIPATION_ADMIN_CODE` for the club administrator. Never put their values in this repository.
3. Deploy the updated Worker and assets using the existing Cloudflare deployment. Open the dashboard with the administrator code and choose each player's bowling category. The choices are saved in KV under `second-grade-roles` and persist across deployments.
4. Share the dashboard URL and member code through the existing squad WhatsApp group. New players need their category set once; existing categories need changing only if their bowling role changes.

Until both secrets and the KV binding exist, the participation API returns a setup message and reveals no player figures. The dashboard stores access in a signed, HttpOnly, Secure cookie expiring after 12 hours. Member access cannot edit roles.

## Automatic updates

Opening the dashboard reads Cricket Australia's current completed Second Grade scorecards, with a five-minute upstream cache. No scheduled task or workbook upload is needed. This is refresh-on-open, not a background email or notification service.

Matches played count only a batting innings (excluding Did Not Bat) or at least one legal ball bowled. A team listing or fielding entry alone does not count. Names withheld in the public scorecard are excluded. Bowling is N/A for Not a bowler; Front line bowler and Fill in bowler retain their recorded bowling figures. Roles are shown separately and no composite fairness score is calculated.

Default ordering is innings actually batted descending, then Top 5 innings descending, with remaining ties alphabetical. Bowling figures and categories do not affect this ranking. Optional sorts show matches played, Top 5 innings and overs bowled. Overs are summed as balls and displayed in cricket notation. Multiple batting innings are counted separately; a match appearance is counted once.

% batted is matches with at least one batting innings divided by matches played, so a two-innings match is counted once in both parts of that percentage. Order bands show an innings count and the percentage of total innings batted: positions 1–5, 6–8 and 9–11. With no matches/innings the percentage is unavailable, shown as a dash. Positions 12+ or missing positions are reported separately, not folded into 9–11. Whole-percent rounding can make band percentages add to 99% or 101%.

The team identifier is the Cricket Australia Second Grade team ID `7d3bcbdf-9dd6-48ac-9540-446ad507b018`, distinct from the PlayHQ ID. Confirm this mapping and the season before reusing the dashboard next season. Upstream corrections become visible after cache expiry. An unavailable scorecard produces an error rather than a partial table.
