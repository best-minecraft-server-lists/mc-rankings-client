import { normalizeFeed } from "./normalize.js";
import { ALL_SITES, RankingsError, SITES, type RankedServer, type RankingsFeed, type Site } from "./types.js";

export type FetchLike = (input: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface RankingsClientOptions {
  cacheTtl?: number;
  timeout?: number;
  userAgent?: string;
  fetch?: FetchLike;
  baseUrls?: Partial<Record<Site, string>>;
  path?: string;
}

interface CacheEntry {
  expiresAt: number;
  feed: RankingsFeed;
}

const DEFAULT_CACHE_TTL = 300_000;
const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_PATH = "/api/rankings.json";

export class RankingsClient {
  private readonly cache = new Map<Site, CacheEntry>();
  private readonly inFlight = new Map<Site, Promise<RankingsFeed>>();
  private readonly options: Required<Omit<RankingsClientOptions, "baseUrls" | "fetch">> & {
    baseUrls: Partial<Record<Site, string>>;
    fetch: FetchLike;
  };

  constructor(options: RankingsClientOptions = {}) {
    const resolvedFetch = options.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined);

    if (!resolvedFetch) {
      throw new RankingsError("NO_FETCH", "No global fetch is available. Use Node 18+ or pass options.fetch");
    }

    this.options = {
      cacheTtl: options.cacheTtl ?? DEFAULT_CACHE_TTL,
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      userAgent: options.userAgent ?? "mc-rankings-client",
      path: options.path ?? DEFAULT_PATH,
      baseUrls: options.baseUrls ?? {},
      fetch: resolvedFetch,
    };
  }

  feedUrl(site: Site): string {
    const base = this.options.baseUrls[site] ?? SITES[site].baseUrl;
    return `${base.replace(/\/$/, "")}${this.options.path}`;
  }

  clearCache(site?: Site): void {
    if (site) {
      this.cache.delete(site);
      return;
    }
    this.cache.clear();
  }

  async get(site: Site, options: { force?: boolean } = {}): Promise<RankingsFeed> {
    if (!SITES[site]) {
      throw new RankingsError("UNKNOWN_SITE", `Unknown site "${site}"`, null);
    }

    const cached = this.cache.get(site);
    if (!options.force && cached && cached.expiresAt > Date.now()) {
      return cached.feed;
    }

    const pending = this.inFlight.get(site);
    if (!options.force && pending) {
      return pending;
    }

    const request = this.load(site).finally(() => {
      this.inFlight.delete(site);
    });

    this.inFlight.set(site, request);
    return request;
  }

  private async load(site: Site): Promise<RankingsFeed> {
    const url = this.feedUrl(site);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      const response = await this.options.fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json", "user-agent": this.options.userAgent },
      });

      if (!response.ok) {
        throw new RankingsError("HTTP_ERROR", `${url} responded ${response.status}`, site, response.status);
      }

      const feed = normalizeFeed(await response.json(), site);
      this.cache.set(site, { expiresAt: Date.now() + this.options.cacheTtl, feed });
      return feed;
    } catch (error) {
      if (error instanceof RankingsError) {
        throw error;
      }
      const message = (error as Error).name === "AbortError"
        ? `${url} timed out after ${this.options.timeout}ms`
        : (error as Error).message;
      throw new RankingsError("REQUEST_FAILED", message, site);
    } finally {
      clearTimeout(timer);
    }
  }

  getCobblemon(options?: { force?: boolean }): Promise<RankingsFeed> {
    return this.get("cobblemon", options);
  }

  getPrison(options?: { force?: boolean }): Promise<RankingsFeed> {
    return this.get("prison", options);
  }

  getSkyblock(options?: { force?: boolean }): Promise<RankingsFeed> {
    return this.get("skyblock", options);
  }

  getSmp(options?: { force?: boolean }): Promise<RankingsFeed> {
    return this.get("smp", options);
  }

  getSurvival(options?: { force?: boolean }): Promise<RankingsFeed> {
    return this.get("survival", options);
  }

  async getAll(options: { force?: boolean } = {}): Promise<Partial<Record<Site, RankingsFeed>>> {
    const settled = await Promise.allSettled(ALL_SITES.map((site) => this.get(site, options)));
    const feeds: Partial<Record<Site, RankingsFeed>> = {};

    for (const [index, result] of settled.entries()) {
      if (result.status === "fulfilled") {
        feeds[ALL_SITES[index] as Site] = result.value;
      }
    }

    return feeds;
  }

  async getServer(site: Site, slug: string, options?: { force?: boolean }): Promise<RankedServer | null> {
    const feed = await this.get(site, options);
    const needle = slug.toLowerCase();
    return feed.servers.find((server) => server.slug.toLowerCase() === needle) ?? null;
  }

  async getTop(site: Site, count = 10, options?: { force?: boolean }): Promise<RankedServer[]> {
    const feed = await this.get(site, options);
    return feed.servers.slice(0, count);
  }
}
