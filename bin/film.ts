#!/usr/bin/env bun
// film <tool> [args...]: run one of the rib's production-line tools against a short.
// The current folder is the library unless FILM_LIBRARY says otherwise. `film` alone lists the tools.
import { commandFor, listTools } from "../src/runner.ts";

const [name, ...args] = process.argv.slice(2);
const tools = listTools();

if (!name || name === "help" || name === "--help") {
  console.log("usage: film <tool> [args...]\n");
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
