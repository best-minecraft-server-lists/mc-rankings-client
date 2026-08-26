export const cobblemonFeed = {
  updated: "2026-08-26T11:57:31.466Z",
  source: "https://bestcobblemonservers.net",
  license: "CC BY 4.0",
  license_url: "https://creativecommons.org/licenses/by/4.0/",
  attribution: "https://bestcobblemonservers.net",
  attribution_text: "Server data from bestcobblemonservers.net (CC BY 4.0)",
  docs: "https://bestcobblemonservers.net/license",
  servers: [
    {
      rank: 1,
      name: "Example Network",
      slug: "example-network",
      address: "play.example.com",
      version: "Minecraft 1.21.1",
      cobblemon: "Cobblemon 1.7",
      tagline: "An example Cobblemon server used in this library's tests.",
      tags: ["Gyms", "Dungeons", "Quests"],
      website: "https://www.example.com",
      discord: "https://discord.gg/example",
      modpack: null,
      online: true,
      players: 1609,
      max_players: 5000,
      url: "https://bestcobblemonservers.net/server/example-network",
      vote_url: "https://bestcobblemonservers.net/vote/example-network",
    },
    {
      rank: 2,
      name: "Second Example",
      slug: "second-example",
      address: "play.example.org",
      version: "Minecraft 1.21",
      cobblemon: "Cobblemon 1.7",
      tagline: "A second example entry.",
      tags: ["Raids"],
      website: null,
      discord: null,
      modpack: null,
      online: true,
      players: 33,
      max_players: 500,
      url: "https://bestcobblemonservers.net/server/second-example",
      vote_url: "https://bestcobblemonservers.net/vote/second-example",
    },
  ],
};

export const skyblockFeed = {
  site: "bestskyblockservers.net",
  gamemode: "Skyblock",
  ranking_week: "2026-W35",
  ranking_computed_at: "2026-08-24T00:00:00.000Z",
  data_updated_at: "2026-08-26T11:56:36.631Z",
  last_verified_at: "2026-08-26T11:56:36.631Z",
  counts_are_live: true,
  ordering: "live_players",
  methodology: "https://bestskyblockservers.net/methodology",
  license: "CC BY 4.0",
  license_url: "https://creativecommons.org/licenses/by/4.0/",
  attribution: "https://bestskyblockservers.net",
  attribution_text: "Server data from bestskyblockservers.net (CC BY 4.0)",
  docs: "https://bestskyblockservers.net/license",
  servers: [
    {
      rank: 2,
      name: "Second Place",
      slug: "second-place",
      ip: "play.example.org",
      port: 25565,
      website: "https://www.example.org",
      gamemode: "Skyblock",
      version: "1.20 - 1.21",
      bedrock: false,
      count_scope: "server",
      live_players: 300,
      count_basis: "live",
      range_24h: { low: 250, high: 350 },
      average_7d: 310,
      max_players: 1000,
      verified_at: "2026-08-26T11:56:36.631Z",
      badge: "https://bestskyblockservers.net/badge/second-place.svg",
    },
    {
      rank: 1,
      name: "Example Network",
      slug: "example-network",
      ip: "play.example.com",
      port: 25565,
      website: "https://www.example.com",
      gamemode: "OP Skyblock",
      version: "1.8 - 26.2",
      bedrock: true,
      count_scope: "network",
      live_players: 1609,
      count_basis: "live",
      range_24h: { low: 1498, high: 1639 },
      average_7d: 1565,
      max_players: 5000,
      verified_at: "2026-08-26T11:56:36.631Z",
      badge: "/badge/example-network.svg",
    },
  ],
};

export function fakeFetch(routes) {
  const calls = [];

  const impl = async (url) => {
    calls.push(url);
    const entry = routes[url];

    if (!entry) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    if (entry instanceof Error) {
      throw entry;
    }
    if (typeof entry === "number") {
      return { ok: false, status: entry, json: async () => ({}) };
    }

    return { ok: true, status: 200, json: async () => entry };
  };

  impl.calls = calls;
  return impl;
}
