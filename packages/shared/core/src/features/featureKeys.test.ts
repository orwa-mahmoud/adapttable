import { afterEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import {
  drawnSlotFills,
  featureSlotKey,
  featureStateKey,
  orderedContributions,
  slotFillsOf,
  slotRender,
} from "./featureKeys";

afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

describe("featureStateKey", () => {
  it("is the id it was declared with", () => {
    expect(featureStateKey<number>("row-reorder")).toEqual({
      id: "row-reorder",
    });
  });
});

describe("featureSlotKey", () => {
  it("marks a single slot and leaves a list slot unmarked", () => {
    expect(featureSlotKey("status-bar", { single: true })).toEqual({
      id: "status-bar",
      single: true,
    });
    expect(featureSlotKey("toolbar-extras")).toEqual({ id: "toolbar-extras" });
    expect(featureSlotKey("toolbar-extras", { single: false })).toEqual({
      id: "toolbar-extras",
    });
  });
});

describe("slotRender", () => {
  const slot = featureSlotKey<{ label: string }>("toolbar");
  const render = (props: { label: string }) => props.label;

  it("pairs a slot with its render", () => {
    expect(slotRender(slot, render)).toEqual({ slot, render });
  });

  it("carries orderAs only when given", () => {
    expect(slotRender(slot, render, { orderAs: "export" })).toEqual({
      slot,
      render,
      orderAs: "export",
    });
  });
});

describe("slotFillsOf", () => {
  const toolbar = featureSlotKey<{ label: string }>("toolbar");
  const footer = featureSlotKey<{ total: number }>("footer");

  it("groups fills by slot in feature-id order, whatever the array order", () => {
    const zeta = {
      id: "zeta",
      renders: [slotRender(toolbar, (p) => `z:${p.label}`)],
    };
    const alpha = {
      id: "alpha",
      renders: [
        slotRender(toolbar, (p) => `a:${p.label}`),
        slotRender(footer, (p) => `total:${p.total}`),
      ],
    };
    const fills = slotFillsOf([zeta, alpha, { id: "bare" }]);
    expect([...fills.keys()]).toEqual(["toolbar", "footer"]);
    expect(fills.get("toolbar")?.map((fill) => fill.id)).toEqual([
      "alpha",
      "zeta",
    ]);
    expect(fills.get("footer")?.map((fill) => fill.id)).toEqual(["alpha"]);
  });

  it("orders a fill by its orderAs rather than its feature id", () => {
    const fills = slotFillsOf([
      { id: "b-feature", renders: [slotRender(toolbar, () => "b")] },
      {
        id: "z-feature",
        renders: [slotRender(toolbar, () => "z", { orderAs: "a-first" })],
      },
    ]);
    expect(fills.get("toolbar")?.map((fill) => fill.id)).toEqual([
      "a-first",
      "b-feature",
    ]);
  });
});

describe("drawnSlotFills", () => {
  const fills = [
    { id: "a", render: () => "a" },
    { id: "b", render: () => "b" },
  ];

  it("draws only the first fill of a single slot", () => {
    expect(drawnSlotFills({ single: true }, fills)).toEqual([fills[0]]);
  });

  it("draws every fill of a list slot", () => {
    expect(drawnSlotFills({}, fills)).toBe(fills);
  });
});

describe("orderedContributions", () => {
  it("orders by id and skips features that contribute nothing", () => {
    const ordered = orderedContributions(
      [
        { id: "tree", value: 1 },
        { id: "grouping", value: 2 },
        { id: "bare", value: undefined },
      ],
      (feature) => feature.value,
      "provider"
    );
    expect(ordered.map(({ id, contribution }) => [id, contribution])).toEqual([
      ["grouping", 2],
      ["tree", 1],
    ]);
    expect(ordered[0]?.feature).toEqual({ id: "grouping", value: 2 });
  });

  it("keeps the last of two features sharing an id, and says so", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const ordered = orderedContributions(
      [
        { id: "dup", value: "first" },
        { id: "dup", value: "second" },
      ],
      (feature) => feature.value,
      "provider"
    );
    expect(ordered.map(({ contribution }) => contribution)).toEqual(["second"]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Two features share the id "dup" and both contribute a provider.'
      )
    );
  });
});
