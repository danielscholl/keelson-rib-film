import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parseSeries, type SeriesConfig } from "./series.ts";

export type Stage = "scripted" | "voiced" | "cut" | "checked" | "published";

export type Flag =
  | "stale-cut" // an input recorded at cut time has changed since
  | "partial-voice" // some lines have no take
  | "republish" // the published copy is older than the cut
  | "unpublished" // checked, with a publish target, and not published
  | "bad-manifest";

export interface Piece {
  id: string;
  dir: string;
  series: string;
  title: string;
  stage: Stage;
  flags: Flag[];
  lines: number;
  voiced: number;
  cutAt: string | null;
  publishedAt: string | null;
  // null when the cut left no record of its inputs, so staleness is unknown.
  stale: boolean | null;
  error?: string;
}

export const CUT_RECORD = "build/cut.json";

export interface CutRecord {
  inputs: Record<string, string>;
}

export function sha256(path: string): string | null {
  try {
    return new Bun.CryptoHasher("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return null;
  }
}

export function isStale(dir: string): boolean | null {
  let record: CutRecord;
  try {
    record = JSON.parse(readFileSync(join(dir, CUT_RECORD), "utf8")) as CutRecord;
  } catch {
    return null;
  }
  if (!record?.inputs || typeof record.inputs !== "object") return null;
  return Object.entries(record.inputs).some(([path, recorded]) => {
    const abs = resolve(dir, path);
    if (recorded.startsWith("size:")) {
      try {
        return `size:${statSync(abs).size}` !== recorded;
      } catch {
        return true;
      }
    }
    return sha256(abs) !== recorded;
  });
}

export interface Series {
  id: string;
  dir: string;
  config: SeriesConfig;
  configured: boolean;
  error?: string;
  pieces: Piece[];
}

export interface Library {
  root: string;
  series: Series[];
}

const SKIP_DIRS = new Set(["node_modules", ".git", "raw", "narr", "build", "cards", "media"]);
const MAX_DEPTH = 6;

// Same rule as tools/filmlib.py: FILM_LIBRARY, else the nearest folder with assets/ or .git.
export function libraryRootFor(
  start: string,
  env: string | undefined = process.env.FILM_LIBRARY,
): string {
  if (env) return resolve(env);
  let dir = resolve(start);
  for (;;) {
    if (isDir(join(dir, "assets")) || existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

export function findManifests(root: string, ignore: readonly string[] = []): string[] {
  const found: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > MAX_DEPTH) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    if (entries.includes("short.yaml")) found.push(join(dir, "short.yaml"));
    for (const name of entries) {
      if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
      const path = join(dir, name);
      const rel = relative(root, path);
      if (ignore.some((g) => new Bun.Glob(g).match(rel))) continue;
      if (isDir(path)) walk(path, depth + 1);
    }
  };
  walk(root, 0);
  return found.sort();
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function mtime(path: string): number | null {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return null;
  }
}

// The nearest series.yaml at or above the piece, up to the library root.
function seriesDirFor(pieceDir: string, root: string): string | null {
  let dir = dirname(pieceDir);
  while (dir.length >= root.length) {
    if (existsSync(join(dir, "series.yaml"))) return dir;
    if (dir === root) break;
    dir = dirname(dir);
  }
  return null;
}

export function fillTemplate(template: string, manifest: Record<string, unknown>): string | null {
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = manifest[key];
    if (v === undefined || v === null || v === "") {
      missing = true;
      return "";
    }
    return String(v);
  });
  return missing ? null : out;
}

// Same rule as tools/publish.py. A series with no publish block has no target, so nothing reads as published.
export function publishTarget(
  manifest: Record<string, unknown>,
  series: { config: SeriesConfig; dir?: string },
): { dir: string | null; file: string | null } | null {
  const target = series.config.publish;
  if (!target) return null;
  const seriesName =
    typeof manifest.series === "string" ? manifest.series : series.dir ? basename(series.dir) : "";
  const keys = { ...manifest, series: seriesName };
  const dir = fillTemplate(target.dir, keys);
  return {
    dir,
    file: target.file ? fillTemplate(target.file, keys) : dir && `${basename(dir)}.mp4`,
  };
}

