# Series

A series is a set of videos that share an identity and a map. Read its bible before planning an episode, and its recent pieces before choosing the episode's shape.

A one-off needs only a folder and a storyboard. Start a series when a second episode is planned, and decide these once.

## In series.yaml

The production line reads these:

```yaml
title: Field guide
prefix: ep                       # used in publish paths and tags
voice: en-US-AvaMultilingualNeural   # or engine:name, or { engine, name, model, instructions }
theme:
  look: plain                    # plain, blueprint or dark
  colors: { primary: "#1e3a5f", accent: "#b5803a" }
  background: assets/paper.jpg   # or plain, grid, any CSS background
  brand: FIELD GUIDE
bookends: { open: sting, close: endcard }   # assets/bookends/open-sting.mp4, close-endcard.mp4
tags:                            # on-screen tags; templates over manifest fields, {TITLE} is upper case
  open: "EP. {fig} · {TITLE}"    # the card over the open bookend (default: the title)
  close: "{TITLE}"               # the card over the close bookend
  header: "EP. {fig} · {TITLE}"  # the header above framed footage
gates:
  storyboard: human
  cut: { human_first: 3 }        # then the reviewer answers the cut gate first
publish:
  dir: site/videos/{series}/{prefix}-{fig}
```

The publish gate always goes to a person.

## In the bible

Write these into a `SERIES.md` beside `series.yaml`, with the episode map and a status line per episode:

- **Name and numbering.** How an episode is tagged on screen and in folders (`FIG. NN`, `Episode N`).
- **Who owns what is said.** The repo or document that is the source of truth, and who approves a storyboard.
- **Identity.** Paper and ink, the accent roles, two typefaces, taken from the subject's own docs or site so the videos sit beside them. The spine picture if the subject has one. A sting and an end card under five seconds each, or none.
- **A motion file**, `MOTION.md`: palette by role and hex, the two typefaces, the easing and timing constants (start from the motion page's motion language and change what the identity needs), how scenes change, and five or so never-do items. Every episode and every reviewer reads it; the rubric's identity axis is scored against it.
- **Voice and sound.** Narrator, style, beds, the effect palette, and the loudness target.
- **Captions and chapters.** Burned in, or VTT beside the video.
- **Spoken forms and never-on-screen**, as tables.
- **A kit folder** if the boards share code: one script of board verbs (state, camera, trace, kinetic type, draw-on) that every episode's plate page loads.
- **A ledger**, one row per episode: structure, dominant form, length, opener, devices, sound, voice, aspect. It is how the next episode avoids repeating the last five.

## Where a new piece goes

A folder per series, a folder per piece inside it. A project that wants its videos beside its own content (a course, a product's docs) keeps them in its own repo; the tools take any piece folder, and `FILM_LIBRARY` points them at a library elsewhere.
