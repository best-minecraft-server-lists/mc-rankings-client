import { SITES, type PlayerRange, type RankedServer, type RankingsFeed, type Site } from "./types.js";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function asRange(value: unknown): PlayerRange | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const node = value as { low?: unknown; high?: unknown };
  const low = asNumber(node.low);
  const high = asNumber(node.high);

  return low === null || high === null ? null : { low, high };
}

function absoluteUrl(value: unknown, baseUrl: string): string | null {
  const text = asString(value);
  if (text === null) {
    return null;
  }
  if (/^https?:\/\//i.test(text)) {
    return text;
  }
  return `${baseUrl.replace(/\/$/, "")}/${text.replace(/^\//, "")}`;
}

export function normalizeServer(input: unknown, site: Site, baseUrl: string): RankedServer | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const node = input as Record<string, unknown>;
  const slug = asString(node["slug"]);
  const name = asString(node["name"]);

  if (slug === null && name === null) {
    return null;
  }

  const address = asString(node["address"]) ?? asString(node["ip"]) ?? "";

  return {
    rank: asNumber(node["rank"]) ?? 0,
    name: name ?? slug ?? "",
    slug: slug ?? "",
    address,
    port: asNumber(node["port"]),
    version: asString(node["version"]),
    gamemode: asString(node["gamemode"]) ?? asString(node["cobblemon"]),
    tagline: asString(node["tagline"]),
    tags: asStringArray(node["tags"]),
    website: asString(node["website"]),
    discord: asString(node["discord"]),
    bedrock: asBoolean(node["bedrock"]),
    online: asBoolean(node["online"]),
    players: asNumber(node["live_players"]) ?? asNumber(node["players"]),
    maxPlayers: asNumber(node["max_players"]),
    average7d: asNumber(node["average_7d"]),
    range24h: asRange(node["range_24h"]),
    listingUrl: absoluteUrl(node["url"], baseUrl) ?? (slug ? `${baseUrl}/server/${slug}` : null),
    voteUrl: absoluteUrl(node["vote_url"], baseUrl),
    badgeUrl: absoluteUrl(node["badge"], baseUrl),
    verifiedAt: asString(node["verified_at"]),
    raw: input,
  };
}

function toAbsoluteBase(value: unknown, fallback: string): string {
  const text = asString(value);
  if (text === null) {
    return fallback;
  }
  const trimmed = text.replace(/\/$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizeFeed(input: unknown, site: Site): RankingsFeed {
  const definition = SITES[site];
  const node = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const baseUrl = toAbsoluteBase(node["site"] ?? node["source"], definition.baseUrl);

  const rawServers = Array.isArray(node["servers"]) ? node["servers"] : [];
  const servers = rawServers
    .map((entry) => normalizeServer(entry, site, baseUrl))
    .filter((entry): entry is RankedServer => entry !== null)
    .sort((left, right) => left.rank - right.rank);

  return {
    site,
    siteUrl: baseUrl,
    gamemode: asString(node["gamemode"]) ?? definition.gamemode,
    updatedAt: asString(node["data_updated_at"]) ?? asString(node["updated"]),
    rankingWeek: asString(node["ranking_week"]),
    license: asString(node["license"]),
    licenseUrl: asString(node["license_url"]),
    attribution: asString(node["attribution"]),
    attributionText: asString(node["attribution_text"]),
    methodology: asString(node["methodology"]),
    servers,
    raw: input,
  };
}

export function attributionFor(feed: RankingsFeed): { text: string; html: string } {
  const url = feed.attribution ?? feed.siteUrl;
  const label = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const license = feed.license ?? "CC BY 4.0";
  const text = feed.attributionText ?? `Server data from ${label} (${license})`;

  return {
    text,
    html: `Server data from <a href="${url}" rel="noopener">${label}</a> (${license})`,
  };
}
