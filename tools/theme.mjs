// The look of a series: a preset (`look`), then the series' and the piece's own colors, background and type.
// theme: { look: plain | blueprint | dark, colors: {...}, background: plain | grid | <css> | <image path>, font, mono,
//          brand, series, mark }. Cards draw with it, and plate pages get it as --film-* CSS variables.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import YAML from "yaml";

const LOOKS = {
  plain: {
    colors: { primary: "#2b3440", accent: "#c0703a", accentInk: "#93522a", text: "#1d232b", muted: "#5f6b7a",
      paper: "#f6f7f9", shade: "#1d232b", onShade: "#f6f7f9", onPrimary: "#ffffff", frame: "#11151b" },
    background: "plain",
    crops: false,
  },
  blueprint: {
    colors: { primary: "#1e3a5f", accent: "#b5803a", accentInk: "#8a5a1f", text: "#0f1b2d", muted: "#51607a",
      paper: "#f3f5f8", shade: "#0f1b2d", onShade: "#f3f5f8", onPrimary: "#ffffff", frame: "#0d1429" },
    background: "grid",
    crops: true,
  },
  dark: {
    colors: { primary: "#d7dee8", accent: "#e0a84a", accentInk: "#e8b968", text: "#eef2f7", muted: "#9aa6b6",
      paper: "#161c25", shade: "#05070a", onShade: "#eef2f7", onPrimary: "#0e1218", frame: "#05070a" },
    background: "plain",
    crops: false,
  },
};

// Earlier names for the same roles.
const ALIASES = { keel: "primary", brass: "accent", brassInk: "accentInk", ink: "text" };

export const rgba = (hex, a) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };

function backgroundCss(bg, C, library) {
  if (bg === "plain") return `linear-gradient(180deg,${C.paper} 0%,${C.paper} 30%,${rgba(C.primary, 0.06)} 100%),${C.paper}`;
  if (bg === "grid") {
    return `linear-gradient(${rgba(C.primary, ".07")} 1px,transparent 1px) 0 0/72px 72px,linear-gradient(90deg,${rgba(C.primary, ".07")} 1px,transparent 1px) 0 0/72px 72px,
linear-gradient(${rgba(C.primary, ".028")} 1px,transparent 1px) 0 0/18px 18px,linear-gradient(90deg,${rgba(C.primary, ".028")} 1px,transparent 1px) 0 0/18px 18px,
radial-gradient(circle at 74% 0%,rgba(255,255,255,.9),transparent 700px),linear-gradient(180deg,${C.paper} 0%,#e6eaf0 100%)`;
  }
  const ext = extname(bg).toLowerCase();
  if (MIME[ext]) {
    const path = isAbsolute(bg) ? bg : join(library ?? ".", bg);
    if (!existsSync(path)) throw new Error(`theme background ${bg} not found at ${path}`);
    // Inlined, because a card page has no file origin to load it from.
    return `url("data:${MIME[ext]};base64,${readFileSync(path).toString("base64")}") center/cover no-repeat,${C.paper}`;
  }
  return bg;
}

export function resolveTheme(theme = {}, library) {
  const look = LOOKS[theme.look ?? "plain"];
  if (!look) throw new Error(`unknown theme look ${theme.look}; use ${Object.keys(LOOKS).join(", ")}`);
  const own = Object.fromEntries(Object.entries(theme.colors ?? {}).map(([k, v]) => [ALIASES[k] ?? k, v]));
  const C = { ...look.colors, ...own };
  Object.assign(C, { keel: C.primary, brass: C.accent, brassInk: C.accentInk, ink: C.text });
  return {
    C,
    background: backgroundCss(theme.background ?? look.background, C, library),
    crops: theme.crops ?? look.crops,
    font: theme.font ?? "Inter,-apple-system,sans-serif",
    mono: theme.mono ?? `"JetBrains Mono","SF Mono",monospace`,
  };
}

const kebab = (k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export function themeVars(R) {
  const vars = Object.entries(R.C)
    .filter(([k]) => !(k in ALIASES))
    .map(([k, v]) => `--film-${kebab(k)}:${v}`);
  vars.push(`--film-line:${rgba(R.C.primary, 0.45)}`, `--film-background:${R.background}`, `--film-font:${R.font}`,
    `--film-mono:${R.mono}`);
  return vars.join(";");
}

// Same rule as filmlib.py: FILM_LIBRARY, else the nearest folder with assets/ or .git.
export function libraryRoot(start) {
  if (process.env.FILM_LIBRARY) return resolve(process.env.FILM_LIBRARY);
  for (let d = resolve(start); ; d = dirname(d)) {
    if ((existsSync(join(d, "assets")) && statSync(join(d, "assets")).isDirectory()) || existsSync(join(d, ".git"))) return d;
    if (dirname(d) === d) return resolve(start);
  }
}

// The theme a piece renders with: its nearest series.yaml's theme under its manifest's own.
export function pieceTheme(dir, manifest = {}) {
  const library = libraryRoot(dir);
  let series = {};
  for (let d = dirname(resolve(dir)); d.startsWith(library); d = dirname(d)) {
    if (existsSync(join(d, "series.yaml"))) {
      series = YAML.parse(readFileSync(join(d, "series.yaml"), "utf8")) ?? {};
      break;
    }
    if (d === library) break;
  }
  return { theme: { ...(series.theme ?? {}), ...(manifest.theme ?? {}) }, library };
}
