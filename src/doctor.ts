import { existsSync } from "node:fs";

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
