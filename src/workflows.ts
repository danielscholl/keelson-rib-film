import type { RibWorkflowContribution } from "@keelson/shared";

const FILM_BIN = new URL("../bin/film.ts", import.meta.url).pathname;

// Bash steps get their text verbatim, so they read the piece from "$KEELSON_ARGUMENTS" (validated by
// the resolve step); $resolve.output.* is substituted only in conditions and approval messages.

// The bun running Keelson runs the film command, so a workflow never depends on PATH.
export function filmCommand(runtime: string = process.execPath, bin: string = FILM_BIN): string {
  return `${JSON.stringify(runtime)} ${JSON.stringify(bin)}`;
}

const REVIEWER_PROMPT = `You review one cut of a narrated short before a person sees it.
Call film_guide with topic "review" for the checks, severities and rubric, then read the evidence:
the review page and contact sheet named in the gate message (open the contact sheet image with your file
viewing tool), and qa/autoscan.md beside it. Approve only when nothing is P0 or P1, loudness is within
1 LU of target, every caption and on-screen word is legible, and the picture matches what the narration says.
Otherwise answer changes, as a numbered list where each item names the line id (n1, n2...) or the
scene or board id it concerns and the fix.`;

export function filmCutWorkflow(film: string = filmCommand()): RibWorkflowContribution {
  return {
    definition: {
      name: "film-cut",
      description:
        'Use when: a piece has an approved storyboard and its manifest, and it is time to render the cut. Triggers: "cut ep-03", "render the short", "make the video for this piece". Does: voices changed lines, renders the plate when the piece has one, composes the master with captions and a cut record, writes the review page and autoscan, then stops at the cut gate; the series policy decides whether the reviewer may answer it first. NOT for: storyboards, notes on an existing cut (film-revise), or publishing (film-publish).',
      nodes: [
        { id: "resolve", bash: `${film} info "$KEELSON_ARGUMENTS"`, timeout: 60_000 },
        {
          id: "voice",
          depends_on: ["resolve"],
          bash: `set -o pipefail; ${film} tts "$KEELSON_ARGUMENTS" --changed 2>&1 | tail -n 20`,
          timeout: 900_000,
        },
        {
          id: "plate",
          depends_on: ["voice"],
          when: "$resolve.output.plate == 'true'",
          bash: `set -o pipefail; ${film} plate "$KEELSON_ARGUMENTS" 2>&1 | tail -n 20`,
          timeout: 1_800_000,
        },
        {
          id: "compose",
          depends_on: ["voice", "plate"],
          trigger_rule: "none_failed_min_one_success",
          bash: `set -o pipefail; ${film} compose "$KEELSON_ARGUMENTS" 2>&1 | tail -n 30`,
          timeout: 1_200_000,
        },
        {
          id: "check",
          depends_on: ["compose"],
          bash: [
            "set -eo pipefail",
            'P="$KEELSON_ARGUMENTS"',
            'mkdir -p "$P/qa"',
            `${film} review "$P" "$P/qa/review.md" > /dev/null`,
            `${film} autoscan "$P" 2>&1 | tail -n 5 >&2 || true`,
            'echo "$P/qa/review.md"',
          ].join("\n"),
          timeout: 600_000,
        },
        {
          id: "gate",
          depends_on: ["check"],
          approval: {
            message:
              "Cut ready: $resolve.output.title ($resolve.output.series). Watch $resolve.output.piece/final.mp4. Review page: $check.output (contact sheet $resolve.output.piece/final.qa.png). Approve, or reply with notes for film-revise.",
            capture_response: true,
            reviewer: {
              prompt: REVIEWER_PROMPT,
              when: "$resolve.output.gate == 'reviewer'",
              allowed_tools: ["Read", "film_guide"],
              min_confidence: 85,
            },
          },
        },
        {
          id: "done",
          depends_on: ["gate"],
          bash: `${film} info "$KEELSON_ARGUMENTS"`,
          timeout: 60_000,
        },
      ],
    },
  };
}

export function filmPublishWorkflow(film: string = filmCommand()): RibWorkflowContribution {
  return {
    definition: {
      name: "film-publish",
      description:
        'Use when: a cut has been approved and should go out. Triggers: "publish ep-03", "stage the short for the site". Does: refuses a stale cut or a series with no publish target, asks a person to approve (never the reviewer), then writes the web mp4, poster, thumbnail and captions where the series says. NOT for: pushing; the push stays with you.',
      nodes: [
        {
          id: "resolve",
          bash: [
            `INFO=$(${film} info "$KEELSON_ARGUMENTS") || exit 1`,
            'echo "$INFO"',
            `echo "$INFO" | grep -q '"stale":true' && { echo "the cut is stale: run film-cut first" >&2; exit 1; }`,
            `echo "$INFO" | grep -q '"publishTo":null' && { echo "the series has no publish block in its series.yaml" >&2; exit 1; }`,
            "exit 0",
          ].join("\n"),
          timeout: 60_000,
        },
        {
          id: "gate",
          depends_on: ["resolve"],
          approval: {
            message:
              "Publish $resolve.output.title ($resolve.output.series, stage $resolve.output.stage) to $resolve.output.publishTo? Watch $resolve.output.piece/final.mp4 first.",
          },
        },
        {
          id: "publish",
          depends_on: ["gate"],
          bash: `${film} publish "$KEELSON_ARGUMENTS"`,
          timeout: 600_000,
        },
      ],
    },
  };
}

export function filmWorkflows(): RibWorkflowContribution[] {
  return [filmCutWorkflow(), filmPublishWorkflow()];
}
