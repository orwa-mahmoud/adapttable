import { describe, expect, it, vi } from "vitest";

import {
  discover,
  type DiscoverySource,
  familyOf,
  MAX_FAMILY_GUIDES,
} from "./discovery";
import type { CapabilityFamily, CapabilityGuide } from "./types";

function guide(key: string): CapabilityGuide {
  return {
    schemaVersion: "adapttable.agent.v1",
    key,
    guide: `How to ${key}.`,
    input: { type: "object", properties: {} },
  } as unknown as CapabilityGuide;
}

function source(
  available: readonly string[],
  families: Readonly<Record<string, CapabilityFamily>> = {}
): DiscoverySource {
  return {
    available: () => available,
    describe: (key) => {
      if (!available.includes(key)) {
        throw new Error(`capability "${key}" is not wired on this table`);
      }
      return guide(key);
    },
    family: (key) => families[key] ?? familyOf(key),
  };
}

const WIRED = [
  "view.setPage",
  "view.setSort",
  "view.setFilters",
  "edit.cells",
  "rows.resolve",
  "rows.read",
  "view.setGroupBy",
  "view.setAggregations",
];

describe("answering several keys at once", () => {
  it("answers three keys in one round", () => {
    const answered = discover(
      { keys: ["view.setPage", "view.setSort", "view.setFilters"] },
      source(WIRED)
    );

    // One response, not one per key — which is the whole point.
    expect(answered.guides).toHaveLength(3);
    expect(answered.fulfilled).toEqual([
      "view.setPage",
      "view.setSort",
      "view.setFilters",
    ]);
    expect(answered.unavailable).toEqual([]);
  });

  it("names a key this table cannot offer without saying why", () => {
    const answered = discover(
      { keys: ["view.setPage", "rows.delete"] },
      source(WIRED)
    );

    expect(answered.fulfilled).toEqual(["view.setPage"]);
    expect(answered.unavailable).toEqual(["rows.delete"]);
  });

  it("treats an unknown name as unavailable rather than throwing", () => {
    const answered = discover({ keys: ["not.a.capability"] }, source(WIRED));

    expect(answered.unavailable).toEqual(["not.a.capability"]);
    expect(answered.guides).toEqual([]);
  });
});

describe("a family", () => {
  it("brings the guidance a call cannot be formed without", () => {
    const answered = discover({ keys: ["edit.cells"] }, source(WIRED));

    // Editing a cell needs the addressing rules; discovering that in a second
    // round is a second model invocation to answer one question.
    expect(answered.fulfilled).toEqual(["edit.cells", "rows.resolve"]);
  });

  it("expands a bundle into the members this table actually offers", () => {
    const answered = discover({ bundle: "grouping" }, source(WIRED));

    expect(answered.fulfilled).toContain("view.setGroupBy");
    expect(answered.fulfilled).toContain("view.setAggregations");
    expect(answered.fulfilled).not.toContain("edit.cells");
  });

  it("gives a bundle only what a narrower table wires", () => {
    const answered = discover(
      { bundle: "editing" },
      source(["edit.cells", "rows.resolve"])
    );

    expect(answered.fulfilled).toEqual(["edit.cells", "rows.resolve"]);
  });

  it("puts what was asked for before what it dragged in", () => {
    const answered = discover(
      { keys: ["view.setAggregations", "edit.cells"] },
      source(WIRED)
    );

    // A budget that cuts the tail cuts the supporting reading, not the thing
    // the model asked about.
    expect(answered.fulfilled.slice(0, 2)).toEqual([
      "view.setAggregations",
      "edit.cells",
    ]);
  });

  it("cannot resurrect a capability the agent may not use", () => {
    // The table wires editing but the host excluded the addressing key.
    const answered = discover({ bundle: "editing" }, source(["edit.cells"]));

    expect(answered.fulfilled).toEqual(["edit.cells"]);
    expect(answered.unavailable).toEqual(["rows.resolve"]);
  });

  it("lets a custom capability declare its own related guidance", () => {
    const answered = discover(
      { keys: ["custom.settle"] },
      source(["custom.settle", "rows.resolve"], {
        "custom.settle": { family: "custom", dependsOn: ["rows.resolve"] },
      })
    );

    expect(answered.fulfilled).toEqual(["custom.settle", "rows.resolve"]);
  });

  it("stops on a cycle instead of recursing", () => {
    const answered = discover(
      { keys: ["a"] },
      source(["a", "b"], {
        a: { dependsOn: ["b"] },
        b: { dependsOn: ["a"] },
      })
    );

    expect(answered.fulfilled).toEqual(["a", "b"]);
  });

  it("names nothing twice", () => {
    const answered = discover(
      { keys: ["edit.cells", "rows.resolve"] },
      source(WIRED)
    );

    expect(answered.fulfilled).toEqual(["edit.cells", "rows.resolve"]);
  });
});

describe("bounding a round", () => {
  it("defers past the ceiling and names what it deferred", () => {
    const keys = Array.from({ length: 12 }, (_, index) => `k${String(index)}`);
    const answered = discover({ keys }, source(keys), 3);

    expect(answered.guides).toHaveLength(3);
    expect(answered.deferred).toHaveLength(9);
    // Named, so the backend can ask rather than discovering it called
    // something it was never shown how to call.
    expect(answered.deferred[0]).toBe("k3");
  });

  it("ships a ceiling a family cannot blow past", () => {
    expect(MAX_FAMILY_GUIDES).toBe(8);
  });

  it("describes only what it answers", () => {
    const keys = Array.from({ length: 6 }, (_, index) => `k${String(index)}`);
    const live = source(keys);
    const describe = vi.spyOn(live, "describe");
    discover({ keys }, live, 2);

    expect(describe).toHaveBeenCalledTimes(2);
  });
});

describe("what a capability belongs with", () => {
  it("uses the host's own declaration over the built-in one", () => {
    expect(familyOf("edit.cells", { family: "mine" }).family).toBe("mine");
    expect(familyOf("edit.cells").family).toBe("editing");
  });

  it("answers empty for a capability nobody placed", () => {
    expect(familyOf("custom.thing")).toEqual({});
  });
});
