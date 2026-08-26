import test from "node:test";
import assert from "node:assert/strict";
import { ALL_SITES, RankingsClient, SITES, attributionFor, normalizeFeed } from "../dist/index.js";
import { cobblemonFeed, fakeFetch, skyblockFeed } from "../fixtures/rankings.mjs";

const COBBLEMON_URL = "https://bestcobblemonservers.net/api/rankings.json";
const SKYBLOCK_URL = "https://bestskyblockservers.net/api/rankings.json";

function clientWith(routes, options = {}) {
  const fetchImpl = fakeFetch(routes);
  return { client: new RankingsClient({ fetch: fetchImpl, ...options }), fetchImpl };
}

test("every site has a feed url", () => {
  const { client } = clientWith({});

  for (const site of ALL_SITES) {
    assert.equal(client.feedUrl(site), `${SITES[site].baseUrl}/api/rankings.json`);
  }
});

test("the cobblemon schema normalises", async () => {
  const { client } = clientWith({ [COBBLEMON_URL]: cobblemonFeed });
  const feed = await client.getCobblemon();

  assert.equal(feed.site, "cobblemon");
  assert.equal(feed.gamemode, "Cobblemon");
  assert.equal(feed.updatedAt, "2026-08-26T11:57:31.466Z");
  assert.equal(feed.license, "CC BY 4.0");
  assert.equal(feed.servers.length, 2);

  const first = feed.servers[0];
  assert.equal(first.rank, 1);
  assert.equal(first.name, "Example Network");
  assert.equal(first.address, "play.example.com");
  assert.equal(first.players, 1609);
  assert.equal(first.maxPlayers, 5000);
  assert.equal(first.gamemode, "Cobblemon 1.7");
  assert.equal(first.online, true);
  assert.deepEqual(first.tags, ["Gyms", "Dungeons", "Quests"]);
  assert.equal(first.voteUrl, "https://bestcobblemonservers.net/vote/example-network");
  assert.equal(first.port, null);
});

test("the four-site network schema normalises to the same shape", async () => {
  const { client } = clientWith({ [SKYBLOCK_URL]: skyblockFeed });
  const feed = await client.getSkyblock();

  assert.equal(feed.site, "skyblock");
  assert.equal(feed.gamemode, "Skyblock");
  assert.equal(feed.rankingWeek, "2026-W35");
  assert.equal(feed.updatedAt, "2026-08-26T11:56:36.631Z");

  const first = feed.servers[0];
  assert.equal(first.rank, 1);
  assert.equal(first.address, "play.example.com");
  assert.equal(first.port, 25565);
  assert.equal(first.players, 1609);
  assert.equal(first.bedrock, true);
  assert.equal(first.average7d, 1565);
  assert.deepEqual(first.range24h, { low: 1498, high: 1639 });
});

test("servers are sorted by rank even when the feed is not", async () => {
  const { client } = clientWith({ [SKYBLOCK_URL]: skyblockFeed });
  const feed = await client.getSkyblock();

  assert.deepEqual(feed.servers.map((server) => server.rank), [1, 2]);
});

test("relative urls are resolved against the site", async () => {
  const { client } = clientWith({ [SKYBLOCK_URL]: skyblockFeed });
  const feed = await client.getSkyblock();

  assert.equal(feed.servers[0].badgeUrl, "https://bestskyblockservers.net/badge/example-network.svg");
  assert.equal(feed.servers[1].badgeUrl, "https://bestskyblockservers.net/badge/second-place.svg");
});

test("a bare hostname in the site field is upgraded to an absolute url", async () => {
  const { client } = clientWith({ [SKYBLOCK_URL]: skyblockFeed });
  const feed = await client.getSkyblock();

  assert.equal(feed.siteUrl, "https://bestskyblockservers.net");
  assert.equal(normalizeFeed({ site: "example.com/" }, "prison").siteUrl, "https://example.com");
  assert.equal(normalizeFeed({ site: "http://example.com" }, "prison").siteUrl, "http://example.com");
  assert.equal(normalizeFeed({}, "prison").siteUrl, "https://bestprisonservers.com");
});

test("a missing listing url falls back to the conventional path", () => {
  const feed = normalizeFeed({ servers: [{ rank: 1, name: "X", slug: "x" }] }, "prison");
  assert.equal(feed.servers[0].listingUrl, "https://bestprisonservers.com/server/x");
});

