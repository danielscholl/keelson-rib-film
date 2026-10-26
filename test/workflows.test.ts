import { describe, expect, test } from "bun:test";
import rib from "../src/index.ts";
import { filmCommand, filmCutWorkflow, filmPublishWorkflow } from "../src/workflows.ts";

type Node = {
  id: string;
  depends_on?: string[];
  when?: string;
  bash?: string;
  approval?: { message: string; reviewer?: { when?: string; allowed_tools?: string[] } };
};

const nodesOf = (w: { definition: unknown }) => (w.definition as { nodes: Node[] }).nodes;

test("both workflows opt out of the sandbox", () => {
  for (const w of [filmCutWorkflow("FILM"), filmPublishWorkflow("FILM")]) {
    expect((w.definition as { sandbox?: { enabled?: boolean } }).sandbox).toEqual({
      enabled: false,
    });
  }
});

describe("film-cut", () => {
  const nodes = nodesOf(filmCutWorkflow("FILM"));
  const ids = new Set(nodes.map((n) => n.id));

  test("every dependency and output reference names a node in the workflow", () => {
    expect(nodes.length).toBeGreaterThan(0);
    for (const n of nodes) {
      for (const d of n.depends_on ?? []) expect(ids.has(d)).toBe(true);
      const text = [n.when, n.bash, n.approval?.message, n.approval?.reviewer?.when].join(" ");
      for (const m of text.matchAll(/\$([a-z][\w-]*)\.output/g)) expect(ids.has(m[1]!)).toBe(true);
    }
  });

  test("the reviewer answers only when the series policy says so, with the tools it needs", () => {
    const gate = nodes.find((n) => n.approval)!;
    expect(gate.approval!.reviewer!.when).toBe("$resolve.output.gate == 'reviewer'");
    expect(gate.approval!.reviewer!.allowed_tools).toContain("film_guide");
  });

  test("bash steps never rely on output substitution, and piped steps keep their exit code", () => {
    for (const n of nodes) {
      if (!n.bash) continue;
      expect(n.bash).not.toMatch(/\$[a-z][\w-]*\.output/);
      if (n.bash.includes("| tail")) expect(n.bash).toContain("pipefail");
    }
  });

  test("the plate renders only for a piece that has one", () => {
    expect(nodes.find((n) => n.id === "plate")!.when).toBe("$resolve.output.plate == 'true'");
  });

  test("steps run the film command with the bun that runs Keelson", () => {
    expect(filmCommand("/opt/bun", "/rib/bin/film.ts")).toBe('"/opt/bun" "/rib/bin/film.ts"');
    expect(nodes.find((n) => n.id === "compose")!.bash).toContain(
      'FILM compose "$KEELSON_ARGUMENTS"',
    );
  });

  test("workflow descriptions follow the Use when / Triggers / Does / NOT for shape", () => {
    for (const w of rib.contributeWorkflows?.({} as never) ?? []) {
      const d = (w.definition as { description: string }).description;
      expect(d).toMatch(/^Use when: .+ Triggers: .+ Does: .+ NOT for: .+/);
    }
  });
});

describe("film-publish", () => {
  const nodes = nodesOf(filmPublishWorkflow("FILM"));

  test("bash steps never rely on output substitution", () => {
    for (const n of nodes) if (n.bash) expect(n.bash).not.toMatch(/\$[a-z][\w-]*\.output/);
  });

  test("the publish gate always goes to a person", () => {
    const gate = nodes.find((n) => n.approval)!;
    expect(gate.approval!.reviewer).toBeUndefined();
  });

  test("publishing waits on the gate", () => {
    expect(nodes.find((n) => n.id === "publish")!.depends_on).toEqual(["gate"]);
  });
});
