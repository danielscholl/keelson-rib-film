import { existsSync, readFileSync } from "node:fs";

export interface ToolProbe {
  name: string;
  found: boolean;
  hint: string;
}

const REQUIRED: readonly { name: string; hint: string }[] = [
  { name: "ffmpeg", hint: "brew install ffmpeg" },
  { name: "ffprobe", hint: "ships with ffmpeg" },
  { name: "uv", hint: "brew install uv" },
  { name: "node", hint: "brew install node" },
];

// Playwright launches the installed Google Chrome (channel "chrome"), not a downloaded Chromium.
const CHROME_PATHS: Record<string, readonly string[]> = {
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
  linux: ["/opt/google/chrome/chrome", "/usr/bin/google-chrome"],
  win32: ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"],
};

export function probeToolchain(
  which: (bin: string) => string | null = Bun.which,
  exists: (path: string) => boolean = existsSync,
  platform: string = process.platform,
): ToolProbe[] {
  const bins = REQUIRED.map(({ name, hint }) => ({ name, hint, found: which(name) !== null }));
  const chrome = (CHROME_PATHS[platform] ?? []).some(exists);
  return [
    ...bins,
    { name: "Google Chrome", hint: "install from google.com/chrome", found: chrome },
  ];
}

export interface ServiceProbe {
  service: string;
  tools: string;
  on: boolean;
  how: string;
}

// Which variables are set, from the environment and the library's env file. Only names are kept.
export function configuredNames(
  env: Record<string, string | undefined> = process.env,
  envFile?: string,
  read: (path: string) => string | null = (p) => {
    try {
      return readFileSync(p, "utf8");
    } catch {
      return null;
    }
  },
): Set<string> {
  const names = new Set(Object.keys(env).filter((k) => (env[k] ?? "") !== ""));
  const text = envFile ? read(envFile) : null;
  for (const line of text?.split("\n") ?? []) {
    const [k, ...rest] = line.trim().split("=");
    if (k && !k.startsWith("#") && rest.join("=").length > 0) names.add(k);
  }
  return names;
}

export function probeServices(names: Set<string>, hasAz: boolean): ServiceProbe[] {
  const azureResource =
    hasAz &&
    names.has("AZURE_AI_RESOURCE") &&
    names.has("AZURE_AI_GROUP") &&
    names.has("AZURE_SUBSCRIPTION_ID");
  const azureHow =
    "set AZURE_AI_RESOURCE, AZURE_AI_GROUP and AZURE_SUBSCRIPTION_ID (and sign in with az), or";
  return [
    {
      service: "Azure Speech",
      tools: "tts (narration and word timing)",
      on: names.has("AZURE_SPEECH_KEY") || azureResource,
      how: `${azureHow} AZURE_SPEECH_KEY`,
    },
    {
      service: "Sora (Azure OpenAI)",
      tools: "sora (generated clips)",
      on: names.has("AZURE_OPENAI_KEY") || azureResource,
      how: `${azureHow} AZURE_OPENAI_KEY`,
    },
    {
      service: "Gemini",
      tools: "veo (clips), lyria (music), gimg (images)",
      on: names.has("GEMINI_API_KEY"),
      how: "set GEMINI_API_KEY",
    },
  ];
}
