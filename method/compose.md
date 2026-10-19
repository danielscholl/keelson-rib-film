# Composing

`film compose <dir>` builds the master from `short.yaml`: scenes, narration, captions and cards, sound, and the cut record that tells `film_status` when the cut has gone stale. `film-cut` runs it for you. The starter piece's manifest is a small worked example; borrow its fields, not its layout.

## The manifest

- `scenes:` in order, each `{ id, source, frame: full | viewport, marks, trim: [from, to], hold, xfade, zoom, masks, label }`. A time is seconds into the scene's source, or a string against its marks: `"enter + 2.6"`, `"graph.end"`. A re-capture moves the marks, not the manifest.
- `cold: true` on a scene puts it before the open bookend.
- `lines:` each `{ id, scene, at, text, ssml, voice, style, caption }`. `at` is a time in that scene.
- `bookends: { open, close }` name `assets/bookends/open-<name>.mp4` and `close-<name>.mp4` in the library; the series sets them.
- `cards:` callouts `{ kind: callout, scene, at, until, text, anchor: [x, y], label: [x, y] }`, or a library card kind; `figtag` and `sheet` entries restyle the cards over the open and close bookends, whose text comes from the series `tags`.
- `crossfade` (default 0.5 s), `captions` (default on), `caption_tone: light | dark`, `canvas: [w, h]` for vertical or square, `theme` to override the series look.

Segments run cold-open scenes, the open bookend, scenes in order, the close bookend, each crossfading into the next. The composer refuses to render if two lines overlap or the last line runs into the fade-out; fix the pacing, don't force it.

## Text

Captions, titles, cards and callouts are rendered as PNGs from HTML (Chrome, through `film cards`) and overlaid, so the type is full CSS and ffmpeg needs no font support. The theme draws them; a library can add its own card kinds as `.mjs` modules in `assets/cards/`.

## Sound keys

All optional; a manifest without them composes narration only.

```yaml
loudness: -14                     # two-pass loudnorm to this target (true peak -2 before AAC, about -1.7 after)
beds:
  - { file: assets/beds/piano.wav, scene: plate, at: 0, volume: 1.0,
      duck: -8,                   # dB under every narration line, 0.35 s smooth ramps
      presence: -6 }              # a wide cut at 2 kHz, out of the voice's band
sfx:
  - { sound: thump, scene: plate, at: floor-seats, gain: -12 }   # click tick pop thump whoosh riser chime, or a file
  - { sound: riser, scene: plate, at: "n5 - 0.2", dur: 1.2 }     # a riser's peak is its end, so it lands on `at`
```

An effect's measured peak lands one frame after `at`, and every placement is written to `build/timeline.json` under `sfx`. `film sfx <voice> out.wav` renders one to listen to.

## Zoom, crop and masks

- For phone legibility, crop into the region that matters. `zoom: [{ at, until, over, box: [x, y, w, h] }]` pushes in with smoothstep ramps; a zoom whose `until` equals the next zoom's `at` becomes a pan.
- `masks: [{ box, color, from, to }]` covers private text in footage with a fill in the footage's own background color, windowed to the seconds it is on screen. Re-capturing from a neutral path is better when there is time.

## Vertical

9:16 is its own layout: `canvas: [1080, 1920]` with stacked crops (terminal on top, browser region below), or a browser recorded at a narrow viewport. Letterboxing 16:9 into 9:16 wastes most of the screen. Viewport frames assume 1920x1080.

## Under the hood

Worth knowing when extending the composer:

- Every scene is normalized (`fps=30,scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p`) and every segment chain ends with `settb=AVTB`, because `xfade` needs identical timebases.
- With crossfades of length X, scene k starts at `start[k] = start[k-1] + dur[k-1] - X`.
- Source color ranges differ (Playwright JPEG frames are full range, x264 masters are limited); every segment scales with `in_range=auto:out_range=tv` or a plate turns grey on some players.
- Recent ffmpeg dropped `-filter_complex_script`; the filter graph is passed as a file with `-/filter_complex <file>`.
- Output: `libx264 -crf 18 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart`, with `final.srt` beside it.
