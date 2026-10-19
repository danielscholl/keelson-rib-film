# tools

The shared production line. Everything that does not vary between shorts lives here; the creative choices stay in each short's `short.yaml`. Run `bun install` here once (Playwright drives Chrome for the cards).

| Tool | Does |
|---|---|
| `tts.py <short-dir>` | One WAV per line (Azure Speech, Harper by default), `narr/durations.json`, and real word times in `narr/words.json`. `--only n3,n6` re-voices some lines; `--align-only` re-times existing takes. |
| `compose.py <short-dir>` | Reads `short.yaml`, renders `cards/` through `cards.mjs`, writes `final.mp4`, `final.srt`, and `build/timeline.json`. `--dry` prints the timeline and every gap without rendering. Optional `sfx` cues, bed `duck` and `presence`, and a two-pass `loudness` target (shapes in `skills/narrated-video/references/compose.md`). |
| `plate.mjs <short-dir>` | Renders the manifest's `plate` boards (an HTML/GSAP page on the blueprint sheet) to one video, each board timed by its narration, beats on real word times, and writes `source/plate-marks.json` so scenes can trim one board each. `--only t1,t2` writes stills; `--verify` checks the page is a pure function of time and no font fell back; `--fps 60 --subframes 4` adds motion blur; `--from S --to E` renders one window. FIG. 01's `source/plate.html` is a worked board page. Chrome runs with file access, so a board page can import ES modules from disk (`fieldnotes/kit` does). |
| `cards.mjs <spec.json>` | The one card renderer: viewport chrome, fig tag, sheet card, captions, callouts, and the shared bookend cards. |
| `qa.sh final.mp4 <t...>` | Contact sheet, silence gaps, loudness. `PHONE=<t>` adds one frame at 405 px wide. |
| `sora.py`, `frames2mp4.py`, `cursor.js` | Generated clips, CDP screencast to video, and the injected cursor for captures. |
| `autoscan.py <short-dir>` | Defect candidates from the encoded cut into `qa/autoscan.md`: pops, one-frame flashes, flash rate over the WCAG limit, static spans, an empty first frame, a loop seam. |
| `sfx.py <voice> out.wav` | Deterministic synthesized effects (click, tick, pop, thump, whoosh, riser, chime); prints the peak time. |
| `beats.py <audio>` | `beats.json`: tempo, beats, downbeats, the drop, the strongest hits (numpy only). |
| `onsets.py <audio>` | Note onsets and the RMS envelope, to choose a window of a music take. |
| `aqa.py <audio or video>` | Audio QA by measurement: loudness, LRA, true peak, band levels per window. |
| `bed.py out.wav ...` | A self-contained bed: a music window, foley, a 2 kHz dip and a duck under one line, at a target loudness. |
| `gimg.py`, `veo.py`, `lyria.py` | Gemini images, Veo clips (first and last frame), Lyria music; each reads `GEMINI_API_KEY` and saves its prompt beside the output. |

## short.yaml

Times are source times. A number is seconds into the scene's source; a string is `mark`, `mark + 0.4`, or `mark - 0.3` against that scene's marks, so a re-capture moves nothing by hand. Every scene has `start` and `end` marks for free.

```yaml
fig: "04"
title: First workflow
act: II                       # the sheet card reads SHEET 04 · ACT II
voice: en-US-Harper:MAI-Voice-2.1
style: happy                  # optional mstts:express-as style (Ethan and Harper take styles)
max_pause: 0.55               # optional: shorten pauses inside a line before word timing
bookends: { open: lay-the-keel, close: raise-the-ribs }   # assets/bookends/{open,close}-<name>.mp4; omit for none; xfade sets the dissolve into the closer (s)
crossfade: 0.5                # default; a scene's xfade overrides the fade into it
captions: true                # burned-in captions for scene lines (bookend lines never get one)
beds:                         # optional music or ambience under the cut, mixed before the loudness pass
  - { file: assets/beds/x.wav, scene: plate, at: 0, volume: 1.0 }   # `at` is a scene time, like a line's
caption_tone: light           # light (the plate's panel) or dark

scenes:
  - id: web-run
    source: raw/web.mp4
    marks: source/web-meta.json          # {"marks": {name: epoch}} or {name: seconds}, or an inline map
    frame: viewport                      # viewport: footage inside the sheet; full: edge to edge (plates, cold opens)
    label: BROWSER                       # right side of the viewport header
    trim: [start-click - 0.3, done + 0.7]
    hold: 1.2                            # freeze the last frame
    masks: [{ box: [x, y, w, h], color: "0x0d1329", from: start, to: back }]   # cover private text
    zoom:                                # boxes in source pixels; until == next at makes a pan
      - { at: start-click + 0.3, until: start-click + 3.0, over: 0.9, box: [40, 300, 960, 540] }
cards:
  - { kind: callout, scene: web-run, at: done, until: done + 2, text: "all green", anchor: [700, 400] }
  # figtag and sheet are automatic; list them only to override text or timing (from/to, seconds into the bookend)
lines:
  - { id: n6, scene: web-run, at: start-click + 0.3, text: "The graph lights up..." }
  - { id: n5, scene: web, at: 0.4, text: "A small YAML graph.", ssml: "A small <sub alias='yammel'>YAML</sub> graph." }
```

A scene with `cold: true` plays before the opener (a cold open).

Scenes can mix `frame: full` (a plate render) and `frame: viewport` (demo footage) in one short. Choose the form for each beat, by what explains it best.
