/**
 * Entry point — routes CLI subcommands and wires config, DB, and Indexer
 * together for the poll loop.
 *
 * Subcommands:
 *   start   (default) — start the indexer poll loop
 *   query   — query indexed compliance events by address
 *
 * Usage:
 *   node dist/index.js start
 *   node dist/index.js query --address G...
 *   npm run start
 *   npm run query -- --address G...
 */

import process from "node:process";
import { loadConfig } from "./config.js";
import { ComplianceDb } from "./db.js";
import { Indexer } from "./indexer.js";
import { runQuery } from "./query.js";

const subcommand = process.argv[2];

if (subcommand === "query") {
  // Pass remaining args after the subcommand name
  runQuery(process.argv.slice(3)).catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
} else {
  // Default: start the indexer (also handles explicit "start" or no subcommand)
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  const db = await ComplianceDb.open(config.dbPath);
  const indexer = new Indexer(config, db);

  function shutdown(signal: string): void {
    console.log(`\nReceived ${signal}, shutting down…`);
    indexer.stop();
    db.close();
    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  indexer.start();
}
