import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fillTemplate, scanLibrary, sha256 } from "../src/library.ts";
import { libraryStatus } from "../src/tools.ts";

let root: string;

function put(rel: string, body = "", ageMinutes = 0) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  const t = new Date(Date.now() - ageMinutes * 60_000);
  utimesSync(path, t, t);
}

const manifest = (fig: string, title: string) =>
  `fig: "${fig}"\nprefix: ep\ntitle: ${title}\nlines:\n  - { id: n1, text: "One." }\n  - { id: n2, text: "Two." }\n`;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "film-lib-"));
  put(
    "tour/series.yaml",
    "title: Tour\nprefix: ep\npublish: { dir: 'media/{series}/{prefix}-{fig}' }\ngates: { cut: { human_first: 2 } }\n",
  );
  // Scripted only.
  put("tour/ep-01-hello/short.yaml", manifest("01", "Hello"), 100);
  // Partly voiced.
  put("tour/ep-02-half/short.yaml", manifest("02", "Half"), 100);
  put("tour/ep-02-half/narr/n1.wav", "", 90);
  // Cut, checked, published, and current.
  put("tour/ep-03-done/short.yaml", manifest("03", "Done"), 100);
  put("tour/ep-03-done/narr/n1.wav", "", 90);
  put("tour/ep-03-done/narr/n2.wav", "", 90);
  put("tour/ep-03-done/final.mp4", "", 60);
  // A file touched after the cut with the same content is not a change.
  put(
    "tour/ep-03-done/build/cut.json",
    JSON.stringify({ inputs: { "short.yaml": sha256(join(root, "tour/ep-03-done/short.yaml")) } }),
    60,
  );
  utimesSync(join(root, "tour/ep-03-done/short.yaml"), new Date(), new Date());
  put("tour/ep-03-done/final.qa.png", "", 59);
  put("media/tour/ep-03/ep-03.mp4", "", 30);
  // Cut, then the plate changed; published copy predates the cut.
  put("tour/ep-04-stale/short.yaml", manifest("04", "Stale"), 100);
  put("tour/ep-04-stale/source/plate.html", "<p>v2</p>", 10);
  put("tour/ep-04-stale/final.mp4", "", 60);
  put(
    "tour/ep-04-stale/build/cut.json",
    JSON.stringify({
      inputs: {
        "short.yaml": sha256(join(root, "tour/ep-04-stale/short.yaml")),
        "source/plate.html": "old",
        [join(root, "media/tour/ep-04/ep-04.mp4")]: "size:0",
      },
    }),
    60,
  );
  put("media/tour/ep-04/ep-04.mp4", "", 120);
  // Checked but never published.
  put("tour/ep-05-ready/short.yaml", manifest("05", "Ready"), 100);
  put("tour/ep-05-ready/final.mp4", "", 60);
  put("tour/ep-05-ready/final.qa.png", "", 50);
  // No series.yaml: joins the series its manifest names.
  put("extras/teaser/short.yaml", "series: promos\ntitle: Teaser\n", 5);
  put("broken/short.yaml", "title: [unclosed\n", 5);
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

const piece = (id: string) =>
  scanLibrary(root)
    .series.flatMap((s) => s.pieces)
    .find((p) => p.id === id)!;

describe("stages and flags", () => {
  test("a manifest alone is scripted", () => {
    expect(piece("tour/ep-01-hello")).toMatchObject({
      stage: "scripted",
      flags: [],
      lines: 2,
      voiced: 0,
    });
  });

  test("some takes missing flags partial-voice", () => {
    expect(piece("tour/ep-02-half")).toMatchObject({
      stage: "scripted",
      flags: ["partial-voice"],
      voiced: 1,
    });
  });

  test("a published copy newer than the cut reads published, and a touched input is not stale", () => {
    expect(piece("tour/ep-03-done")).toMatchObject({ stage: "published", flags: [], stale: false });
  });

  test("an input whose content changed since the cut and an older published copy are both flagged", () => {
    expect(piece("tour/ep-04-stale")).toMatchObject({
      stage: "cut",
      flags: ["stale-cut", "republish"],
      stale: true,
    });
  });

  test("a cut with no record has unknown staleness, not a flag", () => {
    expect(piece("tour/ep-05-ready")).toMatchObject({ stale: null });
  });

  test("checked with a publish target and no copy is unpublished", () => {
    expect(piece("tour/ep-05-ready")).toMatchObject({ stage: "checked", flags: ["unpublished"] });
  });

  test("a manifest that is not YAML is flagged, not dropped", () => {
    expect(piece("broken").flags).toEqual(["bad-manifest"]);
  });
});

describe("series discovery", () => {
  test("pieces group under the nearest series.yaml, else the named or folder series", () => {
    const lib = scanLibrary(root);
    expect(lib.series.map((s) => [s.id, s.configured, s.pieces.length])).toEqual([
      ["broken", false, 1],
      ["promos", false, 1],
      ["tour", true, 5],
    ]);
  });

  test("published output is not mistaken for a piece", () => {
    expect(scanLibrary(root).series.some((s) => s.id === "media")).toBe(false);
  });
});

describe("status", () => {
  test("next cut gate follows the series' human_first count", () => {
    const tour = libraryStatus(root).series.find((s) => s.id === "tour")!;
    expect(tour.nextGates).toMatchObject({ storyboard: "human", cut: "human", publish: "human" });
  });
});

describe("templates", () => {
  test("a missing key yields no path", () => {
    expect(fillTemplate("media/{series}/{prefix}-{fig}", { series: "s", fig: "01" })).toBeNull();
    expect(fillTemplate("media/{series}/{fig}", { series: "s", fig: "01" })).toBe("media/s/01");
  });
});
