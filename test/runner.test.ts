import { describe, expect, test } from "bun:test";
import { commandFor, listTools } from "../src/runner.ts";

describe("production line", () => {
  const tools = listTools();

  test("every tool is listed with a summary, and shared modules are not tools", () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain("compose");
    expect(names).toContain("publish");
    expect(names).not.toContain("filmlib");
    for (const t of tools) expect(t.summary.length).toBeGreaterThan(0);
  });

  test("python runs in the rib's uv project, node and bash run directly", () => {
    const by = (n: string) => tools.find((t) => t.name === n)!;
    expect(commandFor(by("compose"), ["x"], "/rib/tools").slice(0, 5)).toEqual([
      "uv",
      "run",
      "--quiet",
      "--project",
      "/rib/tools",
    ]);
    expect(commandFor(by("plate"), ["x"])[0]).toBe("node");
    expect(commandFor(by("qa"), ["x"])[0]).toBe("bash");
  });
});
