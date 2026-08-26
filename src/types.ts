export type Site = "cobblemon" | "prison" | "skyblock" | "smp" | "survival";

export interface SiteDefinition {
  site: Site;
  label: string;
  gamemode: string;
  baseUrl: string;
}

export const SITES: Readonly<Record<Site, SiteDefinition>> = Object.freeze({
  cobblemon: {
    site: "cobblemon",
    label: "Best Cobblemon Servers",
    gamemode: "Cobblemon",
    baseUrl: "https://bestcobblemonservers.net",
  },
  prison: {
    site: "prison",
    label: "Best Prison Servers",
    gamemode: "Prison",
    baseUrl: "https://bestprisonservers.com",
  },
  skyblock: {
    site: "skyblock",
    label: "Best Skyblock Servers",
    gamemode: "Skyblock",
    baseUrl: "https://bestskyblockservers.net",
  },
  smp: {
    site: "smp",
    label: "Best SMP Servers",
    gamemode: "SMP",
    baseUrl: "https://bestsmpservers.com",
  },
  survival: {
    site: "survival",
    label: "Best Survival Servers",
    gamemode: "Survival",
    baseUrl: "https://bestsurvivalservers.com",
  },
});

export const ALL_SITES: readonly Site[] = Object.freeze([
  "cobblemon",
  "prison",
  "skyblock",
  "smp",
  "survival",
]);

export interface PlayerRange {
  low: number;
  high: number;
}

export interface RankedServer {
  rank: number;
  name: string;
  slug: string;
  address: string;
  port: number | null;
  version: string | null;
  gamemode: string | null;
  tagline: string | null;
  tags: string[];
  website: string | null;
  discord: string | null;
  bedrock: boolean | null;
  online: boolean | null;
  players: number | null;
  maxPlayers: number | null;
  average7d: number | null;
  range24h: PlayerRange | null;
  listingUrl: string | null;
  voteUrl: string | null;
  badgeUrl: string | null;
  verifiedAt: string | null;
  raw: unknown;
}

export interface RankingsFeed {
  site: Site;
  siteUrl: string;
  gamemode: string;
  updatedAt: string | null;
  rankingWeek: string | null;
  license: string | null;
  licenseUrl: string | null;
  attribution: string | null;
  attributionText: string | null;
  methodology: string | null;
  servers: RankedServer[];
  raw: unknown;
}

export class RankingsError extends Error {
  readonly code: string;
  readonly site: Site | null;
  readonly status: number | null;

  constructor(code: string, message: string, site: Site | null = null, status: number | null = null) {
    super(message);
    this.name = "RankingsError";
    this.code = code;
    this.site = site;
    this.status = status;
  }
}
