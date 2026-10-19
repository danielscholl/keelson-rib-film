// The card renderer: every overlay a short uses, drawn by Chrome so text needs no ffmpeg font support.
// Usage: node cards.mjs <spec.json>   spec = { "out": dir, "cards": [{ "file", "kind", ... }], "theme"?, "kinds"?, "library"? }
// Kinds: viewport (sheet + header + frame behind demo footage), figtag, sheet (closer title block), caption,
// callout, blank. A library adds its own kinds (its bookend cards, say) as .mjs modules in spec.kinds, each
// exporting default ({ C, mark, esc, theme }) => ({ kind: (card) => html }).
// theme: see theme.mjs; brand, series and mark (inline SVG or a .svg path in the library; {ink} and {accent} are filled in).
import { chromium } from "playwright";
import { existsSync, readFileSync, readdirSync, mkdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveTheme, rgba } from "./theme.mjs";

const spec = JSON.parse(readFileSync(process.argv[2], "utf8"));
mkdirSync(spec.out, { recursive: true });
const T = spec.theme ?? {};
const R = resolveTheme(T, spec.library);
const C = R.C;
const line = rgba(C.primary, ".45");
const base = `<style>*{margin:0;box-sizing:border-box}html,body{width:1920px;height:1080px;background:transparent;font-family:${R.font};-webkit-font-smoothing:antialiased;color:${C.ink}}
.mono{font-family:${R.mono}}.h1{font-weight:300;letter-spacing:.12em;text-transform:uppercase;line-height:1.1}
.brand{display:flex;align-items:center;gap:22px;font-weight:700;letter-spacing:.42em;font-size:34px}.rule{height:3px;width:260px;background:linear-gradient(90deg,transparent,${C.brass},transparent)}
.sheet{position:absolute;inset:0;background:${R.background}}
.crop{position:absolute;width:26px;height:26px;border:0 solid ${rgba(C.primary, ".5")}}</style>`;
const markSvg = !T.mark ? "" : T.mark.trim().startsWith("<") ? T.mark
  : readFileSync(isAbsolute(T.mark) ? T.mark : join(spec.library ?? ".", T.mark), "utf8");
const mark = (ink, s = 56) => markSvg
  ? markSvg.replaceAll("{ink}", ink).replaceAll("{accent}", C.brass).replace("<svg", `<svg width="${s}" height="${s}"`)
  : "";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const crops = R.crops ? `
    <div class="crop" style="left:40px;top:14px;border-left-width:2px;border-top-width:2px"></div>
    <div class="crop" style="right:40px;top:14px;border-right-width:2px;border-top-width:2px"></div>
    <div class="crop" style="left:40px;bottom:14px;border-left-width:2px;border-bottom-width:2px"></div>
    <div class="crop" style="right:40px;bottom:14px;border-right-width:2px;border-bottom-width:2px"></div>` : "";

const kinds = {
  viewport: ({ header, label = "", rect: [x, y, w, h] }) => `<div class="sheet"></div>${crops}
    <div class="mono" style="position:absolute;left:${x}px;width:${w}px;top:34px;height:44px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid ${line};font-size:18px;letter-spacing:.2em;color:${C.keel}">
      <div style="display:flex;align-items:center;gap:16px">${mark(C.keel, 30)}<span>${header}</span></div><span style="color:${C.muted}">${esc(label)}</span></div>
    <div style="position:absolute;left:${x - 8}px;top:${y - 8}px;width:${w + 16}px;height:${h + 16}px;border:2px solid ${C.keel};background:${C.frame}"></div>`,

  figtag: ({ text, top = 104 }) => `<div class="mono" style="position:absolute;right:140px;top:${top}px;padding:12px 22px;background:${C.keel};color:${C.onPrimary};font-size:24px;font-weight:700;letter-spacing:.18em">${esc(text)}</div>`,

  sheet: ({ text, title = "", series = T.series ?? "" }) => `<div class="mono" style="position:absolute;right:96px;bottom:72px;min-width:440px;background:${rgba(C.paper, ".94")};border:2px solid ${C.keel};color:${C.keel}">
    ${series ? `<div style="padding:10px 20px;border-bottom:1.5px solid ${line};font-size:16px;letter-spacing:.24em;color:${C.muted}">${esc(series)}</div>` : ""}
    <div style="padding:14px 20px 4px;font-size:32px;font-weight:700;letter-spacing:.16em">${esc(text)}</div>
    <div style="padding:0 20px 14px;font-size:18px;letter-spacing:.2em;color:${C.brassInk}">${esc(title.toUpperCase())}</div></div>`,

  caption: ({ text, rect: [x, y, w, h], tone = "light" }) => {
    const panel = tone === "dark"
      ? `background:${rgba(C.shade, ".9")};border-left:5px solid ${C.brass};color:${C.onShade};font-weight:500`
      : `background:${rgba(C.paper, ".92")};border-top:1.5px solid ${line};border-bottom:1.5px solid ${line};color:${C.ink};font-weight:400`;
    return `<div style="position:absolute;left:${x}px;width:${w}px;top:${y}px;height:${h - 30}px;display:flex;justify-content:center;align-items:flex-end">
      <div style="max-width:${Math.min(w - 60, 1560)}px;padding:12px 30px;${panel};font-size:40px;line-height:1.32;text-align:center">${esc(text)}</div></div>`;
  },

  callout: ({ text, anchor: [ax, ay], label }) => {
    const [lx, ly] = label || [ax + 90, ay - 110];
    return `<svg width="1920" height="1080" style="position:absolute;inset:0"><line x1="${ax}" y1="${ay}" x2="${lx}" y2="${ly + 22}" stroke="${C.brass}" stroke-width="2.5"/>
      <circle cx="${ax}" cy="${ay}" r="9" fill="none" stroke="${C.brass}" stroke-width="3"/><circle cx="${ax}" cy="${ay}" r="3" fill="${C.brass}"/></svg>
      <div class="mono" style="position:absolute;left:${lx}px;top:${ly}px;padding:8px 16px;background:${rgba(C.paper, ".95")};border:2px solid ${C.brass};color:${C.brassInk};font-size:26px;font-weight:700;letter-spacing:.06em;white-space:nowrap">${esc(text)}</div>`;
  },

  blank: () => `<div class="sheet"></div>${crops}`,

};

if (spec.kinds && existsSync(spec.kinds)) {
  for (const f of readdirSync(spec.kinds).filter((n) => n.endsWith(".mjs")).sort()) {
    const mod = await import(pathToFileURL(join(spec.kinds, f)).href);
    Object.assign(kinds, mod.default({ C, mark, esc, theme: T, look: R }));
  }
}

const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const card of spec.cards) {
  const render = kinds[card.kind];
  if (!render) throw new Error(`unknown card kind ${card.kind}`);
  await p.setContent(base + render(card));
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: join(spec.out, card.file), omitBackground: true });
}
await b.close();
console.log(`cards ok (${spec.cards.length})`);
