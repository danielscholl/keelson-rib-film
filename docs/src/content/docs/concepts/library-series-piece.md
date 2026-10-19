---
title: Libraries, series and pieces
description: "A library is a folder of series; a series is a folder with a series.yaml; a piece is a folder with a short.yaml. Each piece has a stage and drift flags."
sidebar:
  order: 2
---

A **piece** is one short: a folder holding a `short.yaml` manifest and
everything rendered from it. A **series** is the nearest `series.yaml` above a
piece, holding what its pieces share: the voice, the look, who answers the
gates, and where a published copy goes. A **library** is the folder above the
series: the nearest folder with an `assets/` directory or a `.git`, or whatever
`FILM_LIBRARY` names.

```text
my-films/                  library (has assets/)
  assets/                  shared bookends, beds, card kinds
  first-steps/
    series.yaml            the series
    fig-01-hello/
      short.yaml           a piece
      source/plate.html
```

A one-off needs only a piece folder. Start a series when a second piece is
planned; the [series page](../../guides/method/series/) of the method says what to
decide once.

## Stages

`film_status` reads the files on disk and gives every piece a stage. Nothing is
stored to say where a piece is, so the stage can't go stale.

| Stage | Means |
|---|---|
| `scripted` | the manifest has lines, not all voiced |
| `voiced` | every line has a take in `narr/` |
| `cut` | `final.mp4` exists |
| `checked` | the review ran after the cut (`final.qa.png` is newer than `final.mp4`) |
| `published` | the published copy is at least as new as the cut |

## Drift flags

A flag says something needs attention whatever the stage.

| Flag | Means |
|---|---|
| `stale-cut` | an input recorded when the cut was made has changed since: the manifest, a file under `source/`, a take, or a scene's footage |
| `partial-voice` | some lines have a take and some don't |
| `republish` | the published copy is older than the cut |
| `unpublished` | checked, the series has a publish target, and it hasn't gone out |
| `bad-manifest` | `short.yaml` doesn't parse |

`stale-cut` comes from `build/cut.json`, the record `film compose` writes of
every input and its fingerprint. A cut made before that record existed reports
its staleness as unknown rather than guessing.

## Related

- [The production line](../the-production-line/)
- [Data on disk](../../reference/data-on-disk/)
- [Your first film](../../tutorials/your-first-film/)
