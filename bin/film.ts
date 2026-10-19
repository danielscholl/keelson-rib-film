#!/usr/bin/env bun
import { pieceInfo } from "../src/info.ts";
// film <tool> [args...]: run one of the rib's production-line tools against a short.
// The current folder is the library unless FILM_LIBRARY says otherwise. `film` alone lists the tools.
import { initLibrary, STARTER_PIECE } from "../src/init.ts";
import { commandFor, listTools } from "../src/runner.ts";

const [name, ...args] = process.argv.slice(2);
const tools = listTools();

if (name === "info") {
  try {
    console.log(JSON.stringify(pieceInfo(args[0] ?? ".")));
    process.exit(0);
  } catch (e) {
    console.error(`film info: ${(e as Error).message}`);
    process.exit(1);
  }
}

if (name === "init") {
  const { library, written, kept } = initLibrary(args[0] ?? ".");
  for (const f of written) console.log(`  + ${f}`);
  for (const f of kept) console.log(`  = ${f} (kept)`);
  console.log(
    `\nlibrary: ${library}\nnext: keelson workflow run film-cut --arguments ${STARTER_PIECE}`,
  );
  process.exit(0);
}

if (!name || name === "help" || name === "--help") {
  console.log("usage: film <tool> [args...]   |   film info <short-dir>   |   film init [dir]\n");
  for (const t of tools) console.log(`  ${t.name.padEnd(14)} ${t.summary}`);
  process.exit(name ? 0 : 2);
}

const tool = tools.find((t) => t.name === name);
if (!tool) {
  console.error(`film: no tool '${name}'. Tools: ${tools.map((t) => t.name).join(", ")}`);
  process.exit(2);
}

const proc = Bun.spawn(commandFor(tool, args), { stdio: ["inherit", "inherit", "inherit"] });
process.exit(await proc.exited);
