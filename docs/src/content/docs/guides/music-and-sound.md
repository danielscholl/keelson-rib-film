---
title: Add music and effects
description: "Make a music bed with film loop or Lyria, lay it under the narration with a duck, and land effects on moments a board names."
sidebar:
  order: 5
---

A manifest with no sound keys composes narration alone. Whether a piece gets a
bed, and which moments get an effect, is a storyboard decision; the
[sound page](../method/sound/) of the method covers when and how much. This guide
covers the mechanics.

## Make a bed

`film loop` writes a light music bed with no service and no samples: a soft
electric piano on the chords, a plucked arpeggio, a sub bass and a quiet beat.

```bash
film loop audio/bed.wav --len 30 --bpm 96 --chords Cmaj7,Am7,Fmaj7,G7
```

- `--len` is seconds; make it a little longer than the piece.
- `--chords` takes a root and a quality (`maj7`, `m7`, `7`, `m`, or nothing for
  major), one per bar.
- `--no-beat` and `--no-arp` thin it out under a dense narration.
- `--seed` changes the hat pattern; `--lufs` sets its loudness (default -24).

It writes `bed.prompt.txt` beside the audio with the recipe, so the bed can be
remade or varied later.

With `GEMINI_API_KEY` set, `film lyria` generates a music clip from a prompt
instead, and `film beats` measures a track's tempo and downbeats for cutting to
it.

## Lay it under the narration

```yaml
beds:
  - { file: audio/bed.wav, scene: b-idea, at: 0, volume: 0.7, duck: -7, presence: -6 }
```

- `scene` and `at` place the start; the bed plays for its own length, cut off
  where the piece ends.
- `duck` dips it that many dB under every narration line, with smooth ramps.
- `presence` cuts it at 2 kHz, out of the voice's band, so the words stay clear.

## Land effects on moments

`film sfx` synthesizes seven quiet UI sounds: `click`, `tick`, `pop`, `thump`,
`whoosh`, `riser` and `chime`. In the manifest, place one at a time in a scene,
or at a moment the board page names:

```yaml
sfx:
  - { sound: pop, scene: b-idea, at: chip-voice, gain: -20, pitch: 2 }
  - { sound: riser, scene: b-stages, at: "n3 - 0.2", dur: 1.2 }
  - { sound: assets/sfx/door.wav, scene: b-stages, at: 4.5 }
```

A board names moments by putting them in `window.fnMarks` while it builds its
timeline. The starter anchors each one on a spoken word, a little before it:

```js
marks["chip-voice"] = W("n1", "voice") - 0.2;   // W: when line n1 says "voice"
show($("i-voice"), marks["chip-voice"]);
window.fnMarks = marks;
```

The effect's measured peak lands on that moment, so a pop sounds when the chip
appears even after the narration re-times the board. A riser peaks at its end.
Every placement is written to `build/timeline.json`.

## Check the mix

`film-cut` measures integrated loudness on the review page. For more, run
`film aqa final.mp4 --win name:start:end` for loudness, true peak and the voice
band against the bed in a window.

## Related

- [Sound](../method/sound/)
- [Media services](../method/media/)
- [A series of your own](../../tutorials/a-series-of-your-own/)
