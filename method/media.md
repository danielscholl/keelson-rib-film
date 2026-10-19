# Voice, video, images and music

Every service is optional; `film_doctor` shows which are configured. Settings come from the environment or `.env.local` at the library root. Never write a key into the library, a manifest, a prompt file or a log, and never print one.

## Voice engines

`voice` in `series.yaml`, a manifest or a line picks the engine. A bare name is an Azure Speech voice; `engine:name` picks another; a mapping adds `model`, `instructions` and `settings`.

| Engine | What it is | Settings | Word times |
|---|---|---|---|
| `azure` | Azure Speech voices, MAI voices included | `AZURE_SPEECH_KEY`, or `AZURE_AI_RESOURCE`, `AZURE_AI_GROUP`, `AZURE_SUBSCRIPTION_ID` with `az` signed in | transcription |
| `azure-openai` | a speech model deployed on Azure OpenAI or a Foundry resource; `model` is the deployment name | `AZURE_OPENAI_ENDPOINT` or `AZURE_AI_RESOURCE`, with `AZURE_OPENAI_KEY` or the `az` settings | transcription, else spread |
| `openai` | OpenAI speech models | `OPENAI_API_KEY` | transcription, else spread |
| `elevenlabs` | ElevenLabs; `name` is the voice id, `settings` its voice_settings | `ELEVENLABS_API_KEY` | its own alignment |
| `system` | the machine's voice (`say`, `espeak-ng`), for drafts | none | spread |

- Transcription means Azure fast transcription of each rendered line, aligned back to the known text; words it hears differently are interpolated between their neighbours. It needs Azure Speech configured. Without it, times are spread by word length: fine for captions, loose for a board that animates on a word.
- `style` wraps an Azure line in an express-as style (only some voices take one) and becomes the speaking instructions on the OpenAI engines. `instructions` says the same in plain words ("calm and unhurried, like a guide").
- Changing the voice changes every take's record, so the next `film tts --changed` re-voices every line.
- With no voice set anywhere, Azure Speech is used when it is configured, else the system voice. A voice that is set but missing its settings stops the cut with the setting to add.

## Generated clips

- `film sora prompt.txt out.mp4 [--seconds 4|8|12] [--size 1280x720] [--remix VIDEO_ID]`: Sora on the Foundry resource named by `AZURE_AI_RESOURCE`, with `AZURE_OPENAI_KEY` or the `az` settings. Bills per generated second, so iterate on short clips. A deployment usually takes one job at a time; run variants in sequence. `--remix` reworks a recent job with a new prompt.
- `film veo prompt.txt out.mp4 [--image first.png] [--last last.png]`: Veo through the Gemini API (`GEMINI_API_KEY`). First and last frame interpolation is the useful part: a generated move that begins and ends on the series' own pixels. Mute its audio by default.
- Veo beats a text-only model for anything that must match an existing identity, because it can start and end on given frames; text-only models drift off the palette.
- For a drafting-sheet look, name the palette in words and the build order ("the keel beam first, then the ribs rising"), ask for a flat top-down view, and end with "No text, no letters, no logos."

Both tools save the prompt and settings beside the clip so the asset stays reproducible.

## Images

`film gimg prompt.txt out.png [--aspect 16:9] [--ref img ...]`: stills, plates, and edits of a reference (Gemini). What works: name the palette in words and the medium ("flat illustration with light texture", "a field notebook spread"), give every word that may appear in quotes and say "use ONLY the text given, spelled exactly", and end with "no other words, no watermark, no logos". Read every generated label before using a frame; a misspelt word is a defect, and a plate meant for video usually should carry no text at all.

## Music

`film lyria prompt.txt out_base`: music for beds and music-led cuts (see the sound page). The output carries a SynthID watermark.

## Keep a record

Every generated asset keeps its prompt, model and settings beside it (the tools do this), and the ranked takes and rejected ones go in a `README.md` in the asset's folder with why each failed. Read it before prompting again.
