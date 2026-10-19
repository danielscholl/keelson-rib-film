---
title: Looks and voices
description: "A series sets a look (colors, background, type) that every card and board draws with, and a voice that picks one of five speech engines."
sidebar:
  order: 5
---

A series is recognizable by how it looks and how it sounds. Both are set once in
`series.yaml`, can be overridden by a piece's manifest, and are never built into
the rib: a library with no settings gets a plain neutral surface and the
machine's own voice.

## The look

A **look** is a preset (`plain`, `blueprint` or `dark`) plus whatever the series
changes on top: named color roles, a background, typefaces and a brand line.

Everything drawn reads from the same resolved theme:

- **Cards** (captions, title tags, callouts, the frame around footage) are HTML
  rendered by Chrome and overlaid, so the type is full CSS.
- **Board pages** get the theme as `--film-*` CSS variables and
  `window.filmTheme`. A board written against the variables follows the series
  when its look changes.

Color roles have names, not hues: `primary`, `accent`, `text`, `muted`,
`paper`, `shade` and a few more. A board asks for "the accent", and the series
decides what that is. [Pick a look](../../guides/looks/) has the keys.

## The voice

A **voice** names an engine and a voice on it. Five engines are built in:

| Engine | What it is | Times its own words |
|---|---|---|
| `azure` | Azure Speech voices | no |
| `azure-openai` | a speech model deployed on Azure OpenAI or a Foundry resource | no |
| `openai` | OpenAI speech models | no |
| `elevenlabs` | ElevenLabs voices | yes |
| `system` | `say` on macOS, `espeak-ng` on Linux, for drafts | no |

Boards and captions need to know when each word was spoken. ElevenLabs returns
that itself. For the others, the line uses Azure Speech's fast transcription
when Azure Speech is configured, and otherwise spreads the words by length,
which is close enough for captions and looser for a board that draws on a word.

With no voice set anywhere, Azure Speech is used when it is configured, else the
system voice. Changing the voice re-voices every line on the next cut.
[Pick a voice](../../guides/voices/) shows each form.

## Related

- [Pick a look](../../guides/looks/)
- [Pick a voice](../../guides/voices/)
- [Series](../../guides/method/series/)
