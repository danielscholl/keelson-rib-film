import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSeries } from "../src/series.ts";
import { pieceTheme, resolveTheme, themeVars } from "../tools/theme.mjs";

const root = mkdtempSync(join(tmpdir(), "film-theme-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("theme", () => {
  test("the default look is plain, with no grid and no crop marks", () => {
    const look = resolveTheme({});
    expect(look.background).not.toContain("72px");
    expect(look.crops).toBe(false);
  });

  test("blueprint keeps the grid, and the earlier color names still set their roles", () => {
    const look = resolveTheme({ look: "blueprint", colors: { keel: "#102030", brass: "#aa5500" } });
    expect(look.background).toContain("rgba(16,32,48,.07)");
    expect(look.C).toMatchObject({ primary: "#102030", accent: "#aa5500", keel: "#102030" });
  });

  test("an image background is inlined, a CSS value passes through, and a missing image fails", () => {
    writeFileSync(join(root, "bg.png"), "png");
    expect(resolveTheme({ background: "bg.png" }, root).background).toContain(
      "data:image/png;base64,",
    );
    expect(resolveTheme({ background: "#000" }).background).toBe("#000");
    expect(() => resolveTheme({ background: "nope.jpg" }, root)).toThrow("not found");
    expect(() => resolveTheme({ look: "neon" })).toThrow("unknown theme look");
  });

  test("plate variables carry every role and the background", () => {
    const vars = themeVars(resolveTheme({ look: "dark" }));
    expect(vars).toContain("--film-on-shade:");
    expect(vars).toContain("--film-background:");
    expect(vars).not.toContain("--film-keel");
  });

  test("a piece's manifest theme wins over its series", () => {
    mkdirSync(join(root, "assets"), { recursive: true });
    mkdirSync(join(root, "s", "p"), { recursive: true });
    writeFileSync(join(root, "s", "series.yaml"), "theme: { look: dark, brand: ACME }\n");
    const { theme } = pieceTheme(join(root, "s", "p"), { theme: { look: "plain" } });
    expect(theme).toEqual({ look: "plain", brand: "ACME" });
  });

  test("series.yaml with an unknown look is reported", () => {
    expect(parseSeries("theme: { look: neon }\n").error).toContain("series.yaml");
  });
});
