import { describe, expect, test } from "bun:test";
import { probeToolchain } from "../src/doctor.ts";
import rib from "../src/index.ts";

describe("rib identity", () => {
  test("id matches the package basename rule", () => {
    expect(rib.id).toBe("film");
  });

  test("every view key lives in the rib namespace", () => {
    for (const v of rib.views ?? []) {
      expect(v.key.startsWith("rib:film:")).toBe(true);
    }
  });
});

describe("toolchain probe", () => {
  test("reports each missing binary with an install hint", () => {
    const probes = probeToolchain((bin) => (bin === "uv" ? null : `/usr/bin/${bin}`));
    const missing = probes.filter((p) => !p.found);
    expect(missing.map((p) => p.name)).toEqual(["uv"]);
    expect(missing[0]?.hint).toContain("uv");
  });

  test("all present reads as ready", () => {
    expect(probeToolchain((bin) => `/usr/bin/${bin}`).every((p) => p.found)).toBe(true);
  });
});
