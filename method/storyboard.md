# The storyboard

The storyboard is the contract for a cut. It is approved before a line is voiced, production reads it every day, and the review checks the finished cut against it. A good one is specific enough that someone else could build the boards from it without asking a question.

## What it holds

**Header.** Who is watching. What they should believe or be able to do after it. The money shot. Form and length (and aspect). The source of truth, by path and commit. Status (draft, approved, in production, published).

**Angles** (only until one is chosen). Two or three cards, each with a logline, structure, money shot, length and what it is best for, the recommended one marked. Once the user picks, keep the others in a short "considered" line so the next video in the series can try one.

**The look.** The references it starts from (clips, frames, the subject's own site) and what each contributes. Palette as named roles (paper, ink, what changes, a stop), the type, the spine picture and how it maps to real terms, and caption policy. For a series episode, only what this episode adds to the series motion file.

**The sound.** The bed (or none) and where it sits, how it is ducked, the loudness target, and for a music-led cut the beat map: the track's tempo and drop from `beats.json`, and which beat each change lands on.

**The board**, one row or card per line:

| Field | Holds |
|---|---|
| Line id | `n0`, `n1`, `q1`; the same ids go into `short.yaml` |
| Beat · chapter | the beat it plays in the genre's grammar, and its chapter title if it starts one |
| Narration | the words as spoken, with spoken forms already applied ("dash dash env") |
| Board | what is on screen, what moves, and on which spoken word ("on 'remove it', the frame ghosts to dashed") |
| Form | drawn, board + take, footage, generated |
| Sound | the effect and the event it lands on ("thump as the floor seats"), or blank; most lines have none |
| Hold, flags | the hold after the line; `cuttable` for lines that go first if the cut runs long; `money shot` |

Write the board column as direction, not decoration: name the element, the motion, the trigger word, and what it settles to. "A load-bearing column draws from the database down to the converter; on 'excluding it' it turns amber" can be built. "Show the dependency visually" can't.

**The take.** One table of commands or actions in story order, which lines use each, and how it is recorded: the stage, the versions, what is masked, what was typed for illustration. Then the departures, if the take had to differ from the source (a `--force` the recording needed, an extra flag to show a status).

**Keep it true.** The claims the narration must not drift from, the features that are in work and stay out, numbers that must be measured at the take's commit, and anything a reader might over-generalize ("say what this take measured; never say the system usually fails").

**Spoken forms.** Written form and spoken form, per term. Reuse the series table and add to it.

**Chapters.** Which lines start one and their exact titles (they become the chapters VTT and the player's chapter names).

**Review the cut.** Five to ten checks specific to this piece, written so each can be ticked against the final. The cut gate's reviewer reads them.

**Cut-downs.** The teaser or clips that come from the same master: which lines, which aspect, which layout.

**Choices for the user.** Only the open ones, each with a recommendation.

## Map structured content to beats

When the source is structured (a lesson's chapters, a unit's JSON, a design record's sections), map its fields to beats in a table: which field feeds which beat and what the screen shows for it. The video can then be checked against the source when the source changes, and a test in the source repo can fail when a lesson drifts from a published video.

## Runtime

Estimate each line at 150 to 160 words a minute plus its hold, and show the total and the total without the cuttable lines. The voiced narration replaces the estimate; if the real total lands more than 15 percent over budget, cut lines in the storyboard first, then re-voice.

## Publish it for review

Make the storyboard a page the user can read on a phone and comment on, and draw a frame for every board:

- Frames depict video frames, so they keep the video's palette in both page themes; only the page around them follows the viewer's theme.
- When the piece has a spine picture (a building, a road, a map), write one small SVG function that draws it with options (what is lit, what is gone, what is added) and reuse it on every frame. That makes thirty frames cheap and keeps them consistent with each other.
- Render the page once headless and look at the frames at a reduced size before publishing; overlapping labels are the usual defect.
- Compute the runtime estimate in the page from the narration text, so it stays right as lines change.

Once approved, the storyboard also lives as markdown beside the source of truth or in the piece's `NOTES.md`.
