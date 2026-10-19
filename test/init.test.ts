import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MessageChunk, ToolContext } from "@keelson/shared";
import { pieceInfo } from "../src/info.ts";
import { initLibrary, isLibrarySite, STARTER_PIECE } from "../src/init.ts";
import { scanLibrary } from "../src/library.ts";
import { filmInitTool } from "../src/tools.ts";

const dirs: string[] = [];
const fresh = () => {
  const d = mkdtempSync(join(tmpdir(), "film-init-"));
  dirs.push(d);
  return d;
};
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

async function init(cwd: string, input: unknown = {}) {
  const chunks: MessageChunk[] = [];
  const ctx = {
    cwd,
    abortSignal: new AbortController().signal,
    emit: (c: MessageChunk) => chunks.push(c),
  };
  await filmInitTool().execute(input, ctx as unknown as ToolContext);
  const r = chunks.find((c) => c.type === "tool_result") as { content: string; isError?: boolean };
  return { ...r, body: JSON.parse(r.content) };
}

describe("film init", () => {
  test("writes a library whose sample piece is scripted, publishable and human-gated", () => {
    const lib = fresh();
    const { written, kept } = initLibrary(lib);
    expect(kept).toEqual([]);
    expect(written).toContain(".gitignore");
    expect(existsSync(join(lib, "_gitignore"))).toBe(false);
    const info = pieceInfo(STARTER_PIECE, lib);
    expect(info).toMatchObject({ library: lib, stage: "scripted", plate: true, gate: "human" });
    expect(info.publishTo).toBe(join(lib, "published/first-steps/fig-01/fig-01.mp4"));
    expect(scanLibrary(lib).series.map((s) => s.id)).toEqual(["first-steps"]);
  });

  test("an existing file is kept, not overwritten", () => {
    const lib = fresh();
    mkdirSync(join(lib, STARTER_PIECE), { recursive: true });
    writeFileSync(join(lib, STARTER_PIECE, "short.yaml"), "title: mine\n");
    const { kept } = initLibrary(lib);
    expect(kept).toEqual([`${STARTER_PIECE}/short.yaml`]);
    expect(readFileSync(join(lib, STARTER_PIECE, "short.yaml"), "utf8")).toBe("title: mine\n");
  });

  test("every line of the sample is narrated on a plate board", () => {
    const m = Bun.YAML.parse(
      readFileSync(join(import.meta.dir, "../starter", STARTER_PIECE, "short.yaml"), "utf8"),
    ) as { plate: { boards: { lines: string[] }[] }; lines: { id: string }[] };
    expect(m.plate.boards.flatMap((b) => b.lines).sort()).toEqual(m.lines.map((l) => l.id).sort());
  });

  test("a bare init refuses a busy folder that is not a repo or library, and writes nothing", async () => {
    const busy = fresh();
    writeFileSync(join(busy, "notes.txt"), "x");
    expect(isLibrarySite(busy)).toBe(false);
    const r = await init(busy);
    expect(r.isError).toBe(true);
    expect(r.body.error).toContain("pass dir");
    expect(existsSync(join(busy, STARTER_PIECE))).toBe(false);
  });

  test("a bare init works in an empty folder or a repo, and names the sample by absolute path", async () => {
    const empty = fresh();
    const repo = fresh();
    mkdirSync(join(repo, ".git"));
    writeFileSync(join(repo, "README.md"), "x");
    for (const cwd of [empty, repo]) {
      const r = await init(cwd);
      expect(r.isError).toBeUndefined();
      expect(r.body.sample).toBe(join(cwd, STARTER_PIECE));
      expect(r.body.next).toContain(join(cwd, STARTER_PIECE));
    }
  });

  test("an explicit dir is always honoured", async () => {
    const busy = fresh();
    writeFileSync(join(busy, "notes.txt"), "x");
    const r = await init(busy, { dir: "films" });
    expect(r.body.library).toBe(join(busy, "films"));
  });
});
