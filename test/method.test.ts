import { describe, expect, test } from "bun:test";
import type { MessageChunk, ToolContext } from "@keelson/shared";
import { loadMethod, methodCorpus, parsePage } from "../src/method.ts";
import { filmGuideTool } from "../src/tools.ts";

const FIXTURE = new URL("./fixtures/method", import.meta.url).pathname;

async function call(input: unknown, dir = FIXTURE) {
  const chunks: MessageChunk[] = [];
  const ctx = {
    cwd: "/",
    abortSignal: new AbortController().signal,
    emit: (c: MessageChunk) => chunks.push(c),
  };
  await filmGuideTool(dir).execute(input, ctx as unknown as ToolContext);
  const result = chunks.find((c) => c.type === "tool_result") as
    | { content: string; isError?: boolean }
    | undefined;
  return result!;
}

describe("method pages", () => {
  test("the overview leads the listing", () => {
    expect(loadMethod(FIXTURE).map((p) => p.topic)).toEqual(["method", "storyboard"]);
  });

  test("title and summary come from the page", () => {
    const page = parsePage("x", "# Title\n\nFirst line of prose.\n\n## More");
    expect(page.title).toBe("Title");
    expect(page.summary).toBe("First line of prose.");
  });

  test("the corpus carries every page", () => {
    const corpus = methodCorpus(loadMethod(FIXTURE));
    expect(corpus).toContain("# Narrated video");
    expect(corpus).toContain("# Storyboard");
  });

  test("a missing directory reads as no pages", () => {
    expect(loadMethod(`${FIXTURE}/nope`)).toEqual([]);
  });
});

describe("film_guide", () => {
  test("no topic lists every topic", async () => {
    const r = await call({});
    expect(r.isError).toBeUndefined();
    expect(r.content).toContain("- method: Narrated video.");
    expect(r.content).toContain("- storyboard: Storyboard.");
  });

  test("a topic returns its page, case-insensitively", async () => {
    const r = await call({ topic: "Storyboard" });
    expect(r.content).toContain("approved before anything is voiced");
  });

  test("an unknown topic errors and names the topics", async () => {
    const r = await call({ topic: "lighting" });
    expect(r.isError).toBe(true);
    expect(r.content).toContain("method, storyboard");
  });

  test("an empty method errors instead of answering blank", async () => {
    const r = await call({}, `${FIXTURE}/nope`);
    expect(r.isError).toBe(true);
  });
});

describe("the shipped method", () => {
  const pages = loadMethod();

  test("serves every topic the overview names, overview first", () => {
    expect(pages.map((p) => p.topic)).toEqual([
      "method",
      "capture",
      "compose",
      "craft",
      "media",
      "motion",
      "review",
      "series",
      "sound",
      "storyboard",
    ]);
  });

  // The repo is public: method pages describe the craft, never one library or one person's machine.
  test("carries nothing from a particular library or machine", () => {
    const corpus = methodCorpus(pages);
    for (const leak of [
      /~\//,
      /\/Users\//,
      /workspace\/videos/,
      /keelson-media/,
      /claude\.ai\/artifact/,
      /\.claude\//,
      /Harper/,
      /\bFIG\. \d/,
      /\bDET\. \d/,
      /Fieldnotes/,
      /spi-workspace/,
    ]) {
      expect(corpus).not.toMatch(leak);
    }
  });
});
