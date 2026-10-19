// Generates guides/method/ from the rib's method/ pages, so film_guide and the site read one source.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const SRC = new URL("../../method/", import.meta.url).pathname;
const OUT = new URL("../src/content/docs/guides/method/", import.meta.url).pathname;

// The order a piece is made in, so the sidebar reads like the flow.
const ORDER = [
  "method",
  "storyboard",
  "series",
  "craft",
  "motion",
  "capture",
  "media",
  "sound",
  "compose",
  "review",
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const topics = readdirSync(SRC)
  .filter((f) => f.endsWith(".md"))
  .map((f) => basename(f, ".md"));

for (const topic of topics) {
  const lines = readFileSync(join(SRC, `${topic}.md`), "utf8").split("\n");
  const h1 = lines.findIndex((l) => l.startsWith("# "));
  const title = h1 >= 0 ? lines[h1].slice(2).trim() : topic;
  const body = lines.slice(h1 + 1).join("\n").trim();
  const lead = body.split("\n\n")[0].replace(/\s+/g, " ");
  const order = ORDER.includes(topic) ? ORDER.indexOf(topic) + 1 : ORDER.length + 1;
  const front = [
    "---",
    `title: ${JSON.stringify(topic === "method" ? "The method" : title)}`,
    `description: ${JSON.stringify(lead.length > 160 ? `${lead.slice(0, 157)}...` : lead)}`,
    "sidebar:",
    `  order: ${order}`,
    ...(topic === "method" ? ["  label: Start here"] : []),
    "---",
  ];
  const note = `:::note[For agents]\nAn agent reads this page with \`film_guide\`, topic \`${topic}\`.\n:::`;
  writeFileSync(
    join(OUT, topic === "method" ? "index.md" : `${topic}.md`),
    `${front.join("\n")}\n\n${note}\n\n${body}\n`,
  );
}

console.log(`synced ${topics.length} method pages`);
