// Render a short's plate boards (motion graphics on the blueprint sheet) to one video.
// Usage: node plate.mjs <short-dir> [--only t1,t2,...] [--verify] [--fps N] [--subframes K] [--from S --to E]
//   --only       writes PNG stills to raw/plate-stills for checking
//   --verify     purity and font check: each sampled frame rendered from a cold seek and after playing up to it must
//                match, and every font family the page asks for must be installed; writes nothing, exits 1 on a defect
//   --fps N      output frame rate (default 30)
//   --subframes K  motion blur: K sub-frames per output frame across a 180-degree shutter, averaged (60 fps and K=4 for
//                fast camera moves; a board that only reads doesn't need it)
//   --from/--to  render only that window of plate seconds to raw/plate-<S>-<E>.mp4, leaving the plate's out alone
// short.yaml `plate`: { html, out, boards: [{ id, lines: [ids], lead, gap, gaps: { lineId: s }, tail }] }. Each board lasts
// lead + its lines (with gap between) + tail, so narration sets the pacing. The page gets
// window.setup(T, words) and must build a paused GSAP timeline on window.tl; T[board] = { s, e, lines: { id: { n, d } } }
// in plate seconds, words[id] = [[word, start, end], ...] relative to the line. Writes source/plate-marks.json
// ({ board: s, "board.end": e, lineId: n }) for compose, and the encoded video.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import YAML from "yaml";

const argv = process.argv.slice(2);
const dir = resolve(argv[0]);
const opt = (name) => { const i = argv.indexOf(name); return i > 0 ? argv[i + 1] : undefined; };
const fps = Number(opt("--fps") ?? 30);
const K = Math.max(1, Number(opt("--subframes") ?? 1));
const SHUTTER = 0.5;
const only = opt("--only")?.split(",").map(Number) ?? null;
const verify = argv.includes("--verify");
const from = opt("--from") !== undefined ? Number(opt("--from")) : null;
const to = opt("--to") !== undefined ? Number(opt("--to")) : null;
const M = YAML.parse(readFileSync(join(dir, "short.yaml"), "utf8"));
const dur = JSON.parse(readFileSync(join(dir, "narr/durations.json"), "utf8"));
const words = JSON.parse(readFileSync(join(dir, "narr/words.json"), "utf8"));

const T = {}, marks = {};
let t = 0;
for (const b of M.plate.boards) {
  const s = t;
  let n = s + (b.lead ?? 0.6);
  const lines = {};
  for (const [k, id] of b.lines.entries()) {
    if (k) n += b.gaps?.[id] ?? b.gap ?? 0.6;
    lines[id] = { n: +n.toFixed(3), d: dur[id] };
    marks[id] = +n.toFixed(3);
    n += dur[id];
  }
  t = n + (b.tail ?? 1.0);
  T[b.id] = { s: +s.toFixed(3), e: +t.toFixed(3), lines };
  marks[b.id] = +s.toFixed(3);
  marks[`${b.id}.end`] = +t.toFixed(3);
}
if (!verify) writeFileSync(join(dir, "source/plate-marks.json"), JSON.stringify(marks, null, 1));

// File access lets a board page load ES modules from disk (the Fieldnotes kit imports the training site this way).
const b = await chromium.launch({ channel: "chrome", args: ["--allow-file-access-from-files"] });
const [VW, VH] = M.plate.size ?? [1920, 1080];
const p = await b.newPage({ viewport: { width: VW, height: VH } });
p.on("pageerror", (e) => { console.error("PAGE ERROR", e.message); process.exit(1); });
p.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
await p.goto(`file://${join(dir, M.plate.html)}`);
await p.evaluate(() => document.fonts.ready);
await p.evaluate(([T, words]) => { window.setup(T, words); }, [T, words]);
// A board page may name its own transitions (window.fnMarks, e.g. the Fieldnotes kit's B.mark); keep them with the marks.
const extra = await p.evaluate(() => window.fnMarks || {});
if (!verify && Object.keys(extra).length) writeFileSync(join(dir, "source/plate-marks.json"), JSON.stringify({ ...marks, ...extra }, null, 1));
// Images a board adds in setup (HTML or SVG) must be decoded before the first frame is taken.
await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {})).concat(
  [...document.querySelectorAll("image")].map((i) => { const im = new Image(); im.src = i.href.baseVal; return im.decode().catch(() => {}); }))));

// tl.seek returns the timeline, which page.evaluate cannot serialize; return nothing.
const seek = (x) => p.evaluate((x) => { window.tl.seek(x, false); }, x);

