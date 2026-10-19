---
title: Install the rib
description: "Add the Film rib to Keelson, install ffmpeg, uv, node and Chrome, and confirm with film_doctor."
sidebar:
  order: 2
---

Film installs like any Keelson rib. See Keelson's
[managing ribs](https://keelsonrib.ai/docs/guides/managing-ribs/) for the
general model.

## Add it

```bash
keelson rib add danielscholl/keelson-rib-film
keelson restart
```

The `film_*` tools appear in chat and over MCP, and `film-cut` and
`film-publish` appear in the workflow catalog.

## The toolchain

The production line renders on your machine and needs four programs:

| Program | Used for | Install (macOS) |
|---|---|---|
| `ffmpeg` | every encode, mix and measurement | `brew install ffmpeg` |
| `uv` | the Python tools and their pinned dependencies | `brew install uv` |
| `node` | the board renderer and card drawing | `brew install node` |
| Google Chrome | drawing boards and cards | from google.com/chrome |

On Linux, add `espeak-ng` for the system voice.

## Check it

Ask chat:

```text
> run film_doctor
```

or run `keelson doctor`. The report lists each program found or missing with
how to install it, which [media services](../../reference/configuration/) are
configured, and the exact `film` command for this machine. It reads only whether
a setting exists, never its value.

The rib reports itself unauthenticated in `keelson doctor` until the toolchain is
complete, and names what is missing.

## Next

[Your first film](../../tutorials/your-first-film/) cuts the sample short in a
few minutes, with no services configured.
