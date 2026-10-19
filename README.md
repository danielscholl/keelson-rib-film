# @keelson/rib-film

A [Keelson](https://github.com/danielscholl/keelson) rib for narrated short
films. You agree a storyboard, the production line renders the cut, your notes
become revisions, and a gated step stages it for publishing. Agents on any
provider, Copilot included, run it through the rib's tools and workflows.

Status: early. The production line, `film-cut` and `film-publish` work; the
method guide, the board and `film-revise` are being ported in.

## Install

```bash
keelson rib add danielscholl/keelson-rib-film
keelson restart
```

Rendering needs `ffmpeg`, `uv`, `node` and Google Chrome on the machine. Ask
chat to run `film_doctor`, or run `keelson doctor`, to see what is missing and
which media services are configured.

## First film

Make an empty folder for your library and open chat there:

```text
> start a film library here
```

`film_init` writes a sample series with one short: a manifest, two motion
boards and three narrated lines. Then cut it:

```bash
keelson workflow run film-cut --arguments first-steps/fig-01-hello --no-worktree --watch
```

The workflow voices the lines, renders the boards, composes the cut with
captions, writes a review page with a contact sheet, and stops at the cut gate
for you. The finished short is `first-steps/fig-01-hello/final.mp4`.

No cloud account is needed. Without Azure Speech the lines are read by the
machine's own voice (`say` on macOS, `espeak-ng` on Linux), good enough to
check timing. Configure Azure Speech and cut again to re-voice them.

## Look

A series sets its look in `series.yaml`, and a piece can override it in its
manifest. Nothing is built in: the default is a plain neutral surface.

```yaml
theme:
  look: plain            # plain, blueprint or dark
  background: assets/bg.jpg   # or grid, plain, or any CSS background
  colors: { primary: "#1e3a5f", accent: "#b5803a" }
```

Captions, title cards and the frame around footage draw with it, and plate
boards read it as `--film-*` CSS variables, so a board page written against
those variables follows the series.

## Media services

All optional. Put the settings in the environment or in `.env.local` at the
library root (the starter's `.gitignore` keeps it out of git).

| Service | Tools | Settings |
|---|---|---|
| Azure Speech | `tts`: narration with word timing | `AZURE_SPEECH_KEY`, or `AZURE_AI_RESOURCE`, `AZURE_AI_GROUP` and `AZURE_SUBSCRIPTION_ID` with `az` signed in |
| Azure OpenAI (Sora) | `sora`: generated clips | `AZURE_OPENAI_KEY`, or the same resource settings |
| Gemini | `veo`, `lyria`, `gimg`: clips, music, images | `GEMINI_API_KEY` |

## Develop

```bash
bun install
bun run check && bun run typecheck && bun test
keelson rib add "$PWD"   # run your checkout in the keelson home
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

## License

Apache-2.0