if (verify) {
  // A family is missing when text set in it measures the same as the fallback under two different generics.
  const missing = await p.evaluate(() => {
    const generic = new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-monospace",
      "ui-sans-serif", "ui-serif", "-apple-system", "blinkmacsystemfont", "inherit", "initial"]);
    const fams = new Set();
    for (const el of document.querySelectorAll("body *")) {
      if (["SCRIPT", "STYLE", "TEMPLATE"].includes(el.tagName)) continue;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const first = getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
      if (first && !generic.has(first.toLowerCase())) fams.add(first);
    }
    const c = document.createElement("canvas").getContext("2d");
    const w = (f) => { c.font = `48px ${f}`; return c.measureText("mmmmmmmmmmlli0O@#WQ").width; };
    return [...fams].filter((f) => w(`"${f}", monospace`) === w("monospace") && w(`"${f}", serif`) === w("serif"));
  });
  const probes = new Set(Array.from({ length: 12 }, (_, k) => +((k + 0.5) * t / 12).toFixed(3)));
  for (const bd of Object.values(T)) probes.add(+Math.min(bd.s + 0.25, t - 0.01).toFixed(3));
  const raw = (buf, name) => {
    const dir = mkdtempSync(join(tmpdir(), "plate-verify-"));
    const f = join(dir, `${name}.png`);
    writeFileSync(f, buf);
    const px = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 26 });
    rmSync(dir, { recursive: true, force: true });
    return px;
  };
  const bad = [];
  for (const x of [...probes].sort((a, b) => a - b)) {
    await seek(0); await seek(x);
    const cold = await p.screenshot({ type: "png" });
    for (let y = Math.max(0, x - 0.5); y < x; y += 1 / 30) await seek(y);
    await seek(x);
    const warm = await p.screenshot({ type: "png" });
    if (cold.equals(warm)) continue;
    const A = raw(cold, "a"), B = raw(warm, "b");
    let n = 0;
    for (let i = 0; i < A.length; i += 3) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 24) n++;
    if (n > 50) bad.push(`${x.toFixed(2)}s (${n} px differ)`);
  }
  await b.close();
  console.log(`verify: ${probes.size} frames, ${bad.length ? `NOT PURE at ${bad.join(", ")}` : "seek is pure"}; ` +
    `fonts: ${missing.length ? `MISSING ${missing.join(", ")}` : "all installed"}`);
  process.exit(bad.length || missing.length ? 1 : 0);
}

const win = from !== null || to !== null;
const S = from ?? 0, E = Math.min(to ?? t, t);
const tag = win ? `-${S}-${E}` : "";
const out = join(dir, only ? "raw/plate-stills" : `raw/plate-frames${tag}`);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const k0 = win ? Math.ceil(S * fps - 1e-6) : 0, k1 = win ? Math.ceil(E * fps - 1e-6) : Math.round(t * fps);
const frames = only ?? Array.from({ length: Math.max(0, k1 - k0) }, (_, k) => (k0 + k) / fps);
// Output frame k shows time k/fps; with sub-frames it is the average of K samples across the first half of that
// frame's interval, written as K consecutive images so the encoder can average each group of K.
const times = only ? frames : frames.flatMap((x) => Array.from({ length: K }, (_, j) => x + (j * SHUTTER) / (K * fps)));
for (let k = 0; k < times.length; k++) {
  await seek(times[k]);
  await p.screenshot({ path: join(out, `${String(k).padStart(5, "0")}.${only ? "png" : "jpg"}`), ...(only ? {} : { type: "jpeg", quality: 95 }) });
  if (!only && k % 300 === 0) console.log(`frame ${k} / ${times.length}`);
}
await b.close();
const dest = win ? join(dir, `raw/plate${tag}.mp4`) : join(dir, M.plate.out);
if (!only) {
  // tmix averages each frame with the K-1 before it, so the frame that closes a group (n mod K = K-1) holds that group.
  const blend = K > 1 ? [`tmix=frames=${K},select='eq(mod(n\\,${K})\\,${K - 1})',setpts=N/(${fps}*TB),`, "-r", String(fps)] : [""];
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-framerate", String(fps * K), "-i", join(out, "%05d.jpg"),
    "-vf", `${blend[0]}scale=in_range=pc:out_range=tv,format=yuv420p`, ...blend.slice(1), "-c:v", "libx264", "-crf", "16", "-preset", "slow",
    "-color_range", "tv", dest]);
  rmSync(out, { recursive: true, force: true });
}
console.log(`plate ${t.toFixed(2)}s, ${M.plate.boards.length} boards${only ? `, ${times.length} stills in raw/plate-stills`
  : ` -> ${dest.slice(dir.length + 1)} (${frames.length} frames at ${fps} fps${K > 1 ? `, ${K} sub-frames each` : ""})`}`);
