import { describe, expect, test } from "bun:test";
import { decideGate, parseSeries, reviewerMinutes } from "../src/series.ts";

describe("gate policy", () => {
  test("defaults: storyboard and sample go to a person, cuts after three go to the reviewer", () => {
    expect(decideGate({}, "storyboard", 10)).toBe("human");
    expect(decideGate({}, "sample", 10)).toBe("human");
    expect(decideGate({}, "cut", 2)).toBe("human");
    expect(decideGate({}, "cut", 3)).toBe("reviewer");
    expect(reviewerMinutes({})).toBe(15);
  });

  test("publish goes to a person whatever the series says", () => {
    const { config } = parseSeries("gates: { storyboard: reviewer, cut: reviewer }\n");
    expect(decideGate(config, "publish", 99)).toBe("human");
    expect(decideGate(config, "storyboard", 0)).toBe("reviewer");
    expect(decideGate(config, "cut", 0)).toBe("reviewer");
  });

  test("human_first sets how many cuts a person answers", () => {
    const { config } = parseSeries("gates: { cut: { human_first: 1 } }\n");
    expect(decideGate(config, "cut", 0)).toBe("human");
    expect(decideGate(config, "cut", 1)).toBe("reviewer");
  });
});

describe("parsing", () => {
  test("unknown keys pass through for later use", () => {
    expect(parseSeries("title: Tour\ncolor: navy\n").config).toMatchObject({
      title: "Tour",
      color: "navy",
    });
  });

  test("a bad gate value reports an error and falls back to defaults", () => {
    const r = parseSeries("gates: { cut: sometimes }\n");
    expect(r.error).toContain("series.yaml");
    expect(decideGate(r.config, "cut", 0)).toBe("human");
  });

  test("invalid YAML reports an error", () => {
    expect(parseSeries("gates: [\n").error).toContain("not valid YAML");
  });
});

describe("voice", () => {
  test("a voice is a name or an engine mapping, and an unknown engine is reported", () => {
    expect(parseSeries("voice: en-US-Ava\n").error).toBeUndefined();
    expect(parseSeries("voice: { engine: elevenlabs, name: abc }\n").error).toBeUndefined();
    expect(parseSeries("voice: { engine: polly }\n").error).toContain("series.yaml");
  });
});
