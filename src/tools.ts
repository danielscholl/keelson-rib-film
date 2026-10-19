import { isAbsolute, resolve } from "node:path";
import type { ToolDefinition } from "@keelson/shared";
import { z } from "@keelson/shared";
import { scanLibrary } from "./library.ts";
import { loadMethod, METHOD_DIR, type MethodPage } from "./method.ts";
import { decideGate, reviewerMinutes } from "./series.ts";

function guideText(
  pages: readonly MethodPage[],
  topic?: string,
): { text: string; isError: boolean } {
  if (pages.length === 0) {
    return { text: "The film method is not installed in this rib build.", isError: true };
  }
  if (!topic) {
    const rows = pages.map((p) => `- ${p.topic}: ${p.title}. ${p.summary}`);
    return {
      text: `Film method topics. Read 'method' first, then the topic for the step you are on.\n\n${rows.join("\n")}`,
      isError: false,
    };
  }
  const page = pages.find((p) => p.topic === topic.trim().toLowerCase());
  if (!page) {
    return {
      text: `No topic '${topic}'. Topics: ${pages.map((p) => p.topic).join(", ")}.`,
      isError: true,
    };
  }
  return { text: page.body, isError: false };
}

export function filmGuideTool(dir: string = METHOD_DIR): ToolDefinition {
  return {
    name: "film_guide",
    description:
      "The narrated-video method: the flow and its gates, storyboards, series, craft, motion, capture, sound, compose, review and media services. Call with no topic to list topics; read 'method' before planning a film and the matching topic before each step.",
    inputSchema: z.object({
      topic: z.string().optional().describe("A topic from the listing, e.g. 'storyboard'"),
    }),
    async execute(input, ctx) {
      const { topic } = input as { topic?: string };
      const { text, isError } = guideText(loadMethod(dir), topic);
      ctx.emit({
        type: "tool_result",
        toolUseId: "",
        content: text,
        ...(isError ? { isError } : {}),
      });
    },
  };
}

export function libraryStatus(root: string) {
  const lib = scanLibrary(root);
  return {
    root: lib.root,
    series: lib.series.map((s) => {
      const approvedCuts = s.pieces.filter((p) => p.stage === "published").length;
      return {
        id: s.id,
        configured: s.configured,
        ...(s.error ? { error: s.error } : {}),
        nextGates: {
          storyboard: decideGate(s.config, "storyboard", approvedCuts),
          sample: decideGate(s.config, "sample", approvedCuts),
          cut: decideGate(s.config, "cut", approvedCuts),
          publish: "human",
          reviewerMinutes: reviewerMinutes(s.config),
        },
        pieces: s.pieces.map((p) => ({
          id: p.id,
          title: p.title,
          stage: p.stage,
          ...(p.flags.length > 0 ? { flags: p.flags } : {}),
          voice: `${p.voiced}/${p.lines}`,
          ...(p.stage !== "scripted" && p.stage !== "voiced" && p.stale === null
            ? { staleness: "unknown" }
            : {}),
          ...(p.error ? { error: p.error } : {}),
        })),
      };
    }),
  };
}

const MAX_RESULT_CHARS = 16_000;

export function filmStatusTool(): ToolDefinition {
  return {
    name: "film_status",
    description:
      "Every series and piece in a film library with its stage (scripted, voiced, cut, checked, published), drift flags (stale-cut, partial-voice, republish, unpublished, bad-manifest) and who answers each series' next gates (human or reviewer). Use before choosing what to work on, and after a cut to confirm where a piece stands.",
    inputSchema: z.object({
      library: z
        .string()
        .optional()
        .describe("Library folder; defaults to the current project folder"),
      series: z.string().optional().describe("Only this series id"),
    }),
    async execute(input, ctx) {
      const { library, series } = input as { library?: string; series?: string };
      const root = library ? (isAbsolute(library) ? library : resolve(ctx.cwd, library)) : ctx.cwd;
      try {
        const status = libraryStatus(root);
        const filtered = series
          ? { ...status, series: status.series.filter((s) => s.id === series) }
          : status;
        let text = JSON.stringify(filtered);
        if (text.length > MAX_RESULT_CHARS) {
          text = JSON.stringify({
            truncated: true,
            note: "Too many pieces for one answer; pass a series id.",
            series: status.series.map((s) => ({ id: s.id, pieces: s.pieces.length })),
          });
        }
        ctx.emit({ type: "tool_result", toolUseId: "", content: text });
      } catch (e) {
        ctx.emit({
          type: "tool_result",
          toolUseId: "",
          content: JSON.stringify({ error: (e as Error).message }),
          isError: true,
        });
      }
    },
  };
}

export function registerFilmTools(): readonly ToolDefinition[] {
  return [filmGuideTool(), filmStatusTool()];
}
