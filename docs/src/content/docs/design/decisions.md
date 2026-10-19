---
title: Decisions
description: "The choices that shape the Film rib: the method as a tool, a manifest-driven line, gates that move to a reviewer, no built-in look, and a draft path that needs no account."
sidebar:
  order: 2
---

## The method ships as a tool

How to make a good short (angles, storyboards, boards that land on a word, a
mix under the voice, review in rounds) is most of the work, and it is
provider-neutral prose. The rib ships it as `film_guide` topics rather than as a
system prompt, so any agent on any provider reads the page for the step it is
on, and the same pages are this site's [method](../../guides/method/).

**Rules out:** a film-specific agent persona as the only way in. An agent that
never calls `film_guide` can still drive the tools, and the workflows still
render what the manifest says.

## The manifest is the source of a cut

Agents are good at writing a manifest and a board page, and poor at reproducing
an ffmpeg graph twice. So the agent writes intent (lines, which words matter,
what each board shows) and the line renders it the same way every time.
Re-cutting after a change costs one command, and staleness is a fact read from
fingerprints, not a memory.

**Rules out:** freehand edits to `final.mp4`. A fix goes into the manifest or
the board, and the cut follows.

## One command, run by Keelson's bun

The tools are Python, Node and shell. The workflows call them through `film`,
which is the bun running Keelson pointed at the rib's `bin/film.ts`, and the
Python tools run under `uv` with pinned dependencies. A workflow never depends on
`PATH`, and nothing is installed globally.

## Gates start with a person

A new series hasn't shown it cuts well. A person answers its cut gate until it
has published a few pieces, and then the reviewer answers first, from measured
evidence rather than by watching. Publishing always goes to a person, because
it is the step other people see.

**Rules out:** an unattended first cut, and any agent that can publish.

## No built-in look

The rib draws every card and board from a theme the series sets, and its default
is a plain neutral surface. A library's identity belongs to the library, and a
rib that shipped one would make every user's films look like its author's.

## A draft needs no account

The system voice, word timing by length, procedural effects and a procedural
music bed mean the sample renders on a fresh machine with nothing configured.
Services improve a cut; none is needed to see one. A voice that is set but
missing its key fails loudly rather than falling back, so a series never ships
the draft voice by accident.

## Related

- [Deferred](../deferred/)
- [The production line](../../concepts/the-production-line/)
