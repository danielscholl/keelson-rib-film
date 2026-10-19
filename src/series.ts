import { z } from "@keelson/shared";

export const DEFAULT_HUMAN_FIRST_CUTS = 3;
export const DEFAULT_REVIEWER_MINUTES = 15;

const answeredBy = z.enum(["human", "reviewer"]);

export const seriesSchema = z
  .object({
    title: z.string().min(1).optional(),
    prefix: z.string().min(1).optional(),
    voice: z
      .union([
        z.string().min(1),
        z
          .object({
            engine: z.enum(["azure", "azure-openai", "openai", "elevenlabs", "system"]),
            name: z.string().min(1).optional(),
            model: z.string().min(1).optional(),
            instructions: z.string().min(1).optional(),
            settings: z.record(z.string(), z.unknown()).optional(),
          })
          .strict(),
      ])
      .optional(),
    bookends: z.object({ open: z.string().optional(), close: z.string().optional() }).optional(),
    gates: z
      .object({
        storyboard: answeredBy.optional(),
        sample: answeredBy.optional(),
        cut: z.union([answeredBy, z.object({ human_first: z.number().int().min(0) })]).optional(),
        reviewer_minutes: z.number().positive().optional(),
      })
      .optional(),
    publish: z
      .object({
        dir: z.string().min(1),
        file: z.string().min(1).optional(),
      })
      .optional(),
    ignore: z.array(z.string().min(1)).optional(),
    theme: z
      .object({ look: z.enum(["plain", "blueprint", "dark"]).optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type SeriesConfig = z.infer<typeof seriesSchema>;
export type GateKind = "storyboard" | "sample" | "cut" | "publish";
export type GateAnswer = z.infer<typeof answeredBy>;

export function parseSeries(text: string): { config: SeriesConfig; error?: string } {
  let raw: unknown;
  try {
    raw = Bun.YAML.parse(text) ?? {};
  } catch (e) {
    return { config: {}, error: `series.yaml is not valid YAML: ${(e as Error).message}` };
  }
  const parsed = seriesSchema.safeParse(raw);
  return parsed.success
    ? { config: parsed.data }
    : { config: {}, error: `series.yaml: ${parsed.error.issues.map((i) => i.message).join("; ")}` };
}

// Publishing always goes to a person: it is the step other people see.
export function decideGate(config: SeriesConfig, kind: GateKind, approvedCuts: number): GateAnswer {
  if (kind === "publish") return "human";
  const gates = config.gates ?? {};
  if (kind === "storyboard") return gates.storyboard ?? "human";
  if (kind === "sample") return gates.sample ?? "human";
  const cut = gates.cut ?? { human_first: DEFAULT_HUMAN_FIRST_CUTS };
  if (typeof cut === "string") return cut;
  return approvedCuts < cut.human_first ? "human" : "reviewer";
}

export function reviewerMinutes(config: SeriesConfig): number {
  return config.gates?.reviewer_minutes ?? DEFAULT_REVIEWER_MINUTES;
}
