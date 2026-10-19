import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pieceInfo } from "../src/info.ts";
import { initLibrary, STARTER_PIECE } from "../src/init.ts";
import { scanLibrary } from "../src/library.ts";

const dirs: string[] = [];
const fresh = () => {
  const d = mkdtempSync(join(tmpdir(), "film-init-"));
  dirs.push(d);
  return d;
};
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

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
});
