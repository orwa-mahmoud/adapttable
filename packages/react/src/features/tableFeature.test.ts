import { resetDevWarnings } from "@adapttable/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { feature } from "./factories";
import { grouping } from "./grouping";
import { applyTableFeatures, type TableFeature } from "./tableFeature";
import { virtualize } from "./virtualize";

beforeEach(() => {
  resetDevWarnings();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("applyTableFeatures", () => {
  it("returns the same object when no features key is present", () => {
    const props = { groupBy: undefined, columns: [] };
    expect(applyTableFeatures(props)).toBe(props);
  });

  it("strips an empty features array", () => {
    const props = { features: [] as TableFeature[], extra: 1 };
    const resolved = applyTableFeatures(props);
    expect(resolved).toEqual({ extra: 1 });
    expect("features" in resolved).toBe(false);
  });

  it("strips a features key that is not a list", () => {
    const resolved = applyTableFeatures({
      features: undefined,
      extra: 1,
    });
    expect(resolved).toEqual({ extra: 1 });
    expect("features" in resolved).toBe(false);
  });

  it("applies a factory onto the prop surface", () => {
    const resolved = applyTableFeatures({ features: [grouping("team")] });
    expect(resolved).toEqual({ groupBy: "team" });
  });

  it("lets a later feature win", () => {
    const resolved = applyTableFeatures({
      features: [grouping("first"), grouping("second")],
    });
    expect(resolved).toEqual({ groupBy: "second" });
  });

  it("lets an explicit prop win over a feature", () => {
    const resolved = applyTableFeatures({
      features: [grouping("from-feature")],
      groupBy: "from-prop",
    });
    expect(resolved).toEqual({ groupBy: "from-prop" });
  });

  it("does not let an undefined explicit prop overwrite a feature", () => {
    const resolved = applyTableFeatures({
      features: [grouping("team")],
      groupBy: undefined,
    });
    expect(resolved).toEqual({ groupBy: "team" });
  });

  it("skips a feature that has no apply", () => {
    const resolved = applyTableFeatures({
      features: [{ id: "marker" }],
      searchable: true,
    });
    expect(resolved).toEqual({ searchable: true });
  });

  it("is a no-op the second time on the same object", () => {
    const first = applyTableFeatures({ features: [virtualize()] });
    const second = applyTableFeatures(first);
    expect(second).toBe(first);
  });

  /**
   * v3 removed the enabling props, and with them the warning that pointed at
   * their replacements. What is left is silence: nothing about a plain props
   * object is deprecated any more, so a table that composes features and one
   * that composes none both go through without a word.
   */
  it("says nothing about a props object it is handed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    applyTableFeatures({ searchable: true });
    applyTableFeatures({ features: [virtualize()] });
    expect(warn).not.toHaveBeenCalled();
  });

  it("composes an ad-hoc feature() patch", () => {
    const resolved = applyTableFeatures({
      features: [feature("audit", { statusBar: true })],
    });
    expect(resolved).toEqual({ statusBar: true });
  });
});
