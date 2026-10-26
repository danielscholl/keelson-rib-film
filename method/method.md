# Narrated video

A video earns its time by making one idea land for one audience. This is the method for narrated shorts, from a 15-second clip to a five-minute lesson: product demos from real screen and terminal footage, concept explainers in drawn motion, feature walkthroughs and launches, training lessons, project stories, and teasers cut from a master. Not for slide decks, static infographics, or a silent GIF for a pull request.

Choose the form beat by beat:

- **Footage** where proof matters: the real product doing real work, recorded, never staged.
- **Drawn motion** where an idea matters: a board that shows a mechanism footage can't, on the subject's own picture.
- **Generated art** for mood and metaphor: an opener, a plate, a recall spread. It never stands in for the product and never asserts a fact.

Most strong pieces mix all three. The subject, length and look change every time; the method doesn't.

## The tools

- `film_guide` serves these pages by topic: craft, storyboard, capture, motion, compose, sound, media, review, series.
- `film_status` lists the library's series and pieces with each piece's stage (scripted, voiced, cut, checked, published) and what needs attention.
- `film_doctor` reports the toolchain, which media services are configured, and the exact `film` command for this machine. `film <tool> <short-dir>` below means that command.
- `film_init` writes a starter library with one working piece.
- In a sandboxed chat, `film` can't run from your shell: it needs the network, its own Python environment and a browser. Ask the user to turn the sandbox off (`/sandbox off`) before running it, or use the workflows, which run unsandboxed.
- The `film-cut` workflow voices changed lines, renders the plate, composes, writes the review page, and stops at the cut gate. `film-publish` copies a checked cut to the series' publish target after a person approves.

A library is a folder with `assets/` (or a git repo). Each piece is a folder with a `short.yaml` manifest; a series is the nearest `series.yaml` above its pieces, holding the voice, theme, gates and publish target.

## Flow

Gates are in bold. Don't skip one because the piece is short.

1. **Brief.** Who is watching, what they should believe or be able to do afterwards, where it plays (a social feed, a docs page, a course site), and the length budget. Name the source of truth (docs, a design record, code at a commit, lesson content) and read it before inventing anything. Separate what ships from what is in work.
2. **Angles, chosen by the user.** Pitch two or three that differ in kind, not in skin: a different structure, dominant form, or length class. Each gets a logline, its structure, its money shot (the one moment that proves the point), a length, and what it is best for. Recommend one. The craft page has the genres and their beat grammars.
3. **Storyboard, approved before a line is voiced.** The references it starts from, every line, every board in camera words, the sound beat by beat, the take, what must stay true, spoken forms, and the review checklist. Publish it as a page with drawn frames so it can be reviewed on a phone. A change after approval goes back into the storyboard first. See the storyboard page.
4. **Voice.** Lines go in `short.yaml`; `film tts <dir>` renders one WAV per line plus word times in the series voice. Narration durations set the pacing for everything after.
5. **Stills before motion.** Render the key boards as stills (`film plate <dir> --only t1,t2`) and look at them; run `--verify` on the page. For anything over two minutes, show the user four to six stills before the full render.
6. **Capture.** A clean stage, real takes in story order, marks logged at each action. See the capture page.
7. **Generated pieces and sound**, as the storyboard calls for them: images, clips and music (the media page), effects and beds (the sound page).
8. **Compose.** `film-cut`, or `film compose <dir>` by hand. See the compose and motion pages.
9. **QA in rounds.** Automated scan, contact sheet, phone-width frame, sound by measurement, privacy, truth, then score the rubric and fix the three worst problems per round until nothing P0 or P1 is open and every axis is 8 or better. See the review page.
10. **Hand over.** Give the user the file to open. Say what is weak in this cut, not just what is in it.
11. **Record.** `NOTES.md` in the piece's folder: the storyboard it was cut from, versions and commits, what is weak. Put any reusable piece into `assets/` with how it was made.

## Range, not sameness

A series slides into a formula without noticing: every episode a spoken title, a what board, footage, a why board, the same voice, the same length. Each varies three details and keeps the same shape. Before planning:

- Read the last five pieces of the series (`film_status`, and their `NOTES.md`) and write the formula they share in one line.
- Break it structurally: change at least one of story structure, dominant form, or length class, and at least two of opener, visual devices, sound, voice, aspect, and pacing.
- Use at least one device the series has not used yet (the craft page lists devices worth reaching for).

A series identity (bookends, palette, voice) is the one thing allowed to repeat, and it stays light. Copy mechanics freely; never copy a shape.

## Keep it true

- Every spoken claim and on-screen fact traces to the source of truth. The storyboard carries a "keep it true" list and the cut is checked against it.
- An unshipped feature is drawn from its contract and stamped IN WORK, or left out.
- Footage is recorded, not reenacted: crop, zoom, and cut the waits (and mark each cut), but never retype, reorder, or fake output. A command typed for illustration and never run says so on screen.
- A time on screen is measured from the take, or labeled illustrative.
- Live AI output in a take is checked number by number before the take is kept.
- Never on screen: tokens, keys, subscription or tenant ids, home paths, personal chats, internal model names, or a real person's name without their agreement.
- Generated art carries no generated text and says nothing the source doesn't.

## Defaults

A series can change any of these in `series.yaml`.

- Loudness -16 LUFS for narration-led pieces; -14 LUFS (two-pass) for music-led social cuts. Burned-in captions for social, because many people watch muted; a VTT track for docs and course pages, plus a chapters VTT for anything over two minutes.
- Length by purpose: 15 to 60 seconds for social, two to four minutes for a feature or concept explainer, up to five for a lesson. A shorter budget forces a sharper concept.
- Anything publish-facing goes past the user first. Never post on their behalf.

## Judgement calls

- Phones are the real screen. If text is unreadable at 405 px wide, crop or zoom to the region that matters.
- One idea per board. If a board needs two sentences in the storyboard to describe, it is two boards.
- Let reveals breathe: about a second before the next line, two on the money shot. Silence past three seconds feels like a stall, except a deliberate pause-and-answer hold.
- Give the eye about two seconds of held frame between a cinematic opener and the first UI footage.
- A metaphor earns its place only if each part maps to a real term. When a real term doesn't fit, change the picture, not the facts.
- Silence under narration is a choice, not a default. Decide in the storyboard whether a piece gets a bed and which events get an effect; a lesson can stay dry, a teaser shouldn't.
- A fake cursor helps the eye follow clicks; one that moves when nothing happens is noise.
- Captions follow the narration closely and can drop filler. Skip them only where the screen already says the same words.
- Ending on an install command or URL is one option, not a rule. Don't read either aloud; the card carries it.
