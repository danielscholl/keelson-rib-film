# Sound

Sound is the cheapest way to make a piece feel finished, and the easiest to overdo. Decide it in the storyboard, beat by beat, like the picture.

## Three layers

| Layer | Job | Default |
|---|---|---|
| Narration | carries the meaning | the series voice, always on top |
| Bed | sets pace and mood, fills holds | none under narration in a lesson; under bookends, montages, the money shot, and music-led cuts |
| Effects | make an event land: a click, a stamp, a floor sliding in | a few per minute, each on a visible event; none on every beat of an explainer |

An explainer can carry one bed under the opening and close and four to eight effects on its biggest events. A launch film or teaser is music-led: the bed is the spine and the cut follows it.

## Narration

- `voice` in `series.yaml`, a manifest or a single line picks the engine and voice (the media page lists the engines). Audition two or three voices on the same line before a series settles on one.
- Fix a misread word in the line's `ssml` (Azure voices) with `<sub alias="...">` or `<phoneme>`, and keep the caption spelling in `text`. Other engines speak `text`; respell there only if the caption can carry it.
- The same line can differ by a second between renders, so re-measure after any re-voice and re-time anything keyed to it. `film tts <dir> --changed` voices only what changed.

## Effects

- `film sfx <voice> out.wav` synthesizes deterministic effects (click, tick, pop, thump, whoosh, riser, chime) and prints the peak time. A downloaded effect works too; keep its license note beside it.
- In `short.yaml`, an `sfx:` entry is keyed to the same marks and word times as the narration, so a re-voice or re-capture retimes it. Compose places each by its measured peak, one frame after the picture event, which reads as in sync.
- One effect per visible event, never on something the viewer can't see. A riser ends on its event; it doesn't start on it.
- Keep effects 10 to 15 dB under the voice. If an effect masks a word, move it to the gap or drop it.

## Beds and music

- `film loop out.wav --len S [--bpm 96] [--chords Cmaj7,Am7,Fmaj7,G7]` synthesizes a light groove (electric piano, plucked arpeggio, sub bass, soft beat) with no service: enough for a draft or a sample, and the starter piece uses one. Real pieces get better music from `film lyria`.
- `film lyria prompt.txt out` generates music (Gemini, `GEMINI_API_KEY`). Prompt the instrument, the tempo, the mood, and where it resolves; the tool saves the prompt beside the take.
- Choose the window of a take by measurement: `film onsets` lists note onsets, and `film beats` writes `beats.json` (tempo, beats, downbeats, the drop). Start the music so its resolution or drop lands on the frame that matters, not on second zero.
- Under narration, a bed is ducked and kept out of the voice's band: `duck:` lowers it under every line with short ramps, and `presence:` cuts a wide band around 2 kHz. `film bed` builds a self-contained bookend bed with the same dip and duck baked in.
- Judge a bed by measurement as well as by ear: `film aqa` reports loudness, true peak and band levels per window. Keep 1 to 4 kHz at least 7 dB under the voice.

## Music-led cuts

For a teaser, launch film or montage, the music comes first and the picture is cut to it:

1. Pick or generate the track, then run `film beats`. Check the drop by eye on the waveform; the auto grid can be a beat off.
2. Write a beat map in the storyboard: which beat each change lands on, where the drop is, where the breakdown holds.
3. Something changes on most beats, and the money shot lands on the drop. A loop ends on its first frame (`loop: true` makes autoscan check the seam).
4. Narration, if any, sits in the breakdown or between phrases, never over the drop.

## Loudness

- Narration-led pieces for docs and course pages: -16 LUFS integrated, true peak under -1.5 dBTP (the default).
- Music-led social cuts: `loudness: -14` in the manifest, which switches compose to a two-pass loudnorm with true peak under -1 dBTP. These are conventions, not published platform rules.
- A bed built for mixing (bookends) sits around -22 LUFS on its own so it doesn't fight the voice.

## Things that go wrong

- A bed that is front-loaded and drops away under the first word, then never resolves.
- Hex codes or text in a music or video prompt come back as artifacts; describe in words.
- An effect on a transition that has no visible event reads as noise.
- Generated audio from a video model is usable as texture, but mute it by default and decide on purpose.
