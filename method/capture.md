# Capturing real footage

## A clean stage

Never record against the user's everyday instance: history, names, and internal lists all leak. Every take, whatever the product:

- A throwaway instance, environment or cluster, reset between takes and recorded in story order, so lists on screen show exactly what the narration claims.
- A short neutral working directory, so no home or scratch path prints. Scratch paths under temp folders look broken on camera.
- The versions, commits, region and date written into the cut's `NOTES.md`.
- A dry run first. If the take differs from the storyboard (a message, an order, a failure), stop and bring it back to the storyboard before voicing.
- Model pickers and settings pages can list internal names; keep them closed on camera.
- Anything that bills is torn down after the take.

A product that switches a shared context (a kube context, a default profile) gets its own copy for the take, so another session mid-task on the shared one isn't disturbed. A feature that hasn't merged often prints its branch name on screen; prefer recording after the merge. A stop before anything is created (a validation error, a plan) needs no environment at all; record those first.

For a cloud take: one dated session in a throwaway environment, every on-screen time from the take's clock, waits cut and labeled with the measured gap, names masked, and the resources purged afterwards.

## Terminal: vhs

`vhs` scripts a terminal recording. A `.tape` file is a script: `Set` lines for look, `Hide`/`Show` around setup, `Type`, `Enter`, `Sleep`.

- `Set Shell "bash"` plus a `Hide`d block that exports env vars, `cd`s, sets a short `PS1`, and clears. Add `BASH_SILENCE_DEPRECATION_WARNING=1` on macOS.
- Match the product palette with an inline `Set Theme { ... }` JSON, and a monospace font that is installed.
- vhs font size is not pixels on the final frame. At 1920x1080, `FontSize 20` with `LineHeight 1.2` fits about 32 rows; size 25 to 28 fits about 24. Count the output lines and size so the key result is on screen at the end.
- A hidden `clear` between commands (`Hide`, `Type "clear" Enter`, `Show`) keeps each beat on one screen.
- Hidden time is cut from the output, so the visible timeline is the sum of the visible Sleeps plus typing (`TypingSpeed` times characters). Use fixed Sleeps so narration offsets are known.

## Browser: Playwright plus CDP screencast

In a scratch folder with Playwright installed, `chromium.launch({ channel: "chrome" })` uses the installed Chrome with a throwaway profile.

- Playwright's `recordVideo` is soft on text. Instead use `Page.startScreencast` (`format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080`) through `ctx.newCDPSession(page)`, saving each frame with `metadata.timestamp` and acking it. `film frames2mp4` turns frames plus timestamps into a constant 30 fps video. Don't feed variable frame durations to ffmpeg's concat demuxer with images: it quantizes short durations and stretches the video.
- Viewport 1600x900 at `deviceScaleFactor: 1.2` fills a 1080p frame with larger UI than a 1920 viewport.
- Inject the rib's `tools/cursor.js` with `ctx.addInitScript`. Headless pages have no cursor, so the injected one (arrow plus click ripple) is the only one on screen. Move with `page.mouse.move(x, y, { steps })` toward each target's bounding box center before clicking.
- Log `Date.now()/1000` at each meaningful action into a `marks` object and save it with the frames. Screencast timestamps share that clock, so marks line up with frames, and the manifest's `marks:` and line `at:` times key off them.
- Prefer role and label locators taken from the app's source (`getByRole("radio", { name: "Runs" })`) over text guesses. When a locator times out, check the source and grab the last captured frame to see where it stalled.
- Log the bounding box of anything you will zoom to alongside its mark; it becomes the zoom box in compose.
