import { RankingsClient } from "./client.js";
import type { RankedServer, RankingsFeed, Site } from "./types.js";

export { RankingsClient } from "./client.js";
export type { RankingsClientOptions, FetchLike } from "./client.js";
export { normalizeFeed, normalizeServer, attributionFor } from "./normalize.js";
export { SITES, ALL_SITES, RankingsError } from "./types.js";
export type { RankedServer, RankingsFeed, PlayerRange, Site, SiteDefinition } from "./types.js";

let defaultClient: RankingsClient | null = null;

export function getDefaultClient(): RankingsClient {
  defaultClient ??= new RankingsClient();
  return defaultClient;
}

export function setDefaultClient(client: RankingsClient): void {
  defaultClient = client;
}

export function getRankings(site: Site): Promise<RankingsFeed> {
  return getDefaultClient().get(site);
}

export function getCobblemonRankings(): Promise<RankingsFeed> {
  return getDefaultClient().getCobblemon();
}

export function getPrisonRankings(): Promise<RankingsFeed> {
  return getDefaultClient().getPrison();
}

export function getSkyblockRankings(): Promise<RankingsFeed> {
  return getDefaultClient().getSkyblock();
}

export function getSmpRankings(): Promise<RankingsFeed> {
  return getDefaultClient().getSmp();
}

export function getSurvivalRankings(): Promise<RankingsFeed> {
  return getDefaultClient().getSurvival();
}

export function getAllRankings(): Promise<Partial<Record<Site, RankingsFeed>>> {
  return getDefaultClient().getAll();
}

export function getServer(site: Site, slug: string): Promise<RankedServer | null> {
  return getDefaultClient().getServer(site, slug);
}
