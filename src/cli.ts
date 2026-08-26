#!/usr/bin/env node
import { RankingsClient } from "./client.js";
import { attributionFor } from "./normalize.js";
import { ALL_SITES, RankingsError, SITES, type Site } from "./types.js";

const USAGE = `mc-rankings - fetch the Best Minecraft Server Lists rankings feeds

Usage:
  mc-rankings <site> [options]
  mc-rankings all [options]

Sites:
  ${ALL_SITES.join(", ")}

Options:
  --json          Print the normalised feed as JSON
  --raw           Print the untouched feed as JSON
  --top <n>       Show only the top n servers
  --timeout <ms>  Milliseconds before giving up (default 10000)
  -h, --help      Show this help

Examples:
  mc-rankings cobblemon
  mc-rankings skyblock --top 3
  mc-rankings all --json
`;

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? undefined : argv[index + 1];
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const target = argv.find((arg) => !arg.startsWith("--"));

  if (argv.includes("-h") || argv.includes("--help") || target === undefined) {
    process.stdout.write(USAGE);
    return target === undefined ? 2 : 0;
  }

  if (target !== "all" && !ALL_SITES.includes(target as Site)) {
    process.stderr.write(`unknown site "${target}", expected one of ${ALL_SITES.join(", ")}\n`);
    return 2;
  }

  const timeout = Number.parseInt(flagValue(argv, "timeout") ?? "", 10);
  const top = Number.parseInt(flagValue(argv, "top") ?? "", 10);
  const client = new RankingsClient({ timeout: Number.isFinite(timeout) ? timeout : undefined });
  const sites = target === "all" ? ALL_SITES : [target as Site];

  let failures = 0;

  for (const site of sites) {
    try {
      const feed = await client.get(site);
      const servers = Number.isFinite(top) ? feed.servers.slice(0, top) : feed.servers;

      if (argv.includes("--raw")) {
        process.stdout.write(`${JSON.stringify(feed.raw, null, 2)}\n`);
        continue;
      }
      if (argv.includes("--json")) {
        process.stdout.write(`${JSON.stringify({ ...feed, servers, raw: undefined }, null, 2)}\n`);
        continue;
      }

      process.stdout.write(`\n${SITES[site].label} (${feed.gamemode})\n`);
      process.stdout.write(`${feed.siteUrl}  updated ${feed.updatedAt ?? "unknown"}\n\n`);

      for (const server of servers) {
        const players = server.players === null ? "?" : String(server.players);
        const max = server.maxPlayers === null ? "?" : String(server.maxPlayers);
        process.stdout.write(
          `  ${String(server.rank).padStart(2)}. ${server.name.padEnd(24)} ${server.address.padEnd(28)} ${players}/${max}\n`,
        );
      }

      process.stdout.write(`\n  ${attributionFor(feed).text}\n`);
    } catch (error) {
      failures += 1;
      const message = error instanceof RankingsError ? `${error.code}: ${error.message}` : (error as Error).message;
      process.stderr.write(`${site}: ${message}\n`);
    }
  }

  return failures > 0 && failures === sites.length ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`${(error as Error).stack ?? String(error)}\n`);
    process.exitCode = 1;
  });
