import { describe, expect, it, vi } from "vitest";

import type { GroupingContribution } from "./featureContribution";
import {
  applyTableFeatures,
  getAppliedFeatures,
  mergeFeaturePatches,
  type PatchFeature,
  rememberAppliedFeatures,
  resolveFeatureGrouping,
} from "./featurePatch";

function set(id: string, patch: Record<string, unknown>): PatchFeature {
  return { id, apply: () => patch };
}

describe("mergeFeaturePatches", () => {
  it("returns an empty patch for an empty list", () => {
    expect(mergeFeaturePatches([])).toEqual({});
  });

  it("merges in array order so a later feature wins", () => {
    expect(
      mergeFeaturePatches([
        set("a", { groupBy: "first", statusBar: true }),
        set("b", { groupBy: "second" }),
      ])
    ).toEqual({ groupBy: "second", statusBar: true });
  });

  it("skips a feature with no apply or an empty result", () => {
    const empty: PatchFeature = {
      id: "empty",
      apply: () => undefined as unknown as Record<string, unknown>,
    };
    expect(
      mergeFeaturePatches([{ id: "marker" }, empty, set("a", { x: 1 })])
    ).toEqual({ x: 1 });
  });

  it("drops undefined entries so they never erase an earlier value", () => {
    const merged = mergeFeaturePatches([
      set("a", { groupBy: "team" }),
      set("b", { groupBy: undefined, other: 2 }),
    ]);
    expect(merged).toEqual({ groupBy: "team", other: 2 });
    expect(Object.keys(merged)).toEqual(["groupBy", "other"]);
  });

  it("drops the phantom row marker", () => {
    const merged = mergeFeaturePatches([
      set("a", { __row: () => undefined, x: 1 }),
    ]);
    expect(merged).toEqual({ x: 1 });
    expect("__row" in merged).toBe(false);
  });

  it("hands each feature the patch the features before it produced", () => {
    const seen: object[] = [];
    const spy: PatchFeature = {
      id: "spy",
      apply(input) {
        seen.push({ ...input });
        return { y: 2 };
      },
    };
    mergeFeaturePatches([set("a", { x: 1 }), spy, spy]);
    expect(seen).toEqual([{ x: 1 }, { x: 1, y: 2 }]);
  });

  it("merges assembly one level deep, later keys winning", () => {
    const first = vi.fn();
    const second = vi.fn();
    const replaced = vi.fn();
    const merged = mergeFeaturePatches([
      set("a", { assembly: { first, shared: replaced } }),
      set("b", { assembly: { second, shared: second } }),
    ]);
    expect(merged.assembly).toEqual({ first, second, shared: second });
  });

  it("keeps an earlier assembly when a later feature brings none", () => {
    const first = vi.fn();
    const merged = mergeFeaturePatches([
      set("a", { assembly: { first } }),
      set("b", { x: 1 }),
    ]);
    expect(merged).toEqual({ assembly: { first }, x: 1 });
  });

  it("takes a later assembly as-is when none came before", () => {
    const second = vi.fn();
    expect(
      mergeFeaturePatches([
        set("a", { x: 1 }),
        set("b", { assembly: { second } }),
      ])
    ).toEqual({ x: 1, assembly: { second } });
  });

  it("replaces rather than deep-merges an assembly that is not an object", () => {
    const first = vi.fn();
    expect(
      mergeFeaturePatches([
        set("a", { assembly: { first } }),
        set("b", { assembly: "flat" }),
      ]).assembly
    ).toBe("flat");
    expect(
      mergeFeaturePatches([
        set("a", { assembly: "flat" }),
        set("b", { assembly: { first } }),
      ]).assembly
    ).toEqual({ first });
  });
});

describe("applyTableFeatures", () => {
  it("returns the same object when no features key is present", () => {
    const props = { columns: [] };
    expect(applyTableFeatures(props)).toBe(props);
    expect(getAppliedFeatures(props)).toBeUndefined();
  });

  it("is a no-op the second time on an object without features", () => {
    const props = { columns: [] };
    expect(applyTableFeatures(applyTableFeatures(props))).toBe(props);
  });

  it("strips an empty features array and remembers the list", () => {
    const list: PatchFeature[] = [];
    const resolved = applyTableFeatures({ features: list, extra: 1 });
    expect(resolved).toEqual({ extra: 1 });
    expect("features" in resolved).toBe(false);
    expect(getAppliedFeatures(resolved)).toBe(list);
    expect(applyTableFeatures(resolved)).toBe(resolved);
  });

  it("strips a features key that is not a list", () => {
    const resolved = applyTableFeatures({ features: undefined, extra: 1 });
    expect(resolved).toEqual({ extra: 1 });
    expect("features" in resolved).toBe(false);
    expect(getAppliedFeatures(resolved)).toEqual([]);
  });

  it("applies features onto the option surface, later features winning", () => {
    const resolved = applyTableFeatures({
      features: [
        set("a", { groupBy: "first" }),
        set("b", { groupBy: "second" }),
      ],
    });
    expect(resolved).toEqual({ groupBy: "second" });
    expect("features" in resolved).toBe(false);
  });

  it("lets a defined host option win over every feature", () => {
    expect(
      applyTableFeatures({
        features: [set("a", { groupBy: "from-feature" })],
        groupBy: "from-prop",
      })
    ).toEqual({ groupBy: "from-prop" });
  });

  it("does not let an undefined host option erase a feature's value", () => {
    expect(
      applyTableFeatures({
        features: [set("a", { groupBy: "team" })],
        groupBy: undefined,
      })
    ).toEqual({ groupBy: "team" });
  });

  it("lets a host assembly replace the features' assembly", () => {
    const fromFeature = vi.fn();
    const fromHost = vi.fn();
    expect(
      applyTableFeatures({
        features: [set("a", { assembly: { fromFeature } })],
        assembly: { fromHost },
      })
    ).toEqual({ assembly: { fromHost } });
  });

  it("remembers the list and is a no-op the second time", () => {
    const list = [set("a", { x: 1 })];
    const first = applyTableFeatures({ features: list });
    expect(getAppliedFeatures(first)).toBe(list);
    expect(applyTableFeatures(first)).toBe(first);
  });
});

describe("resolveFeatureGrouping", () => {
  const earlier: GroupingContribution<{ id: string }> = { entries: [] };
  const later: GroupingContribution<{ id: string }> = {
    entries: [],
    groupBy: ["team"],
  };

  it("lets a later feature win and skips a feature that contributes nothing", () => {
    expect(resolveFeatureGrouping(undefined, [earlier, undefined, later])).toBe(
      later
    );
  });

  it("lets a defined host contribution win over every feature", () => {
    expect(resolveFeatureGrouping(earlier, [later])).toBe(earlier);
  });

  it("does not let an undefined host contribution erase a feature", () => {
    expect(resolveFeatureGrouping(undefined, [earlier])).toBe(earlier);
  });
});

describe("rememberAppliedFeatures", () => {
  it("records a list on any object for getAppliedFeatures", () => {
    const target = {};
    const list = [set("a", {})];
    expect(getAppliedFeatures(target)).toBeUndefined();
    rememberAppliedFeatures(target, list);
    expect(getAppliedFeatures(target)).toBe(list);
  });
});
