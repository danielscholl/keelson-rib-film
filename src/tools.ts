import type { ToolDefinition } from "@keelson/shared";
import { z } from "@keelson/shared";
import { loadMethod, METHOD_DIR, type MethodPage } from "./method.ts";

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

export function registerFilmTools(): readonly ToolDefinition[] {
  return [filmGuideTool()];
}
