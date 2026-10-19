// The one card renderer: every overlay a short uses, in the docs blueprint palette and type.
// Usage: node cards.mjs <spec.json>   spec = { "out": dir, "cards": [{ "file", "kind", ... }] }
// Kinds: viewport (sheet + header + frame behind demo footage), figtag, sheet (closer title block),
// caption, callout, open-title and close-card (the shared bookends; rebuilt by assets/bookends/source/bookends.sh),
// field-open and field-close (the Field Trials bookends; assets/bookends/source/field-trials.py).
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const spec = JSON.parse(readFileSync(process.argv[2], "utf8"));
mkdirSync(spec.out, { recursive: true });
const C = { keel: "#1e3a5f", brass: "#b5803a", brassInk: "#8a5a1f", ink: "#0f1b2d", muted: "#51607a", paper: "#f3f5f8" };
const base = `<style>*{margin:0;box-sizing:border-box}html,body{width:1920px;height:1080px;background:transparent;font-family:Inter,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:${C.ink}}
.mono{font-family:"JetBrains Mono","SF Mono",monospace}.h1{font-weight:300;letter-spacing:.12em;text-transform:uppercase;line-height:1.1}
.brand{display:flex;align-items:center;gap:22px;font-weight:700;letter-spacing:.42em;font-size:34px}.rule{height:3px;width:260px;background:linear-gradient(90deg,transparent,${C.brass},transparent)}
.sheet{position:absolute;inset:0;background:linear-gradient(rgba(30,58,95,.07) 1px,transparent 1px) 0 0/72px 72px,linear-gradient(90deg,rgba(30,58,95,.07) 1px,transparent 1px) 0 0/72px 72px,
linear-gradient(rgba(30,58,95,.028) 1px,transparent 1px) 0 0/18px 18px,linear-gradient(90deg,rgba(30,58,95,.028) 1px,transparent 1px) 0 0/18px 18px,
radial-gradient(circle at 74% 0%,rgba(255,255,255,.9),transparent 700px),linear-gradient(180deg,#f3f5f8 0%,#e6eaf0 100%)}
.crop{position:absolute;width:26px;height:26px;border:0 solid rgba(30,58,95,.5)}</style>`;
const mark = (rib, s = 56) => `<svg width="${s}" height="${s}" viewBox="0 0 34 34" fill="none"><line x1="11.5" y1="7" x2="11.5" y2="27" stroke="${rib}" stroke-width="2" stroke-linecap="round"/><line x1="22.5" y1="7" x2="22.5" y2="27" stroke="${rib}" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="20" x2="29" y2="20" stroke="${C.brass}" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const bench = (c, s = 56) => `<svg width="${s}" height="${s}" viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="9" stroke="${c}" stroke-width="2"/><line x1="15" y1="2" x2="15" y2="28" stroke="${c}" stroke-width="1.6"/><line x1="2" y1="15" x2="28" y2="15" stroke="${c}" stroke-width="1.6"/><circle cx="15" cy="15" r="3" fill="${C.brass}"/></svg>`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const kinds = {
  viewport: ({ header, label = "", rect: [x, y, w, h] }) => `<div class="sheet"></div>
    <div class="crop" style="left:40px;top:14px;border-left-width:2px;border-top-width:2px"></div>
    <div class="crop" style="right:40px;top:14px;border-right-width:2px;border-top-width:2px"></div>
    <div class="crop" style="left:40px;bottom:14px;border-left-width:2px;border-bottom-width:2px"></div>
    <div class="crop" style="right:40px;bottom:14px;border-right-width:2px;border-bottom-width:2px"></div>
    <div class="mono" style="position:absolute;left:${x}px;width:${w}px;top:34px;height:44px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid rgba(30,58,95,.45);font-size:18px;letter-spacing:.2em;color:${C.keel}">
      <div style="display:flex;align-items:center;gap:16px">${mark(C.keel, 30)}<span>${header}</span></div><span style="color:${C.muted}">${esc(label)}</span></div>
    <div style="position:absolute;left:${x - 8}px;top:${y - 8}px;width:${w + 16}px;height:${h + 16}px;border:2px solid ${C.keel};background:#0d1429"></div>`,

  figtag: ({ text, top = 104 }) => `<div class="mono" style="position:absolute;right:140px;top:${top}px;padding:12px 22px;background:${C.keel};color:#fff;font-size:24px;font-weight:700;letter-spacing:.18em">${esc(text)}</div>`,

  sheet: ({ text, title = "", series = "KEELSON · THE SERIES" }) => `<div class="mono" style="position:absolute;right:96px;bottom:72px;min-width:440px;background:rgba(243,245,248,.94);border:2px solid ${C.keel};color:${C.keel}">
    <div style="padding:10px 20px;border-bottom:1.5px solid rgba(30,58,95,.45);font-size:16px;letter-spacing:.24em;color:${C.muted}">${esc(series)}</div>
    <div style="padding:14px 20px 4px;font-size:32px;font-weight:700;letter-spacing:.16em">${esc(text)}</div>
    <div style="padding:0 20px 14px;font-size:18px;letter-spacing:.2em;color:${C.brassInk}">${esc(title.toUpperCase())}</div></div>`,

  caption: ({ text, rect: [x, y, w, h], tone = "light" }) => {
    const panel = tone === "dark"
      ? `background:rgba(15,27,45,.9);border-left:5px solid ${C.brass};color:${C.paper};font-weight:500`
      : `background:rgba(243,245,248,.92);border-top:1.5px solid rgba(30,58,95,.45);border-bottom:1.5px solid rgba(30,58,95,.45);color:${C.ink};font-weight:400`;
    return `<div style="position:absolute;left:${x}px;width:${w}px;top:${y}px;height:${h - 30}px;display:flex;justify-content:center;align-items:flex-end">
      <div style="max-width:${Math.min(w - 60, 1560)}px;padding:12px 30px;${panel};font-size:40px;line-height:1.32;text-align:center">${esc(text)}</div></div>`;
  },

  callout: ({ text, anchor: [ax, ay], label }) => {
    const [lx, ly] = label || [ax + 90, ay - 110];
    return `<svg width="1920" height="1080" style="position:absolute;inset:0"><line x1="${ax}" y1="${ay}" x2="${lx}" y2="${ly + 22}" stroke="${C.brass}" stroke-width="2.5"/>
      <circle cx="${ax}" cy="${ay}" r="9" fill="none" stroke="${C.brass}" stroke-width="3"/><circle cx="${ax}" cy="${ay}" r="3" fill="${C.brass}"/></svg>
      <div class="mono" style="position:absolute;left:${lx}px;top:${ly}px;padding:8px 16px;background:rgba(243,245,248,.95);border:2px solid ${C.brass};color:${C.brassInk};font-size:26px;font-weight:700;letter-spacing:.06em;white-space:nowrap">${esc(text)}</div>`;
  },

  "open-title": () => `<div style="position:absolute;left:140px;top:92px;color:${C.keel}">
    <div class="brand">${mark(C.keel)}KEELSON</div>
    <div class="h1" style="margin-top:34px;font-size:100px">Lay the keel.</div>
    <div class="rule" style="margin-top:30px"></div></div>`,

  "close-card": () => `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,27,45,.93) 0,rgba(15,27,45,.82) 42%,rgba(15,27,45,0) 78%)"></div>
    <div style="position:absolute;left:140px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;color:${C.paper}">
    <div class="brand">${mark("#dfe6f0")}KEELSON</div>
    <div class="h1" style="margin-top:34px;font-size:96px">Raise the ribs.</div>
    <div class="rule" style="margin-top:34px"></div>
    <div class="mono" style="margin-top:46px;align-self:flex-start;padding:22px 30px;background:rgba(15,27,45,.92);border:1px solid rgba(181,128,58,.55);font-size:24px;color:#dfe6f0;white-space:nowrap">
      <span style="color:${C.brass}">$</span> curl -fsSL https://github.com/danielscholl/keelson/releases/latest/download/install.sh | sh</div>
    <div class="mono" style="margin-top:36px;font-size:28px;letter-spacing:.06em;color:#b9c6d8">danielscholl.github.io/keelson</div></div>`,

  blank: () => `<div class="sheet"></div>
    <div class="crop" style="left:40px;top:14px;border-left-width:2px;border-top-width:2px"></div>
    <div class="crop" style="right:40px;top:14px;border-right-width:2px;border-top-width:2px"></div>
    <div class="crop" style="left:40px;bottom:14px;border-left-width:2px;border-bottom-width:2px"></div>
    <div class="crop" style="right:40px;bottom:14px;border-right-width:2px;border-bottom-width:2px"></div>`,

  "field-open": ({ title = "On paper, it works." }) => `<div style="position:absolute;left:140px;top:92px;color:${C.keel}">
    <div class="brand">${bench(C.keel)}FIELD TRIALS</div>
    <div class="h1" style="margin-top:26px;font-size:72px">${esc(title)}</div>
    <div class="rule" style="margin-top:24px"></div></div>`,

  "field-close": ({ lead = "On paper, it works.", lines = ["In the field,", "it has to."] }) => `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,27,45,.93) 0,rgba(15,27,45,.86) 46%,rgba(15,27,45,0) 74%)"></div>
    <div style="position:absolute;left:140px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;color:${C.paper}">
    <div class="brand">${bench("#dfe6f0")}FIELD TRIALS</div>
    <div class="h1" style="margin-top:40px;font-size:34px;letter-spacing:.2em;color:#b9c6d8">${esc(lead)}</div>
    <div class="h1" style="margin-top:16px;font-size:92px">${lines.map(esc).join("<br>")}</div>
    <div class="rule" style="margin-top:34px"></div></div>`,
};

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
