# Craft

Raw material for choosing differently each time. None of it is a template. Inventing a new structure or device is better than reusing one, and the best choices come from the subject's own world.

## Choosing an angle

Start from what the viewer has to walk away with, then pick the genre whose grammar delivers it. Each grammar is a default order of beats, not a script.

| Genre | When | Beat grammar |
|---|---|---|
| Demo | one capability, shown working | hook, set-up, the real run, payoff, close |
| Concept explainer | an idea footage can't show | question, standfirst, claims (each builds, then settles), an example traced, the easy mistake, recall, next |
| Feature walkthrough or launch | something new replaces something painful | the pain shown concretely, the turn (money shot), how it works in chapters, the guardrails, compatibility ("no file, nothing changes"), recall, call to action |
| Lesson or study guide | someone must remember it for a test or a task | where we are on the map, content beats, a hook to remember, traps ("don't confuse"), pause and answer, recall, next |
| Project story or field trial | a piece of work and how far it got | the problem in the field, the rig, trials one by one with built / in work / proposed stamps, the report |
| Experiment and compare | a choice between options | the options, the same question run on each, the results side by side, how to pick |
| Launch film or teaser | a release, an announcement, a cut-down of a master | music-led, 15 to 45 s: a hook in the first second, something on most beats, the money shot on the drop, a clean last frame (or the first frame again, for a loop); narration optional and only in the breakdown |
| Failure and recovery | trust in a guardrail | the run, the break, what catches it, the recovery |

Other angles: before and after; under the hood (start at the result and peel back); a question a user really asks; an agent driving the product; build it live; a day in sixty seconds; a relay of one thing passed between three surfaces.

## Structures

- One continuous drawing that grows.
- Boards bracketing footage: what, then proof, then why. Common, and easy to overuse.
- Mistake first: a broken thing, the check that names it, the fix.
- Split screen on one clock.
- A recurring map that returns every chapter and every episode, with "you are here" moving along it.
- One long real run cut to its beats.
- Cold open on the money shot, then rewind. Without a sting to frame it, it can read as a stray screenshot.
- Montage of hard cuts on a music beat; no narration, kinetic type only.
- A countdown or checklist overlay that ticks as each beat lands.

## The spine metaphor

One picture carrying the whole piece beats a new picture per board. Take it from the subject's own words where you can: a design record titled "a profile is the floor of a stack" becomes a building whose floors are the real layers; a project named for a boat's keel gets a hull whose ribs rise; a course that turns on a choice gets a fork in the road.

- Map every part to a real term in a table in the storyboard (floor = layer, room = service group, column = a dependency). If a part has no real term, it doesn't get drawn.
- Check the picture against the facts in both directions. A floor must not vanish when one room leaves it if the real layer stays.
- When the metaphor stops fitting, leave it for that beat. Never bend the facts to save the picture.

## Openers

- Straight into the product, no title (often strongest in a social feed).
- The question, set word by word on the spoken times.
- The problem made physical: a command running off the frame, a list of options multiplying, a guide rebuilt for the sixteenth time.
- The series sting carrying the spoken title (keep it under five seconds).
- A generated establishing shot in the series palette.

## Directing

Left alone, a model drifts to the template: centered text, a gradient, everything fading in. Direct it.

- Start from a reference: one or two clips or frames the user likes, a series' existing cut, or the subject's own site. Name what to take from each (the pacing, the type, the camera), not "make it like this".
- Write board directions in camera words: "push in on the plan panel until the Services row fills the frame", "hard cut on 'stops'", "slow this zoom to 0.7x", "hold one beat, then the stamp".
- Use real material: the product's own screenshots, logos and UI, broken into parts that can move separately, rather than invented buttons or a screenshot slid across the frame.
- Ask for variants where the choice is visual: two or three takes of the opener or the money shot as stills, side by side.

## Showreel rules are not lesson rules

Viral motion-graphics reels ban holds over a second, crossfades, glows, particles, typewriter text, gradient type and purple-to-blue backgrounds, and put a hook in the first second. For a launch film or teaser, take those bans as given. For a lesson or explainer, keep the bans on decoration (glows, particles, gradient type, template backgrounds) but not on holds: a viewer has to read, and a pause-and-answer beat is three seconds of deliberate stillness.

## Devices worth reaching for

Pick at least one the series hasn't used, or invent one:

- Word-timed kinetic type, each word landing on its spoken time.
- A dot tracing a path through hops.
- A YAML or config file drawing itself into the graph it describes, with a ghost node where a reference is broken.
- Owner lanes on one time axis; a milestone ladder.
- Crossed-out alternatives.
- A dial with a moving knob; a switchboard grid lighting per rule; a decay curve.
- A wall of fail-to-pass rows turning green.
- Status stamps: built, in work, proposed, drawn from the contract.
- A title block that fills in as the opener.
- Pause and answer with a countdown ring.
- "The road so far", recurring in every episode.
- A prequel and postquel around the episode (a notebook opening and closing).
- Time-windowed masks over private text.
- Push-ins and pans on footage (`zoom` in `short.yaml`).
- Flags lifting off a command line and landing on their keys in a file.
- A speed ramp with an on-screen clock: fast through waiting, real time for the moment that matters.
- Effects on the biggest events and a bed under the money shot.
- Real motion blur on a fast camera move (`film plate --subframes 4 --fps 60`).
- A morph between boards in place of the crossfade: one shape floods the frame and becomes the next board.
- A spotlight that dims everything but one element.
- A side-by-side diff of two runs or two files, changes lighting as they are named.
- Two voices in dialogue.
- A native 9:16 layout with stacked panes; a 1:1 cut.
- A fifteen-second reply clip that answers one question someone asked.
- The narrator making the easy mistake out loud, then correcting it on screen.
- A progress map that doubles as chapter navigation.

## Pacing

- Narration runs about 150 to 160 words a minute. A board every 6 to 12 seconds keeps a lesson moving; a demo can hold longer on a live run.
- One new thing on screen at a time. Lay out a whole line of type before revealing it, so nothing reflows.
- Hold about a second after each reveal and two on the money shot. A pause-and-answer hold is three seconds of silence with the ring running.
- Silence over three seconds anywhere else feels like a stall: tighten the take, add a line, or lay a bed.

## Aspect and length

- 16:9 1080p for video sites, docs and course pages.
- 9:16 1080 by 1920 for vertical feeds. It needs its own layout (stacked panes, tight crops), never a letterboxed 16:9. Set `canvas: [1080, 1920]` in the manifest.
- 1:1 for square feeds.
- 15, 30, 60 seconds for social; two to four minutes to explain a feature; up to five for a lesson. Cut the short versions from the long master's lines rather than writing them twice.

## A video in a kit

A video is often one piece of a set that shares one identity: a course might have a video, a deck and an infographic per unit, an audio overview, and a study site that embeds the videos with flashcards and quizzes, all in one look built once. When the brief is "help someone learn this", ask whether the other pieces are wanted, and build the identity (palette, type, the spine picture) so each piece can reuse it.
