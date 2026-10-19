# QA and review

A cut goes to the user only with zero open P0 and P1 defects and every rubric axis at 8 or better. Machines find the frame-level faults; a reader finds the rest. Do both.

## Before the render

- `film plate <dir> --verify` checks that the board page is a pure function of time (each sampled frame renders the same reached cold or in sequence) and that no font fell back. A failure here becomes a flicker or a wrong frame in the cut, so fix it first.
- Stills of the key boards (`--only`), looked at, and for a long piece shown to the user.

## The evidence

`film-cut` writes it all to the piece's `qa/` folder; by hand, `film review <dir> <dir>/qa/review.md` and `film autoscan <dir>`.

- `qa/review.md`: length, integrated loudness against the target, silence gaps over three seconds, nine frames across the cut, and the narration as captioned.
- `qa/sheet.jpg`: the contact sheet of those nine frames.
- `qa/autoscan.md`: single-frame pops, one-frame flashes, more than three flashes a second (the WCAG 2.3.1 limit), static spans outside the allowed holds, an empty first frame, and a loop seam that doesn't match. These are candidates; look at each and log it or dismiss it with a reason. A pop within half a second of a segment boundary in `build/timeline.json` is the cut itself.
- `build/timeline.json`: every segment, line and mark on the master's clock.

## The checks

1. **Automated scan.** Every autoscan candidate looked at.
2. **Frames.** The contact sheet, plus stills at every scene edge and every board's key moment (`PHONE=<t> film qa <dir>/final.mp4 <t...>` writes a sheet at those times and a 405 px phone frame). Read the phone frame; that is the size most viewers see.
3. **Sound.** `film aqa final.mp4 --win name:start:end ...` for loudness, true peak, and the voice band against any bed. Integrated loudness at the target, no silence past three seconds except a deliberate pause-and-answer hold. Listen to the whole cut once at normal speed for mispronounced words and effects that mask a word, and say in the hand-over whether you listened.
4. **Privacy.** Every frame of footage against the never-on-screen list.
5. **Truth.** The storyboard's "keep it true" list against the narration and every board; every number on screen against the take or the source.
6. **Tracks.** Captions against the narration; chapter titles against the storyboard word for word.
7. **The storyboard's own "Review the cut" list.**

## Severity

| Level | Meaning | Examples |
|---|---|---|
| P0 | must not ship | private data on screen, a false claim, a flash-rate breach, a font fallback, a broken or empty frame, narration cut off |
| P1 | fix before showing the user | a pop or one-frame flash, text unreadable at 405 px, a stall over three seconds, an effect masking a word, a layer showing before its beat |
| P2 | fix if cheap, else note as weak | a slightly late reveal, an uneven hold, a crop that could be tighter |

## The rubric

Score each axis 1 to 10 from the frames and the phone frame, with the evidence (a time) for any score under 8:

| Axis | 8 means |
|---|---|
| Hook | the first two to three seconds say what this is and why to keep watching |
| Clarity | each board makes one point, and the narration and picture say the same thing |
| Readability | every word that matters reads at 405 px |
| Motion | movement explains (draws, traces, builds) rather than decorates; nothing pops or stutters |
| Variety | something new every two to four seconds; no three boards in a row with the same shape |
| Identity | palette, type and devices hold to the series theme and motion file |
| Sound | effects on visible events, beds out of the voice band, loudness at target |
| Truth | every claim traces to the source; nothing from the keep-out list |

## Rounds

Each round: list the three worst problems with times, fix them, re-render only the affected seconds (`film plate <dir> --from S --to E` to check them, then the full plate and compose), re-scan, and re-score. Stop after at least three rounds once every axis is 8 or better and nothing P0 or P1 is open. Never change a threshold or dismiss a candidate to make a score pass; if a rule is wrong for this piece, say so to the user.

Keep `qa/defects.md`: one row per defect with time, severity, what is wrong, cause, and fixed or open. After a fix, re-scan and compare against the last scan.

What a frame-by-frame look catches that the automated scan doesn't:

- a layer showing before its beat, or a stage left visible outside its board;
- type that reflows as words arrive (lay out the whole line first, reveal in place);
- two text layouts cross-dissolving in one position (dip through the paper, or move one out first);
- a stroke's round cap drawn before its line; an arrowhead on an undrawn path;
- linework running through overlaid type (put paper under the type);
- a mask that ends a frame before the private text leaves.

## The cut gate

`film-cut` stops at the cut gate. The series decides who answers it first: a person for the first cuts of a series (three by default), then the reviewer, an agent that reads the evidence above and either approves, answers `changes` with a numbered list naming line, scene or board ids, or hands it to the person. It approves only when nothing is P0 or P1, loudness is within 1 LU of target, every caption and on-screen word is legible, and the picture matches the narration.

For anything over two minutes, or anything that will be published, also have a fresh agent review the cut before the user sees it: give it the storyboard, the source of truth, the evidence and the defect log, and ask it to score the rubric and list defects with times and severity. It has not watched the cut being built, so it sees what the builder has stopped seeing.

Publishing always goes to a person (`film-publish`).
