---
title: Tools and commands
description: "The film_guide, film_status, film_doctor and film_init tools, and the film command's production-line tools."
sidebar:
  order: 2
---

## Tools

The rib registers four tools. They reach Keelson chat and any MCP client through
the harness [tool registry](https://keelsonrib.ai/docs/guides/using-mcp/).

| Tool | Input | Returns |
|---|---|---|
| `film_guide` | `topic?` | with no topic, the method's topics with a one-line summary each; with one, that page |
| `film_status` | `library?`, `series?` | every series and piece with its stage, drift flags, voiced lines, and who answers each series' next gates |
| `film_doctor` | `library?` | the toolchain found or missing with a fix, each media service on or off with how to turn it on, and the exact `film` command |
| `film_init` | `dir?` | the files written and kept, the sample piece, and the next step |

`library` and `dir` default to the chat's project folder; over MCP with no
project, that is the server's folder, so pass them. With no `dir`, `film_init`
refuses a folder that isn't empty, a git repo or a library. `film_doctor` reads
only whether a setting exists, never its value. `film_status` answers with a
per-series count instead when a library is too large for one result; pass
`series` to narrow it.

`film_guide` topics: `method`, `storyboard`, `series`, `craft`, `motion`,
`capture`, `media`, `sound`, `compose`, `review`. They are the pages under
[the method](../../guides/method/).

## The film command

The production line runs through one command: the bun running Keelson, pointed
at the rib's `bin/film.ts`. `film_doctor` prints it. To type it as `film`:

```bash
alias film='<the command film_doctor prints>'
```

The current folder is the library unless `FILM_LIBRARY` names one. `film` alone
lists the tools; exit code 2 means a bad tool name.

| Command | Does |
|---|---|
| `film info <dir>` | one piece as JSON: library, series, title, stage, staleness, publish target, plate, who answers its cut gate |
| `film init [dir]` | start a library with the sample series; never overwrites |
| `film tts <dir>` | voice lines and time every word; `--changed`, `--only n1,n2`, `--align-only`, `--voice` |
| `film plate <dir>` | render the board page to video; `--only` stills, `--verify`, `--from S --to E`, `--fps`, `--subframes` |
| `film compose <dir>` | build `final.mp4` and `final.srt` from the manifest, and the cut record |
| `film review <dir> <out.md>` | measure the cut and write the review page and contact sheet |
| `film autoscan <dir>` | defect candidates: pops, flashes, flash rate, static spans, empty first frame |
| `film qa <video> [t...]` | contact sheet, silence gaps and loudness; `PHONE=<t>` adds a 405 px frame |
| `film aqa <video>` | loudness, range, true peak, and band levels per `--win name:start:end` |
| `film publish <dir>` | stage the web mp4, poster, thumbnail and captions |
| `film cards` | render overlay cards from a spec with Chrome |
| `film loop <out.wav> --len S` | a procedural music bed; `--bpm`, `--chords`, `--seed`, `--lufs`, `--no-beat`, `--no-arp` |
| `film sfx <voice> <out.wav>` | one UI effect: click, tick, pop, thump, whoosh, riser, chime |
| `film bed` | a bookend bed: music window, foley, a voice-band dip and a duck |
| `film beats <track>` | tempo, beats, downbeats and the drop of a music track |
| `film onsets <track>` | note onsets and the loudness envelope, for cut points |
| `film frames2mp4` | turn screencast frames into a constant-frame-rate video |
| `film sheet-server <dir>` | serve a folder on 127.0.0.1 so an approval page can show its images |
| `film lyria` | a music clip from Lyria (Gemini) |
| `film veo` | a video clip from Veo (Gemini) |
| `film sora` | a video clip from Sora (Azure OpenAI) |
| `film gimg` | an image from a Gemini image model |

Each tool prints its own usage when run with no arguments. The generators save
the prompt next to what they make.

## Related

- [Workflows](../workflows/)
- [Configuration](../configuration/)
