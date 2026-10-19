import { isAbsolute, join, resolve } from "node:path";
import type { ToolDefinition } from "@keelson/shared";
import { z } from "@keelson/shared";
import { configuredNames, probeServices, probeToolchain } from "./doctor.ts";
import { initLibrary, STARTER_PIECE } from "./init.ts";
import { libraryRootFor, scanLibrary } from "./library.ts";
import { loadMethod, METHOD_DIR, type MethodPage } from "./method.ts";
import { decideGate, reviewerMinutes } from "./series.ts";
import { filmCommand } from "./workflows.ts";

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

export function doctorReport(cwd: string, library?: string) {
  const root = libraryRootFor(library ? resolve(cwd, library) : cwd);
  const envFile = process.env.FILM_ENV_FILE ?? join(root, ".env.local");
  const toolchain = probeToolchain();
  const services = probeServices(configuredNames(process.env, envFile), Bun.which("az") !== null);
  return {
    library: root,
    command: filmCommand(),
    toolchain: toolchain.map((t) => ({
      name: t.name,
      found: t.found,
      ...(t.found ? {} : { fix: t.hint }),
    })),
    services: services.map((s) => ({
      service: s.service,
      tools: s.tools,
      on: s.on,
      ...(s.on ? {} : { how: s.how }),
    })),
    note: "Services are optional: storyboard, motion, compose and QA need none. Without a voice service, narration uses the system voice for drafts; set voice in series.yaml to pick an engine (azure, azure-openai, openai, elevenlabs, system).",
  };
}

export function filmDoctorTool(): ToolDefinition {
  return {
    name: "film_doctor",
    description:
      "What this machine can make: the toolchain the production line needs (ffmpeg, uv, node, Chrome) and which optional media services are configured (voice engines: Azure Speech, Azure OpenAI or Foundry, OpenAI, ElevenLabs; Sora; Gemini for Veo, Lyria and images), with how to turn each on, and the exact `film` command that runs the production line's tools here. Reads only whether settings exist, never their values. Use before planning a piece that needs generated footage, music or narration.",
    inputSchema: z.object({
      library: z
        .string()
        .optional()
        .describe("Library folder; defaults to the current project folder"),
    }),
    async execute(input, ctx) {
      const { library } = input as { library?: string };
      ctx.emit({
        type: "tool_result",
        toolUseId: "",
        content: JSON.stringify(doctorReport(ctx.cwd, library)),
      });
    },
  };
}

export function filmInitTool(): ToolDefinition {
  return {
    name: "film_init",
    description:
      "Start a film library: writes a sample series with one short (a manifest and a motion board) that renders with no cloud services, using the machine's own voice when Azure Speech is not set up. Never overwrites a file that exists. Use when someone has no library yet or wants a working example to copy.",
    inputSchema: z.object({
      dir: z
        .string()
        .optional()
        .describe("Folder for the library; defaults to the current project folder"),
    }),
    async execute(input, ctx) {
      const { dir } = input as { dir?: string };
      const result = initLibrary(dir ? resolve(ctx.cwd, dir) : ctx.cwd);
      ctx.emit({
        type: "tool_result",
        toolUseId: "",
        content: JSON.stringify({
          ...result,
          sample: STARTER_PIECE,
          next: `run the film-cut workflow with arguments ${STARTER_PIECE}`,
        }),
      });
    },
  };
}

export function registerFilmTools(): readonly ToolDefinition[] {
  return [filmGuideTool(), filmStatusTool(), filmDoctorTool(), filmInitTool()];
}
