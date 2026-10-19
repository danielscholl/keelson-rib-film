---
title: Workflows
description: "film-cut and film-publish: their arguments, nodes, gates and the reviewer's approval rules."
sidebar:
  order: 3
---

Both workflows take one argument, the piece folder, relative to the library or
absolute. Run them outside a worktree so they work on your library:

```bash
keelson workflow run film-cut --arguments <piece> --no-worktree --watch
keelson workflow run film-publish --arguments <piece> --no-worktree --watch
```

Answer a gate with `keelson workflow respond <run-id> gate approve`, or reject
with a note. See Keelson's
[workflow nodes](https://keelsonrib.ai/docs/reference/workflow-nodes/) for the
node types.

## film-cut

| Node | Runs | Notes |
|---|---|---|
| `resolve` | `film info` | fails when the folder has no `short.yaml` or is outside a library |
| `voice` | `film tts --changed` | only new or changed lines |
| `plate` | `film plate` | only when the manifest has a `plate` |
| `compose` | `film compose` | runs when `voice` succeeded, whether or not `plate` ran |
| `check` | `film review`, `film autoscan` | writes `qa/review.md`, `qa/sheet.jpg`, `qa/autoscan.md`; prints the review page path |
| `gate` | approval | the cut gate; the response is captured for revision notes |
| `done` | `film info` | the piece's stage after the gate |

The gate message names the title, series, `final.mp4`, the review page and the
contact sheet.

### The reviewer

When `film info` reports the series' cut gate as `reviewer` (see
[gates](../../concepts/gates/)), the reviewer answers first. It is given the
evidence files and may use only file reads and `film_guide`. An approve at 85
percent confidence or more resolves the gate; anything else pauses for a person
with the verdict attached.

It approves only when:

- integrated loudness is within 1 LU of target;
- no silence runs over 3 s;
- every caption and on-screen word on the contact sheet is legible;
- each frame fits the narration of its scene;
- no autoscan candidate away from a segment boundary shows as a defect. A pop
  within half a second of a boundary in `build/timeline.json` is the cut itself.

Otherwise its verdict is `changes`, a numbered list each naming a line, scene
or board id and the fix, or `escalate` when the evidence is missing or
unreadable.
`KEELSON_APPROVAL_REVIEWER=off` turns every reviewer off, so all gates wait for
a person.

## film-publish

| Node | Runs | Notes |
|---|---|---|
| `resolve` | `film info` | refuses a stale cut and a series with no `publish` block |
| `gate` | approval | always a person; names the publish target |
| `publish` | `film publish` | writes the web copy; never pushes |

## Related

- [Gates and the reviewer](../../concepts/gates/)
- [Publish a cut](../../guides/publish/)
- [Data on disk](../data-on-disk/)
