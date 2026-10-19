export interface ToolProbe {
  name: string;
  found: boolean;
  hint: string;
}

const REQUIRED: readonly { name: string; hint: string }[] = [
  { name: "ffmpeg", hint: "brew install ffmpeg" },
  { name: "ffprobe", hint: "ships with ffmpeg" },
  { name: "uv", hint: "brew install uv" },
];

export function probeToolchain(which: (bin: string) => string | null = Bun.which): ToolProbe[] {
  return REQUIRED.map(({ name, hint }) => ({ name, hint, found: which(name) !== null }));
}
