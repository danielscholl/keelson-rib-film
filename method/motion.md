# Motion graphics

Drawn boards are one HTML page per piece, rendered frame by frame by `film plate`. The starter piece from `film_init` (`first-steps/fig-01-hello/source/plate.html`) is a small working page; read it, then build a different shape.

## How it works

- The manifest's `plate:` block names the page and its boards: `{ html, out, boards: [{ id, lines: [ids], lead, gap, gaps: { lineId: s }, tail }] }`. Each board lasts lead + its lines (with gap between) + tail, so narration sets the pacing.
- One page at 1920x1080: an SVG stage plus HTML header and labels. The renderer injects GSAP, so the page needs no script tag for it.
- The renderer calls `window.setup(T, words)`. `T[board] = { s, e, lines: { id: { n, d } } }` in plate seconds; `words[id] = [[word, start, end], ...]` relative to the line. The page builds one paused GSAP timeline on `window.tl` and returns its duration. A helper `W(lineId, "phrase")` that finds a phrase in `words` and returns its plate time keys each beat to the spoken word.
- The series theme arrives as CSS variables (`--film-background`, `--film-primary`, `--film-accent`, `--film-accent-ink`, `--film-text`, `--film-muted`, `--film-paper`, `--film-line`, `--film-font`, `--film-mono`) and as `window.filmTheme` for tweens. A page written against them follows its series; a page can still set its own.
- `film plate` writes `source/plate-marks.json` (`{ board: s, "board.end": e, lineId: n }`), which the manifest's scenes use for `trim` and line `at` times, and the encoded plate video.
- Render stills first (`--only t1,t2,...`) and look at them before a full render.

## A pure function of time

Every frame must be what `seek(t)` makes of it, whatever was rendered before. That is what lets a board re-render one window, render sub-frames for motion blur, and pass `--verify`.

- No CSS transitions or animations, no timers, no `Date.now`, no unseeded `Math.random` (use a seeded generator such as mulberry32), and no state carried between frames.
- Springs are closed-form step responses of time, not simulations. A value with several targets is the sum of one spring per change.
- Footage inside a page: re-encode all-intra (`ffmpeg -g 1`), load it as a blob URL, and await `seeked` before each frame.
- `film plate <dir> --verify` renders sampled frames cold and in sequence, compares them, and lists any font that fell back. A single flagged frame mid-zoom can be Chrome's raster cache rather than the page: compare the element state both ways (styles and attributes) and screenshot that one time in a fresh page before rewriting anything.

## Render options

- `--fps 60 --subframes 4` renders four sub-frames per output frame across a 180 degree shutter and blends them: real motion blur for fast camera moves and launch films. It costs four times the render. Never blur text that has to be read, and never across a hard cut.
- `--from S --to E` renders one window to `raw/plate-S-E.mp4` to check a fix without re-rendering the whole plate.
- `--only t1,t2` writes stills to `raw/plate-stills`.
- A page may set `window.fnMarks` to name its own transitions; they join the marks file.

## Motion language

Constants that read as designed rather than templated. Each series' motion file may override them.

- Entrances ease out hard (`cubic-bezier(0.16, 1, 0.3, 1)` or `expo.out`); exits take about half the entrance time.
- Springs: damping ratio 0.72 or more. A small overshoot suits UI; no bounce on type.
- Words that enter one by one are staggered about 0.09 s; a line of type is laid out in full first and revealed in place.
- Text rises out of a mask line rather than fading in. Text that swaps inside a moving shape needs its own mask.
- Change scenes by morphing what is there: a shape floods the frame and contracts into the next board, a box grows into the next diagram. Use the compose crossfade between footage and boards, not between two boards.
- Zoom in log space (equal steps feel equal), and let the camera settle before the line that names what it shows.
- A flood or wipe takes about 0.3 s and overscales past the corners, or half the frame changes in one frame.
- No `will-change` on anything the camera scales; it rasterizes and blurs the text.

## One page, three aspects

Lay a board page out in stage units with the frame size as a parameter (`plate.size` in the manifest), and choose positions per aspect, so 16:9, 9:16 and 1:1 render from one page by reframing, not cropping.

## Gotchas

- Use `.to` tweens and set initial state with `gsap.set` or CSS. A later `fromTo` renders its start values at build time unless `immediateRender: false`.
- Stroke drawing: `pathLength="1"`, `stroke-dasharray:1`, tween `strokeDashoffset` 1 to 0. A `marker-end` arrowhead shows even when the stroke isn't drawn yet, so hide the path until it draws.
- SVG text collapses spaces; use `style="white-space:pre"` for code. `xml:space` set through setAttribute does nothing.
- A repeating tween (a blinking caret) can outlive a later hide and turn the element back on. End repeats before hiding.
- Size for phones: captions about 40px, labels that matter 18px or more, decorative labels can be small.
- Never name a board `start` or `end`: every scene already has those marks, and a board mark with the same name replaces them.
- A font the page names but the machine lacks falls back silently; `--verify` names it. Prefer system fonts or ship the font with the series.
