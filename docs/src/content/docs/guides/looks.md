---
title: Pick a look
description: "Set a series theme: a preset look, named color roles, a background, typefaces and a brand line, and write boards against the --film-* variables."
sidebar:
  order: 4
---

A look is set under `theme` in `series.yaml`, and a piece's manifest can
override any part of it. Leave it out and pieces get the `plain` look.

```yaml
theme:
  look: plain                 # plain, blueprint or dark
  colors:
    primary: "#1e3a5f"
    accent: "#b5803a"
  background: assets/paper.jpg   # plain, grid, any CSS background, or an image
  font: "Inter, sans-serif"
  mono: "JetBrains Mono, monospace"
  brand: FIELD GUIDE
```

## Presets

| Look | Paper | Background | Feel |
|---|---|---|---|
| `plain` | light grey | flat | neutral, the default |
| `blueprint` | pale blue-grey | a drafting grid | navy and brass, corner crop marks |
| `dark` | near black | flat | light type, amber accent |

## Color roles

Colors are named by job, so a board asks for a role and the series decides the
hue.

| Role | Used for |
|---|---|
| `primary` | the main ink of drawings and rules |
| `accent` | what changes or matters on a board |
| `accentInk` | accent-colored text, darker for legibility |
| `text` | body type |
| `muted` | secondary type and labels |
| `paper` | the board surface |
| `shade` | dark panels (caption plates, tags) |
| `onShade` | type on a shade panel |
| `onPrimary` | type on a primary fill |
| `frame` | the matte around framed footage |

Set only the ones you want to change; the rest come from the preset.

## Background

`plain` is the paper color, `grid` a drafting grid in the primary color, any
other string a CSS background (`linear-gradient(...)`), and a path to an image
under the library is embedded. Pick a background that leaves the middle of the
frame quiet; captions and cards sit over it.

## Boards follow the look

A board page gets the theme as CSS variables on `:root` and as
`window.filmTheme`:

```css
body { background: var(--film-background); color: var(--film-text); font-family: var(--film-font); }
.chip { border-color: var(--film-primary); }
.chip.on { background: var(--film-accent); color: var(--film-on-primary); }
```

A board written against the variables changes with the series. A board that
hardcodes hex colors doesn't, and the reviewer scores identity against the
series.

## On-screen tags

`tags` in `series.yaml` sets the text over the open and close bookends and the
header above framed footage. Each is a template over the manifest's fields;
`{TITLE}` is the title in capitals.

```yaml
tags:
  open: "EP. {fig} · {TITLE}"
  close: "{TITLE}"
  header: "EP. {fig} · {TITLE}"
```

Each defaults to the title alone.

## Related

- [Looks and voices](../../concepts/looks-and-voices/)
- [Motion](../method/motion/)
- [Series](../method/series/)
