---
title: Data on disk
description: "Every file in a film library and a piece folder, and which step writes it."
sidebar:
  order: 5
---

The rib keeps no database. A library is plain files, and `film_status` reads a
piece's stage from them.

## The library

| Path | Holds |
|---|---|
| `assets/` | marks the library root; shared bookends (`assets/bookends/open-<name>.mp4`, `close-<name>.mp4`), beds, effects, card kinds (`assets/cards/*.mjs`) |
| `<series>/series.yaml` | the series: voice, theme, tags, gates, publish target |
| `<series>/SERIES.md` | the bible, by hand (see [series](../../guides/method/series/)) |
| `.env.local` | media service settings; never committed |
| `published/` | wherever the series' `publish.dir` points |

## A piece

| Path | Written by |
|---|---|
| `short.yaml` | you or the agent: the manifest |
| `source/plate.html` | you or the agent: the board page |
| `source/plate-marks.json` | `plate`: each board's start and end and each line's start, for scene trims |
| `audio/` | beds and their `.prompt.txt` recipes |
| `narr/<id>.wav` | `tts`: one take per line |
| `narr/words.json` | `tts`: every word's start and end per line |
| `narr/durations.json` | `tts`: each line's length |
| `narr/takes.json` | `tts`: what each take was voiced from, for `--changed` |
| `raw/plate.mp4` | `plate`: the rendered boards |
| `build/` | `compose`: the filter graph, card specs, `timeline.json` (every segment, line, mark and effect on the master clock), and `cut.json` (the inputs' fingerprints) |
| `final.mp4` | `compose`: the master |
| `final.srt` | `compose`: the captions |
| `final.qa.png` | `review`: the contact sheet beside the master |
| `qa/review.md` | `review`: length, loudness, silence, frames and narration |
| `qa/sheet.jpg` | `review`: the contact sheet the reviewer reads |
| `qa/autoscan.md` | `autoscan`: defect candidates |
| `NOTES.md` | you or the agent: the storyboard it was cut from, versions, what is weak |

Everything under `narr/`, `raw/`, `build/` and `qa/`, and the `final.*` files,
can be deleted and rebuilt from the manifest. Footage recorded into `raw/` is
the exception.

## Related

- [Libraries, series and pieces](../../concepts/library-series-piece/)
- [Workflows](../workflows/)
