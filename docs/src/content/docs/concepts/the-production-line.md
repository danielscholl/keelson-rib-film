---
title: The production line
description: "The film command and its tools, the steps film-cut runs, and why the manifest, not the agent, is the source of a cut."
sidebar:
  order: 3
---

The **production line** is a set of small tools that each do one step of making
a short: voice the lines, render the boards, compose the master, measure it.
They ship inside the rib and run through one command, `film`, so an agent never
needs them on its `PATH` and never writes ffmpeg by hand.

`film_doctor` prints the exact command for the machine (the bun that runs
Keelson, pointed at the rib's `bin/film.ts`). Run it with no arguments to list
the tools; [tools and commands](../../reference/tools-and-commands/) has them all.

## The manifest is the source

Everything in a cut comes from the piece's `short.yaml`: scenes in order, the
lines and where each lands, the boards, cards, beds and effects. An agent's job
is to write a good manifest and a good board page. The line's job is to render
exactly that, every time.

That split is why a change is cheap. Edit a line's text, run `film-cut` again,
and only that line is re-voiced (`tts --changed` compares against
`narr/takes.json`), the boards re-time to the new narration, and the composer
rebuilds the master. Nothing about the previous cut has to be remembered.

## What film-cut runs

1. **resolve**: `film info` finds the piece, its series, whether it has a plate,
   and who answers its cut gate.
2. **voice**: `film tts --changed` voices new or changed lines and times every
   word.
3. **plate**: `film plate` renders the board page to video, timed by the
   narration (only when the manifest has a `plate`).
4. **compose**: `film compose` builds `final.mp4` and `final.srt`, with captions,
   cards, bookends, beds and effects, and records the cut in `build/`.
5. **check**: `film review` and `film autoscan` measure the cut and write the
   evidence to `qa/`.
6. **gate**: the cut gate stops the run for a person or the reviewer.

Each step is a Keelson workflow node, so a failed run can be
[resumed](https://keelsonrib.ai/docs/concepts/workflows/) from the step that
failed, and the run's events show what each tool printed.

## Boards

A **plate** is drawn motion: an HTML page that builds a paused GSAP timeline,
which `film plate` steps frame by frame in Chrome. The page gets the narration's
timing (`window.setup(T, words)`), so a board can draw on a spoken word, and the
series look as `--film-*` CSS variables. A page that names moments in
`window.fnMarks` lets the manifest land a sound effect exactly when something
appears.

The [motion page](../../guides/method/motion/) of the method covers how to write
one.

## Related

- [Gates and the reviewer](../gates/)
- [Workflows](../../reference/workflows/)
- [Composing](../../guides/method/compose/)
