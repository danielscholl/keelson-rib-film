# @keelson/rib-film

A [Keelson](https://github.com/danielscholl/keelson) rib for narrated short
films. You agree a storyboard, the production line renders the cut, your notes
become revisions, and a gated step stages it for publishing. Agents on any
provider, Copilot included, run it through the rib's tools and workflows.

Status: early. The package loads and reports its toolchain; the method, the
production line, the board and the workflows are being ported in.

## Install

```bash
keelson rib add danielscholl/keelson-rib-film
keelson restart
```

Rendering needs `ffmpeg`, `uv` and Google Chrome on the machine. `keelson
doctor` shows what is missing.

## Develop

```bash
bun install
bun run check && bun run typecheck && bun test
keelson rib add "$PWD"   # run your checkout in the keelson home
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

## License

Apache-2.0
