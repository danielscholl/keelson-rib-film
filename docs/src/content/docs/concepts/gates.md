---
title: Gates and the reviewer
description: "The four gates of the method, who answers each, and the rule that hands the cut gate to a reviewer agent after a series has earned it."
sidebar:
  order: 4
---

A **gate** is a point where the work stops until someone looks. The method has
four, and the series decides who answers the first three.

| Gate | Stops before | Answered by default |
|---|---|---|
| storyboard | a line is voiced | a person |
| sample | the full render, for a long piece | a person |
| cut | anyone else sees the cut | a person for the first three published pieces, then the reviewer |
| publish | the copy goes out | always a person |

In `film-cut` and `film-publish` the cut and publish gates are Keelson
[approval nodes](https://keelsonrib.ai/docs/reference/workflow-nodes/). Approve
with `keelson workflow respond <run> gate approve`, from the Workflows tab, or by
telling chat.

## The reviewer

The **reviewer** is an agent that answers the cut gate first, when the series
lets it. It can't watch video. It reads the evidence the check step measured:
the review page (length, loudness, silence gaps, the narration), the contact
sheet of nine frames, the autoscan candidates, and the timeline of every
segment. Its only tools are reading files and `film_guide`, which holds the full
rubric.

It returns one of three verdicts:

- **approve** when loudness is within 1 LU of target, no silence runs past three
  seconds, every word on the sheet is legible, each frame fits its narration, and
  no autoscan candidate away from a cut shows as a defect;
- **changes**, as a numbered list naming the line, scene or board id and the
  fix;
- **escalate** when the evidence is missing or unreadable.

Only a confident approve resolves the gate. A `changes` or `escalate` verdict,
or an approve below 85 percent confidence, pauses for a person with the verdict
attached, so the numbered list arrives ready to act on.

## Earning the reviewer

`gates.cut` in `series.yaml` is `human`, `reviewer`, or
`{ human_first: N }`. The default is `{ human_first: 3 }`: a person answers the
cut gate until three pieces in the series are published, and the reviewer after
that. The count is published pieces, because publishing is the step a person
always signs off.

Set it to `human` for a series whose every cut you want to see, or lower
`human_first` once you trust the line on a subject. `film_status` shows who
answers each series' next gates.

## Related

- [QA and review](../../guides/method/review/)
- [Workflows](../../reference/workflows/)
- [Publish a cut](../../guides/publish/)
