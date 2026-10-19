# AGENTS.md

Project guidance for coding agents working in this repository. It records what
stays true across changes: the contract, the commands, the patterns and the
invariants. Inventories (which tools, workflows and views exist) live in the code.

## What this is

`@keelson/rib-film` is a rib for [Keelson](https://github.com/danielscholl/keelson)
that makes narrated short films. The loop it runs: a brief and angles, a
storyboard you approve before anything is voiced, a sample of anything new,
the cut, QA in rounds, your notes turned into revisions, and a gated publish.
Pieces live in their own project repos; the rib holds the method, the
production line and the workflows.

## Commands

```bash
bun install
bun test
bun run typecheck        # tsc --noEmit
bun run check            # Biome lint + format

keelson rib add "$PWD"   # install into the keelson home, then `keelson restart`
```

A change needs `bun run check`, `bun run typecheck` and `bun test` green.

## Invariants

- **Any provider can drive it.** The method reaches the agent through rib tools
  and the rib's docs, never through a provider's skill directory. A workflow
  step must work on Copilot, Claude and Codex alike.
- **Process is fixed, shape is not.** Workflows fix the order and the gates;
  they never fix a structure, a template or a look. Two pieces in a series
  should not come out the same.
- **Storyboard before voice, stills before motion.** Nothing is voiced until the
  storyboard is approved; nothing moves until its stills are.
- **Re-run only what is stale.** A revision is keyed to line, board and scene
  ids and re-renders only what those ids touch.
- **The push stays manual.** Publishing stages a piece; it never pushes.
- **Nothing private on screen.** No tokens, keys, subscription or tenant ids,
  home paths, personal chats or a real person's name without their agreement,
  in a frame, a log or a fixture.
- **Secrets stay in the operator's sign-ins.** Keys are fetched per call (`az`,
  environment) and held in memory; the rib never writes one to disk.

## Comments

Default to none. Add one only for a non-obvious why. One short line.

## Conventions

- Conventional commits.
- Fixtures use sample pieces, never a real project's scripts or footage.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:1105d646 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
