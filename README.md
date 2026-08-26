# mc-rankings-client - Free Minecraft Server Rankings API Client

[![CI](https://github.com/best-minecraft-server-lists/mc-rankings-client/actions/workflows/ci.yml/badge.svg)](https://github.com/best-minecraft-server-lists/mc-rankings-client/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/mc-rankings-client.svg)](https://www.npmjs.com/package/mc-rankings-client)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A typed Node client for the free Minecraft server rankings feeds published by Best Minecraft Server Lists. Fetch live-pinged rankings for Cobblemon, Prison, Skyblock, SMP and Survival servers as JSON, with caching, timeouts and a single normalised shape across every site. No API key, no sign-up. Zero dependencies.

```bash
npx mc-rankings cobblemon --top 3
```

```
Best Cobblemon Servers (Cobblemon)
https://bestcobblemonservers.net  updated 2026-08-26T12:14:30.573Z

   1. TalonMC Cobblemon        play.talonmc.net             1665/5000
   2. Cobblemon Islands        play.cobblemonislands.com    32/500
   3. CobbleGalaxy             play.cobblegalaxy.com        394/1000

  Server data from bestcobblemonservers.net (CC BY 4.0)
```

## The data

Each site publishes a `rankings.json` feed listing its current top servers with live player counts taken from a real server list ping, not from anything a server operator self-reports.

| Site | Gamemode | Feed |
| --- | --- | --- |
| [bestcobblemonservers.net](https://bestcobblemonservers.net) | Cobblemon | `/api/rankings.json` |
| [bestprisonservers.com](https://bestprisonservers.com) | Prison | `/api/rankings.json` |
| [bestskyblockservers.net](https://bestskyblockservers.net) | Skyblock | `/api/rankings.json` |
| [bestsmpservers.com](https://bestsmpservers.com) | SMP | `/api/rankings.json` |
| [bestsurvivalservers.com](https://bestsurvivalservers.com) | Survival | `/api/rankings.json` |

The feeds are licensed **CC BY 4.0**. You may use them commercially as long as you credit the source. `attributionFor()` builds the credit line for you.

The sites do not all emit an identical schema, and the fields have grown over time. This client normalises whatever a feed returns into one `RankedServer` shape and keeps the untouched payload on `raw`, so your code does not break when a field is added or a site's format shifts.

## Install

```bash
npm install mc-rankings-client
```

## Usage

### Fetch one gamemode

```js
import { getCobblemonRankings } from "mc-rankings-client";

const feed = await getCobblemonRankings();

for (const server of feed.servers) {
  console.log(`${server.rank}. ${server.name} - ${server.players} players on ${server.address}`);
}
```

### Fetch every gamemode at once

`getAll` never rejects. Sites that fail are simply absent from the result, so one site being down does not take your page with it.

```js
import { getAllRankings } from "mc-rankings-client";

const feeds = await getAllRankings();

for (const [site, feed] of Object.entries(feeds)) {
  console.log(`${site}: ${feed.servers.length} servers, updated ${feed.updatedAt}`);
}
```

### Look up a single server

```js
import { getServer } from "mc-rankings-client";

const server = await getServer("skyblock", "talonmc");

if (server) {
  console.log(server.rank);       // 1
  console.log(server.players);    // 1661
  console.log(server.average7d);  // 1565
  console.log(server.range24h);   // { low: 1498, high: 1639 }
  console.log(server.listingUrl); // https://bestskyblockservers.net/server/talonmc
}
```

### Configure caching for a web server

The default client caches for five minutes. Create your own to tune it.

```js
import { RankingsClient } from "mc-rankings-client";

const rankings = new RankingsClient({
  cacheTtl: 60_000,
  timeout: 5000,
  userAgent: "my-app/1.0 (+https://my-app.example)",
});

app.get("/api/top-skyblock", async (req, res) => {
  const feed = await rankings.getSkyblock();
  res.json(feed.servers.slice(0, 5));
});
```

Concurrent calls for the same site share one request, so a burst of traffic on a cold cache still results in a single fetch.

### Render a leaderboard with attribution

The licence requires credit. This builds it from whatever the feed declares.

```js
import { RankingsClient, attributionFor } from "mc-rankings-client";

const feed = await new RankingsClient().getPrison();
const rows = feed.servers
  .map((server) => `<li><a href="${server.listingUrl}">${server.name}</a> - ${server.players} online</li>`)
  .join("");

const html = `<ol>${rows}</ol><p class="credit">${attributionFor(feed).html}</p>`;
```

### Combine with a live ping

The feed tells you which servers are worth checking. `mc-status` tells you what they look like right now.

```js
import { getSkyblockRankings } from "mc-rankings-client";
import { status } from "mc-status";

const feed = await getSkyblockRankings();

for (const server of feed.servers.slice(0, 5)) {
  const live = await status(server.address).catch(() => null);
  console.log(`${server.name}: feed says ${server.players}, ping says ${live?.players.online ?? "offline"}`);
}
```

### Handle errors

```js
import { RankingsClient, RankingsError } from "mc-rankings-client";

try {
  await new RankingsClient({ timeout: 2000 }).getSmp();
} catch (error) {
  if (error instanceof RankingsError) {
    console.error(error.code, error.site, error.status);
  }
}
```

## CLI

```
mc-rankings <site> [options]
mc-rankings all [options]

Sites:
  cobblemon, prison, skyblock, smp, survival

Options:
  --json          Print the normalised feed as JSON
  --raw           Print the untouched feed as JSON
  --top <n>       Show only the top n servers
  --timeout <ms>  Milliseconds before giving up (default 10000)
  -h, --help      Show this help
```

```bash
npx mc-rankings all
npx mc-rankings prison --json | jq '.servers[0].address'
```

## API reference

### Convenience functions

These use a shared default client with a five-minute cache.

| Function | Returns |
| --- | --- |
| `getRankings(site)` | `Promise<RankingsFeed>` |
| `getCobblemonRankings()` | `Promise<RankingsFeed>` |
| `getPrisonRankings()` | `Promise<RankingsFeed>` |
| `getSkyblockRankings()` | `Promise<RankingsFeed>` |
| `getSmpRankings()` | `Promise<RankingsFeed>` |
| `getSurvivalRankings()` | `Promise<RankingsFeed>` |
| `getAllRankings()` | `Promise<Partial<Record<Site, RankingsFeed>>>` |
| `getServer(site, slug)` | `Promise<RankedServer \| null>` |

### `new RankingsClient(options?)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `cacheTtl` | `number` | `300000` | Cache lifetime in milliseconds. `0` disables caching. |
| `timeout` | `number` | `10000` | Per-request timeout. |
| `userAgent` | `string` | `"mc-rankings-client"` | Sent on every request. Set something identifying if you poll often. |
| `fetch` | `FetchLike` | global `fetch` | Inject your own for tests or a proxy. |
| `baseUrls` | `Partial<Record<Site, string>>` | - | Override a site's origin. |
| `path` | `string` | `"/api/rankings.json"` | Override the feed path. |

Methods: `get(site, { force })`, `getCobblemon()`, `getPrison()`, `getSkyblock()`, `getSmp()`, `getSurvival()`, `getAll({ force })`, `getServer(site, slug)`, `getTop(site, count)`, `feedUrl(site)`, `clearCache(site?)`.

### `RankingsFeed`

| Field | Type | Description |
| --- | --- | --- |
| `site` | `Site` | Which site this came from. |
| `siteUrl` | `string` | Absolute origin, normalised even when the feed sends a bare hostname. |
| `gamemode` | `string` | Gamemode the ranking covers. |
| `updatedAt` | `string \| null` | ISO timestamp of the underlying data. |
| `rankingWeek` | `string \| null` | ISO week the ranking was computed for, where the site publishes one. |
| `license` / `licenseUrl` | `string \| null` | Licence declared by the feed. |
| `attribution` / `attributionText` | `string \| null` | Credit URL and ready-made credit line. |
| `methodology` | `string \| null` | Link to how the ranking is computed. |
| `servers` | `RankedServer[]` | Sorted by rank ascending. |
| `raw` | `unknown` | The untouched payload. |

### `RankedServer`

| Field | Type | Notes |
| --- | --- | --- |
| `rank` | `number` | 1 is the top entry. |
| `name`, `slug` | `string` | |
| `address` | `string` | From `address` or `ip`, whichever the feed uses. |
| `port` | `number \| null` | |
| `version` | `string \| null` | Supported version range as text. |
| `gamemode` | `string \| null` | The server's own gamemode label. |
| `tagline` | `string \| null` | |
| `tags` | `string[]` | Empty when the feed has none. |
| `website`, `discord` | `string \| null` | |
| `bedrock` | `boolean \| null` | Whether Bedrock clients can join. |
| `online` | `boolean \| null` | |
| `players`, `maxPlayers` | `number \| null` | From `live_players` or `players`. |
| `average7d` | `number \| null` | Seven-day average player count. |
| `range24h` | `{ low, high } \| null` | 24-hour low and high. |
| `listingUrl`, `voteUrl`, `badgeUrl` | `string \| null` | Resolved to absolute URLs. |
| `verifiedAt` | `string \| null` | When the count was last checked. |
| `raw` | `unknown` | The untouched entry. |

Fields a given site does not publish are `null` rather than missing, so you can read them without guarding every access.

### `attributionFor(feed)`

Returns `{ text, html }` crediting the source under its declared licence.

### `RankingsError`

| Code | Meaning |
| --- | --- |
| `HTTP_ERROR` | Feed responded with a non-2xx status. `status` carries it. |
| `REQUEST_FAILED` | Network failure or timeout. |
| `UNKNOWN_SITE` | Site name was not one of the five. |
| `NO_FETCH` | No global `fetch`. Use Node 18+ or pass `options.fetch`. |

## Notes

- Player counts come from live pings. A network that runs one proxy in front of several gamemodes will report the whole network's count, which is why `count_scope` appears on the sites that publish it and is preserved on `raw`.
- Rankings are recomputed weekly. The player counts inside them refresh far more often.
- Please cache. The default five-minute TTL is there for a reason, and a sensible `userAgent` helps if we ever need to get in touch about traffic.

## Related

Built and maintained by [Best Minecraft Server Lists](https://bestcobblemonservers.net). Every ranking below is ordered on player counts taken from a direct server ping, never on numbers a server reports about itself.

- [Best Cobblemon servers](https://bestcobblemonservers.net) - The Best Cobblemon Servers, Top 10, Rated by the players
- [Best Minecraft Prison servers](https://bestprisonservers.com) - The Best Prison Servers, Top 10, Rated by the players
- [Best Minecraft Skyblock servers](https://bestskyblockservers.net) - The Best Skyblock Servers, Top 10, Rated by the players
- [Best Minecraft SMP servers](https://bestsmpservers.com) - The Best SMP Servers, Top 10, Rated by the players
- [Best Minecraft Survival servers](https://bestsurvivalservers.com) - The Best Survival Servers, Top 10, Rated by the players
- [Free rankings JSON API](https://bestprisonservers.com/api/rankings.json) - Every ranking above as JSON, CC BY 4.0, no key and no sign-up

Sister libraries:

- [mc-status](https://github.com/best-minecraft-server-lists/mc-status) - ping a Java or Bedrock server for players, version and MOTD
- [mc-motd](https://github.com/best-minecraft-server-lists/motd-parser) - render a MOTD to ANSI, HTML or plain text
- [mc-votifier](https://github.com/best-minecraft-server-lists/votifier-client) - send and receive Votifier votes

## Contributing

Issues and pull requests are welcome. The test suite runs against recorded fixtures and needs no network access.

```bash
npm install
npm test
```

## License

MIT for this client. The rankings data itself is CC BY 4.0.
