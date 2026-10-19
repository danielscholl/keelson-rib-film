import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const TOOLS_DIR = new URL("../tools", import.meta.url).pathname;

const RUNNABLE = [".py", ".mjs", ".js", ".sh"] as const;
const LIBRARY_MODULES = new Set(["filmlib.py", "cursor.js", "theme.mjs", "voices.py"]);

export interface ToolInfo {
  name: string;
  file: string;
  summary: string;
}

export function listTools(dir: string = TOOLS_DIR): ToolInfo[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => RUNNABLE.some((ext) => f.endsWith(ext)) && !LIBRARY_MODULES.has(f))
    .sort()
    .map((f) => ({
      name: f.replace(/\.(py|mjs|js|sh)$/, ""),
      file: join(dir, f),
      summary: summaryOf(join(dir, f)),
    }));
}

function summaryOf(path: string): string {
  const lines = readFileSync(path, "utf8").split("\n").slice(0, 12);
  for (const raw of lines) {
    const line = raw
      .replace(/^#!.*$/, "")
      .replace(/^\s*(#|\/\/|"""|\*)\s?/, "")
      .replace(/"""\s*$/, "")
      .trim();
    if (line.length > 0 && !line.startsWith("Usage")) return line;
  }
  return "";
}

// The argv that runs a tool: Python under the rib's uv project, Node modules with node, scripts with bash.
export function commandFor(
  tool: ToolInfo,
  args: readonly string[],
  dir: string = TOOLS_DIR,
): string[] {
  if (tool.file.endsWith(".py")) {
    return ["uv", "run", "--quiet", "--project", dir, "python", tool.file, ...args];
  }
  if (tool.file.endsWith(".sh")) return ["bash", tool.file, ...args];
  return ["node", tool.file, ...args];
}
