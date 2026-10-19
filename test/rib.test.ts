import { describe, expect, test } from "bun:test";
import { configuredNames, probeServices, probeToolchain } from "../src/doctor.ts";
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
    const probes = probeToolchain(
      (bin) => (bin === "uv" ? null : `/usr/bin/${bin}`),
      () => true,
      "darwin",
    );
    const missing = probes.filter((p) => !p.found);
    expect(missing.map((p) => p.name)).toEqual(["uv"]);
    expect(missing[0]?.hint).toContain("uv");
  });

  test("all present reads as ready", () => {
    expect(
      probeToolchain(
        (bin) => `/usr/bin/${bin}`,
        () => true,
        "darwin",
      ).every((p) => p.found),
    ).toBe(true);
  });

  test("a missing Chrome is reported", () => {
    const probes = probeToolchain(
      (bin) => `/usr/bin/${bin}`,
      () => false,
      "darwin",
    );
    expect(probes.filter((p) => !p.found).map((p) => p.name)).toEqual(["Google Chrome"]);
  });
});

describe("media services", () => {
  test("each service turns on from its own key, and an Azure resource covers speech and Sora", () => {
    const off = probeServices(new Set(), true);
    expect(off.every((s) => !s.on)).toBe(true);
    const azure = probeServices(
      new Set(["AZURE_AI_RESOURCE", "AZURE_AI_GROUP", "AZURE_SUBSCRIPTION_ID"]),
      true,
    );
    expect(azure.map((s) => s.on)).toEqual([true, true, false]);
    const noAz = probeServices(
      new Set(["AZURE_AI_RESOURCE", "AZURE_AI_GROUP", "AZURE_SUBSCRIPTION_ID"]),
      false,
    );
    expect(noAz.some((s) => s.on)).toBe(false);
    expect(probeServices(new Set(["GEMINI_API_KEY"]), false)[2]?.on).toBe(true);
  });

  test("names come from the environment and the env file, empty values do not count", () => {
    const names = configuredNames(
      { GEMINI_API_KEY: "", PATH: "/bin" },
      "/lib/.env.local",
      () => "# comment\nAZURE_SPEECH_KEY=abc\nEMPTY=\n",
    );
    expect(names.has("AZURE_SPEECH_KEY")).toBe(true);
    expect(names.has("GEMINI_API_KEY")).toBe(false);
    expect(names.has("EMPTY")).toBe(false);
  });
});