test("results are cached until the ttl expires", async () => {
  const { client, fetchImpl } = clientWith({ [COBBLEMON_URL]: cobblemonFeed }, { cacheTtl: 60_000 });

  await client.getCobblemon();
  await client.getCobblemon();
  await client.getCobblemon();

  assert.equal(fetchImpl.calls.length, 1);
});

test("force bypasses the cache and clearCache empties it", async () => {
  const { client, fetchImpl } = clientWith({ [COBBLEMON_URL]: cobblemonFeed }, { cacheTtl: 60_000 });

  await client.getCobblemon();
  await client.get("cobblemon", { force: true });
  assert.equal(fetchImpl.calls.length, 2);

  client.clearCache();
  await client.getCobblemon();
  assert.equal(fetchImpl.calls.length, 3);
});

test("a zero ttl disables caching", async () => {
  const { client, fetchImpl } = clientWith({ [COBBLEMON_URL]: cobblemonFeed }, { cacheTtl: 0 });

  await client.getCobblemon();
  await client.getCobblemon();

  assert.equal(fetchImpl.calls.length, 2);
});

test("concurrent requests for the same site share one fetch", async () => {
  const { client, fetchImpl } = clientWith({ [COBBLEMON_URL]: cobblemonFeed });

  await Promise.all([client.getCobblemon(), client.getCobblemon(), client.getCobblemon()]);

  assert.equal(fetchImpl.calls.length, 1);
});

test("an http error surfaces the status code", async () => {
  const { client } = clientWith({ [COBBLEMON_URL]: 503 });

  await assert.rejects(client.getCobblemon(), (error) => {
    assert.equal(error.code, "HTTP_ERROR");
    assert.equal(error.status, 503);
    assert.equal(error.site, "cobblemon");
    return true;
  });
});

test("a network failure is wrapped in a RankingsError", async () => {
  const { client } = clientWith({ [COBBLEMON_URL]: new Error("socket hang up") });

  await assert.rejects(client.getCobblemon(), (error) => {
    assert.equal(error.code, "REQUEST_FAILED");
    assert.match(error.message, /socket hang up/);
    return true;
  });
});

test("getAll returns the sites that answered and omits the ones that did not", async () => {
  const { client } = clientWith({ [COBBLEMON_URL]: cobblemonFeed, [SKYBLOCK_URL]: skyblockFeed });
  const feeds = await client.getAll();

  assert.deepEqual(Object.keys(feeds).sort(), ["cobblemon", "skyblock"]);
  assert.equal(feeds.cobblemon.servers.length, 2);
});

test("getServer looks up by slug, case insensitively", async () => {
  const { client } = clientWith({ [COBBLEMON_URL]: cobblemonFeed });

  assert.equal((await client.getServer("cobblemon", "second-example")).rank, 2);
  assert.equal((await client.getServer("cobblemon", "SECOND-EXAMPLE")).rank, 2);
  assert.equal(await client.getServer("cobblemon", "nope"), null);
});

test("getTop slices the ranking", async () => {
  const { client } = clientWith({ [COBBLEMON_URL]: cobblemonFeed });

  assert.equal((await client.getTop("cobblemon", 1)).length, 1);
  assert.equal((await client.getTop("cobblemon", 50)).length, 2);
});

test("an unknown site is rejected", async () => {
  const { client } = clientWith({});
  await assert.rejects(client.get("fortnite"), /Unknown site/);
});

test("a malformed feed degrades to an empty server list", () => {
  assert.deepEqual(normalizeFeed(null, "prison").servers, []);
  assert.deepEqual(normalizeFeed({ servers: "nope" }, "prison").servers, []);
  assert.deepEqual(normalizeFeed({ servers: [null, 5, {}] }, "prison").servers, []);
});

test("attributionFor produces text and html crediting the source", () => {
  const feed = normalizeFeed(cobblemonFeed, "cobblemon");
  const attribution = attributionFor(feed);

  assert.equal(attribution.text, "Server data from bestcobblemonservers.net (CC BY 4.0)");
  assert.match(attribution.html, /<a href="https:\/\/bestcobblemonservers\.net"/);
  assert.match(attribution.html, /CC BY 4\.0/);
});

test("baseUrls can be overridden for a staging environment", async () => {
  const url = "https://staging.example.com/api/rankings.json";
  const { client, fetchImpl } = clientWith(
    { [url]: cobblemonFeed },
    { baseUrls: { cobblemon: "https://staging.example.com" } },
  );

  await client.getCobblemon();
  assert.deepEqual(fetchImpl.calls, [url]);
});
