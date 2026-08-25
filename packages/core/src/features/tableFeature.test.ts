import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import { feature, rowReorder, virtualize } from "./factories";
import { applyTableFeatures, type TableFeature } from "./tableFeature";

beforeEach(() => {
  resetDevWarnings();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("applyTableFeatures", () => {
  it("returns the same object when no features key is present", () => {
    const props = { onRowReorder: undefined, columns: [] };
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
    const onRowReorder = vi.fn();
    const resolved = applyTableFeatures({
      features: [rowReorder(onRowReorder)],
    });
    expect(resolved).toEqual({ onRowReorder });
  });

  it("lets a later feature win", () => {
    const first = vi.fn();
    const second = vi.fn();
    const resolved = applyTableFeatures({
      features: [rowReorder(first), rowReorder(second)],
    });
    expect(resolved).toEqual({ onRowReorder: second });
  });

  it("lets an explicit prop win over a feature", () => {
    const fromFeature = vi.fn();
    const fromProp = vi.fn();
    const resolved = applyTableFeatures({
      features: [rowReorder(fromFeature)],
      onRowReorder: fromProp,
    });
    expect(resolved).toEqual({ onRowReorder: fromProp });
  });

  it("does not let an undefined explicit prop overwrite a feature", () => {
    const onRowReorder = vi.fn();
    const resolved = applyTableFeatures({
      features: [rowReorder(onRowReorder)],
      onRowReorder: undefined,
    });
    expect(resolved).toEqual({ onRowReorder });
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
    const onRowReorder = vi.fn();
    const first = applyTableFeatures({ onRowReorder });
    applyTableFeatures(first);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("warns once when a deprecated enabling prop is set", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    applyTableFeatures({ onRowReorder: vi.fn() });
    applyTableFeatures({ onRowReorder: vi.fn() });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("onRowReorder");
    expect(warn.mock.calls[0]?.[0]).toContain("deprecated");
  });

  it("does not warn when only the features path is used", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
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
