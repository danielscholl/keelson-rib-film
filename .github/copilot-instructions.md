# Copilot code review: @keelson/rib-film

A [Keelson](https://github.com/danielscholl/keelson) rib, Bun + TypeScript with
a Python and Node production line, that makes narrated short films: storyboard,
sample, cut, QA, revision and a gated publish. `AGENTS.md` has the invariants.

## How to review

Be terse and cite `file:line`. A few high-signal findings beat breadth. This is
single-operator local software: skip speculative scale, multi-tenant and
micro-optimization concerns. No poems, jokes or emoji.

## What to flag

- **Provider lock-in.** A workflow step or tool that only works because one
  provider loads a skill directory or a provider-specific tool.
- **Secrets.** A key, token, subscription or tenant id written to disk, logged,
  or placed in a fixture, frame or board.
- **Untrusted frame input.** Anything from a `canvas-html` origin acted on
  without validation, or an exec argument built from it unchecked.
- **Gates skipped.** Voicing before an approved storyboard, or a publish step
  that pushes.
- **Attach only through the `Rib` contract** from `@keelson/shared`. Flag
  reaching into harness internals.

## What not to flag

- Missing docstrings or comments.
- Tests in `test/` using `bun:test`.
- The absence of an abstraction; this repo waits for a second caller.
