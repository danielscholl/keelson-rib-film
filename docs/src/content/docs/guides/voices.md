---
title: Pick a voice
description: "Set a voice per series, piece or line: a bare Azure Speech name, engine:name, or a mapping with a model and speaking instructions."
sidebar:
  order: 3
---

A voice is set in `series.yaml`, overridden in a piece's `short.yaml`, and
overridden again on one line. The first one found wins: the line, the manifest,
then the series. [Looks and voices](../../concepts/looks-and-voices/) explains
the engines.

## Three ways to write one

A bare name is an Azure Speech voice:

```yaml
voice: en-US-AvaMultilingualNeural
```

`engine:name` picks another engine:

```yaml
voice: elevenlabs:21m00Tcm4TlvDq8ikWAM
```

A mapping sets a model and how to speak:

```yaml
voice:
  engine: azure-openai     # azure, azure-openai, openai, elevenlabs or system
  name: alloy
  model: gpt-4o-mini-tts   # the deployment name on Azure
  instructions: Calm and unhurried.
```

For ElevenLabs, `settings` passes the engine's voice settings
(`stability`, `similarity_boost` and so on) through as they are.

## Keys

Put settings in the environment, or in `.env.local` at the library root. The
starter's `.gitignore` keeps that file out of git.

| Engine | Needs |
|---|---|
| `azure` | `AZURE_SPEECH_KEY`, or `AZURE_AI_RESOURCE`, `AZURE_AI_GROUP` and `AZURE_SUBSCRIPTION_ID` with `az` signed in |
| `azure-openai` | `AZURE_OPENAI_ENDPOINT` or `AZURE_AI_RESOURCE`, with `AZURE_OPENAI_KEY` or the `az` resource settings |
| `openai` | `OPENAI_API_KEY` |
| `elevenlabs` | `ELEVENLABS_API_KEY` |
| `system` | nothing |

A voice that names an engine whose keys are missing stops the voice step with
the setting it needs. Only an unset voice falls back to the system voice.

## Per line

```yaml
lines:
  - { id: n1, scene: open, at: 0.5, text: "Run keelson doctor." }
  - { id: n2, scene: open, at: 4, text: "Then cut.", voice: "openai:nova", style: "brisk" }
  - { id: n3, scene: open, at: 7, text: "SQL", ssml: "<say-as interpret-as='characters'>SQL</say-as>" }
```

- `style` is the speaking instruction on the OpenAI engines, and an Azure
  speaking style where the voice supports one.
- `ssml` replaces the Azure voice body when a word needs a respelling, phonemes
  or a break. Other engines speak `text`, which the captions always use.

## Re-voicing

`film-cut` voices only lines whose text, ssml, voice or style changed since
their take. Changing the series voice re-voices every line on the next cut. To
re-time existing takes without re-voicing, run `film tts <dir> --align-only`.

## Related

- [Configuration](../../reference/configuration/)
- [Sound](../method/sound/)
