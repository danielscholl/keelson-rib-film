---
title: Configuration
description: "Media service settings, where the rib reads them, and the rib's own environment variables."
sidebar:
  order: 4
---

The rib needs no configuration to render. Media services are optional and turn
on voice engines and generators.

## Where settings come from

The production line reads the environment first, then fills anything unset from
`.env.local` at the library root, or the file `FILM_ENV_FILE` names. Values are
never printed. Keep `.env.local` out of git; the starter's `.gitignore` already
does.

## Media services

| Service | Turns on | Settings |
|---|---|---|
| Azure Speech | voice `azure`; word timing for every engine except ElevenLabs | `AZURE_SPEECH_KEY`, or `AZURE_AI_RESOURCE`, `AZURE_AI_GROUP` and `AZURE_SUBSCRIPTION_ID` with `az` signed in |
| Azure OpenAI or Foundry | voice `azure-openai`; `film sora` | `AZURE_OPENAI_ENDPOINT` or `AZURE_AI_RESOURCE`, with `AZURE_OPENAI_KEY` or the `az` resource settings |
| OpenAI | voice `openai` | `OPENAI_API_KEY` |
| ElevenLabs | voice `elevenlabs` | `ELEVENLABS_API_KEY` |
| Gemini | `film veo`, `film lyria`, `film gimg` | `GEMINI_API_KEY` |

`film_doctor` shows which are on.

Without Azure Speech, word times on the `azure-openai`, `openai` and `system`
voices are spread by word length: close enough for captions, looser for a board
that animates on a word.

## Environment variables

| Variable | Effect |
|---|---|
| `FILM_LIBRARY` | the library root, instead of the nearest folder with `assets/` or `.git` |
| `FILM_ENV_FILE` | the settings file, instead of `<library>/.env.local` |
| `PHONE` | `film qa` also writes a 405 px frame at this time |

Keelson's own variables apply as usual; `KEELSON_APPROVAL_REVIEWER=off` sends
every gate to a person. See Keelson's
[configuration](https://keelsonrib.ai/docs/guides/configuration/).

## Series and manifest keys

- `series.yaml`: [series](../../guides/method/series/)
- `short.yaml`: [composing](../../guides/method/compose/)
- `theme`: [pick a look](../../guides/looks/)
- `voice`: [pick a voice](../../guides/voices/)
- `beds` and `sfx`: [add music and effects](../../guides/music-and-sound/)
- `publish`: [publish a cut](../../guides/publish/)
