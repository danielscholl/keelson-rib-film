import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

export interface MethodPage {
  topic: string;
  title: string;
  summary: string;
  body: string;
}

export const METHOD_DIR = new URL("../method", import.meta.url).pathname;
export const OVERVIEW_TOPIC = "method";

export function loadMethod(dir: string = METHOD_DIR): MethodPage[] {
  if (!existsSync(dir)) return [];
  const pages = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parsePage(basename(f, ".md"), readFileSync(join(dir, f), "utf8")));
  // The overview leads so a bare listing reads in the order the method is used.
  return pages.sort((a, b) =>
    a.topic === OVERVIEW_TOPIC
      ? -1
      : b.topic === OVERVIEW_TOPIC
        ? 1
        : a.topic.localeCompare(b.topic),
  );
}

export function parsePage(topic: string, body: string): MethodPage {
  const lines = body.split("\n");
  const heading = lines.find((l) => l.startsWith("# "));
  const title = heading ? heading.slice(2).trim() : topic;
  const summary =
    lines.find((l) => l.trim().length > 0 && !l.startsWith("#") && !l.startsWith("---"))?.trim() ??
    "";
  return {
    topic,
    title,
    summary: summary.length > 200 ? `${summary.slice(0, 197)}...` : summary,
    body,
  };
}

export function methodCorpus(pages: readonly MethodPage[]): string {
  return pages.map((p) => p.body.trim()).join("\n\n");
}
