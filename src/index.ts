// The film rib: narrated short films made the way the narrated-video method
// works, a brief and a storyboard you approve, a cut the production line
// renders, notes turned into revisions, and a gated publish. The method and
// every tool reach the agent through rib tools, so any provider can drive it.

import type { Rib } from "@keelson/shared";
import { probeToolchain } from "./doctor.ts";

const rib: Rib = {
  id: "film",
  displayName: "Film",

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
