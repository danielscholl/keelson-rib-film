// The film rib: narrated short films made the way the narrated-video method
// works, a brief and a storyboard you approve, a cut the production line
// renders, notes turned into revisions, and a gated publish. The method and
// every tool reach the agent through rib tools, so any provider can drive it.

import type { Rib } from "@keelson/shared";
import { probeToolchain } from "./doctor.ts";
import { loadMethod, methodCorpus } from "./method.ts";
import { registerFilmTools } from "./tools.ts";

const rib: Rib = {
  id: "film",
  displayName: "Film",

  registerTools: () => registerFilmTools(),

  contributeDocs: () => {
    const pages = loadMethod();
    return pages.length === 0
      ? []
      : [
          {
            title: "Film method",
            summary:
              "How a narrated short is made: brief, angles, storyboard, sample, voice, motion, compose, review rounds and publish.",
            content: methodCorpus(pages),
          },
        ];
  },

  authStatus: async () => {
    const missing = probeToolchain().filter((t) => !t.found);
    return missing.length === 0
      ? { authenticated: true, statusMessage: "toolchain ready" }
      : {
          authenticated: false,
          statusMessage: `missing: ${missing.map((t) => `${t.name} (${t.hint})`).join(", ")}`,
        };
  },
};

export default rib;
