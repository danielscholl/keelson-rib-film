import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const TOOLS = join(import.meta.dir, "../tools");

// voices.py imports only the standard library, so plain python3 runs it.
function py(code: string): unknown {
  const r = Bun.spawnSync([
    "python3",
    "-I",
    "-c",
    `import sys, json; sys.path.insert(0, ${JSON.stringify(TOOLS)})\n${code}`,
  ]);
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  return JSON.parse(r.stdout.toString());
}

describe("voice engines", () => {
  test("a bare name is an Azure voice and keeps the take key older takes recorded", () => {
    expect(
      py(`from voices import parse_voice, take_key
v = parse_voice("en-US-Harper:MAI-Voice-2.1"); print(json.dumps([v, take_key(v)]))`),
    ).toEqual([
      { engine: "azure", name: "en-US-Harper:MAI-Voice-2.1" },
      "en-US-Harper:MAI-Voice-2.1",
    ]);
  });

  test("engine prefixes and mappings pick the engine, with its default model in the take", () => {
    expect(
      py(`from voices import parse_voice, take_key
print(json.dumps([take_key(parse_voice(s)) for s in ["system", "system:Samantha", "elevenlabs:v1",
  {"engine": "azure-openai", "model": "speech", "instructions": "warm"}]]))`),
    ).toEqual([
      "system",
      "system:Samantha",
      'elevenlabs:v1 {"model": "eleven_multilingual_v2"}',
      'azure-openai:alloy {"instructions": "warm", "model": "speech"}',
    ]);
  });

  test("an ElevenLabs voice without an id and an unknown engine are refused", () => {
    expect(() => py(`from voices import parse_voice; parse_voice("elevenlabs")`)).toThrow(
      "voice id",
    );
    expect(() => py(`from voices import parse_voice; parse_voice({"engine": "polly"})`)).toThrow(
      "unknown voice engine",
    );
  });

  test("character alignment joins into words split on whitespace", () => {
    expect(
      py(`from voices import words_from_chars
print(json.dumps(words_from_chars(list("Hi  there."), [0, .1, .2, .3, .4, .5, .6, .7, .8, .9], [.1, .2, .3, .4, .5, .6, .7, .8, .9, 1.0])))`),
    ).toEqual([
      ["Hi", 0, 0.2],
      ["there.", 0.4, 1.0],
    ]);
  });
});