export function readPiece(
  manifestPath: string,
  root: string,
  series: { id: string; config: SeriesConfig; dir?: string },
): Piece {
  const dir = dirname(manifestPath);
  const id = relative(root, dir).split(sep).join("/");
  const base: Piece = {
    id,
    dir,
    series: series.id,
    title: basename(dir),
    stage: "scripted",
    flags: [],
    lines: 0,
    voiced: 0,
    cutAt: null,
    publishedAt: null,
    stale: null,
  };

  let manifest: Record<string, unknown>;
  try {
    manifest = (Bun.YAML.parse(readFileSync(manifestPath, "utf8")) ?? {}) as Record<
      string,
      unknown
    >;
  } catch (e) {
    return { ...base, flags: ["bad-manifest"], error: (e as Error).message };
  }

  const lineIds = Array.isArray(manifest.lines)
    ? (manifest.lines as { id?: unknown }[])
        .map((l) => (typeof l?.id === "string" ? l.id : null))
        .filter((x): x is string => x !== null)
    : [];
  const voicedIds = lineIds.filter((lid) => existsSync(join(dir, "narr", `${lid}.wav`)));
  const flags: Flag[] = [];
  let stage: Stage = "scripted";
  let stale: boolean | null = null;

  if (lineIds.length > 0 && voicedIds.length === lineIds.length) stage = "voiced";
  else if (voicedIds.length > 0) flags.push("partial-voice");

  const cut = mtime(join(dir, "final.mp4"));
  if (cut !== null) {
    stage = "cut";
    stale = isStale(dir);
    if (stale) flags.push("stale-cut");
    const checked = mtime(join(dir, "final.qa.png"));
    if (checked !== null && checked >= cut) stage = "checked";
  }

  let published: number | null = null;
  const target = publishTarget(manifest, series);
  if (target && cut !== null) {
    const { dir: pubDir, file: pubFile } = target;
    if (pubDir && pubFile) {
      published = mtime(join(root, pubDir, pubFile));
      if (published !== null) {
        if (published >= cut) stage = "published";
        else flags.push("republish");
      } else if (stage === "checked") {
        flags.push("unpublished");
      }
    }
  }

  return {
    ...base,
    title: typeof manifest.title === "string" ? manifest.title : base.title,
    stage,
    flags,
    lines: lineIds.length,
    voiced: voicedIds.length,
    cutAt: cut === null ? null : new Date(cut).toISOString(),
    publishedAt: published === null ? null : new Date(published).toISOString(),
    stale,
  };
}

export function scanLibrary(root: string): Library {
  const byDir = new Map<string, Series>();
  const loose = new Map<string, Series>();

  const seriesAt = (dir: string): Series => {
    let s = byDir.get(dir);
    if (!s) {
      const { config, error } = parseSeries(readFileSync(join(dir, "series.yaml"), "utf8"));
      const id = dir === root ? basename(root) : relative(root, dir).split(sep).join("/");
      s = { id, dir, config, configured: true, pieces: [], ...(error ? { error } : {}) };
      byDir.set(dir, s);
    }
    return s;
  };

  // A piece with no series.yaml above it joins the series named in its manifest,
  // else the library folder it sits in.
  const looseFor = (manifestPath: string): Series => {
    const dir = dirname(manifestPath);
    let named: string | undefined;
    try {
      const m = Bun.YAML.parse(readFileSync(manifestPath, "utf8")) as { series?: unknown } | null;
      if (typeof m?.series === "string") named = m.series;
    } catch {}
    const id = named ?? relative(root, dir).split(sep)[0] ?? basename(root);
    let s = loose.get(id);
    if (!s) {
      s = { id, dir: join(root, id), config: {}, configured: false, pieces: [] };
      loose.set(id, s);
    }
    return s;
  };

  const rootIgnore = existsSync(join(root, "series.yaml"))
    ? (parseSeries(readFileSync(join(root, "series.yaml"), "utf8")).config.ignore ?? [])
    : [];
  for (const manifest of findManifests(root, rootIgnore)) {
    const sdir = seriesDirFor(dirname(manifest), root);
    const series = sdir ? seriesAt(sdir) : looseFor(manifest);
    const rel = relative(series.dir, dirname(manifest));
    if (series.config.ignore?.some((g) => new Bun.Glob(g).match(rel))) continue;
    series.pieces.push(readPiece(manifest, root, series));
  }

  const series = [...byDir.values(), ...loose.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { root, series };
}
