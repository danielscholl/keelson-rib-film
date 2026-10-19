---
title: Publish a cut
description: "Give a series a publish target, run film-publish, and approve the gate; the rib writes the web mp4, poster, thumbnail and captions, and never pushes."
sidebar:
  order: 6
---

Publishing stages a checked cut for the web: a smaller mp4, a poster, a card
thumbnail and a captions track, written where the series says. It never pushes,
uploads or posts. What you do with the files stays with you.

## Give the series a target

```yaml
publish:
  dir: published/{series}/fig-{fig}     # under the library
  file: fig-{fig}.mp4                   # optional; defaults to the folder name
```

The braces fill from the piece's manifest; `{series}` is the manifest's `series`
or the series folder's name. A series with no `publish` block can't publish.

## Run it

```bash
keelson workflow run film-publish --arguments first-steps/fig-01-hello --no-worktree --watch
```

The workflow refuses a stale cut (run `film-cut` first) and a series with no
target, then stops at the publish gate. A person always answers it, never the
reviewer. Approve, and it writes:

| File | What |
|---|---|
| `fig-01.mp4` | H.264 at CRF 26 with faststart, for streaming |
| `poster.jpg` | 1280 px wide, six seconds in |
| `thumb.jpg` | 640 px wide, 42 percent in (or `thumb:` seconds in the manifest) |
| `captions.vtt` | from `final.srt` |

`film_status` then shows the piece as `published`, and flags it `republish` if
the cut changes after.

## Related

- [Gates and the reviewer](../../concepts/gates/)
- [Workflows](../../reference/workflows/)
