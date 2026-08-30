import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import { feature, grouping, virtualize } from "./factories";
import { applyTableFeatures, type TableFeature } from "./tableFeature";

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
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = applyTableFeatures({ groupBy: "team" });
    applyTableFeatures(first);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("warns once when a deprecated enabling prop is set", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    applyTableFeatures({ groupBy: "team" });
    applyTableFeatures({ groupBy: "other" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("groupBy");
    expect(warn.mock.calls[0]?.[0]).toContain("deprecated");
  });

  it("does not warn when only the features path is used", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    applyTableFeatures({ features: [virtualize()] });
    expect(warn).not.toHaveBeenCalled();
  });

  // A feature's companion options go away with the feature, so a migration
  // that removes only the headline prop is still broken at v3. Each of these
  // warns on its own rather than only alongside its sibling.
  it.each([
    ["cellSpanAppearance", { cellSpanAppearance: "muted" }],
    ["defaultExpandedRowIds", { defaultExpandedRowIds: ["a"] }],
    ["treeColumn", { treeColumn: "name" }],
    ["onLoadChildren", { onLoadChildren: () => undefined }],
    ["printButton", { printButton: true }],
  ])("warns for the companion prop %s on its own", (name, props) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    applyTableFeatures({ ...props });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain(name);
  });

  it("composes an ad-hoc feature() patch", () => {
    const resolved = applyTableFeatures({
      features: [feature("audit", { statusBar: true })],
    });
    expect(resolved).toEqual({ statusBar: true });
  });
});
