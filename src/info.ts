import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { libraryRootFor, publishTarget, scanLibrary } from "./library.ts";
import { decideGate, type GateAnswer, reviewerMinutes } from "./series.ts";

export interface PieceInfo {
  piece: string;
  library: string;
  series: string;
  title: string;
  stage: string;
  stale: boolean | null;
  publishTo: string | null;
  plate: boolean;
  gate: GateAnswer;
  reviewerMinutes: number;
}

// What a workflow needs to know about one piece before it cuts: where it is, whether it has a
// plate to render, and who answers its cut gate under the series policy.
export function pieceInfo(target: string, cwd: string = process.cwd()): PieceInfo {
  const dir = resolve(cwd, target.endsWith("short.yaml") ? join(target, "..") : target);
  if (!existsSync(join(dir, "short.yaml"))) throw new Error(`no short.yaml in ${dir}`);
  const library = libraryRootFor(dir);
  const lib = scanLibrary(library);
  const series = lib.series.find((s) => s.pieces.some((p) => p.dir === dir));
  const piece = series?.pieces.find((p) => p.dir === dir);
  if (!series || !piece) throw new Error(`${dir} is not inside the library at ${library}`);
  const manifest = (Bun.YAML.parse(readFileSync(join(dir, "short.yaml"), "utf8")) ?? {}) as Record<
    string,
    unknown
  >;
  const pub = publishTarget(manifest, series);
  const approvedCuts = series.pieces.filter((p) => p.stage === "published").length;
  return {
    piece: dir,
    library,
    series: series.id,
    title: piece.title,
    stage: piece.stage,
    stale: piece.stale,
    publishTo: pub?.dir && pub.file ? join(library, pub.dir, pub.file) : null,
    plate: manifest.plate !== undefined && manifest.plate !== null,
    gate: decideGate(series.config, "cut", approvedCuts),
    reviewerMinutes: reviewerMinutes(series.config),
  };
}
