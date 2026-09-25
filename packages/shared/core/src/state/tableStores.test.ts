import { afterEach, describe, expect, it, vi } from "vitest";

import { EMPTY_COLUMN_LAYOUT } from "../columns/columnLayoutModel";
import { resetDevWarnings } from "../utils/devWarn";
import {
  applyRowPin,
  groupsCollapsedToDepth,
  headerSelectionOf,
  idSetReader,
  initialColumnLayout,
  offersAllMatching,
  readStoredColumnLayout,
  rowPinSideOf,
  sameRowPins,
  sanitizeStoredLayout,
  toggleId,
  toggleIds,
  withColumnHidden,
  withColumnMoved,
  withColumnOrder,
  withColumnPinned,
  withColumnWidth,
} from "./tableStores";

afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

describe("id sets", () => {
  it("flips one id and every id as one", () => {
    expect([...toggleId(new Set(["a"]), "a")]).toEqual([]);
    expect([...toggleId(new Set(["a"]), "b")]).toEqual(["a", "b"]);
    expect([...toggleIds(new Set(["a"]), ["a", "b"])]).toEqual(["a", "b"]);
    expect([...toggleIds(new Set(["a", "b", "c"]), ["a", "b"])]).toEqual(["c"]);
    expect([...toggleIds(new Set(["a"]), [])]).toEqual(["a"]);
  });

  it("reads a controlled list as a set, keeping it while the list is the same array", () => {
    const read = idSetReader();
    const ids = ["a"];
    expect(read(undefined)).toBeUndefined();
    const set = read(ids);
    expect([...(set ?? [])]).toEqual(["a"]);
    expect(read(ids)).toBe(set);
    expect(read(["a"])).not.toBe(set);
  });

  it("gives the select-all control its tri-state", () => {
    expect(headerSelectionOf([], new Set())).toBe("none");
    expect(headerSelectionOf(["a", "b"], new Set(["a", "b"]))).toBe("all");
    expect(headerSelectionOf(["a", "b"], new Set(["b"]))).toBe("some");
    expect(headerSelectionOf(["a"], new Set(["z"]))).toBe("none");
  });

  it("offers all matching only past a fully selected page the source can reach beyond", () => {
    const page = {
      acrossPages: true,
      headerState: "all" as const,
      visibleIds: ["a"],
    };
    expect(offersAllMatching(page, 10)).toBe(true);
    expect(offersAllMatching(page, 1)).toBe(false);
    expect(offersAllMatching({ ...page, acrossPages: false }, 10)).toBe(false);
    expect(offersAllMatching({ ...page, headerState: "some" }, 10)).toBe(false);
  });

  it("collapses every group at a depth or deeper", () => {
    const groups = [
      { key: "a", level: 0 },
      { key: "a/b", level: 1 },
      { key: "a/b/c", level: 2 },
    ];
    expect([...groupsCollapsedToDepth(groups, 1)]).toEqual(["a/b", "a/b/c"]);
    expect([...groupsCollapsedToDepth(groups, 0)]).toHaveLength(3);
  });
});

describe("pinned rows", () => {
  it("pins to an edge, moves between edges, and unpins", () => {
    const top = applyRowPin({ top: [], bottom: ["1"] }, "1", "top");
    expect(top).toEqual({ top: ["1"], bottom: [] });
    expect(applyRowPin(top, "1", "top")).toEqual(top);
    expect(applyRowPin(top, "2", "bottom")).toEqual({
      top: ["1"],
      bottom: ["2"],
    });
    expect(applyRowPin(top, "1", undefined)).toEqual({ top: [], bottom: [] });
  });

  it("compares pin lists by order and names a row's edge", () => {
    const state = { top: ["1", "2"], bottom: ["9"] };
    expect(sameRowPins(state, { top: ["1", "2"], bottom: ["9"] })).toBe(true);
    expect(sameRowPins(state, { top: ["2", "1"], bottom: ["9"] })).toBe(false);
    expect(sameRowPins(state, { top: ["1"], bottom: ["9"] })).toBe(false);
    expect(rowPinSideOf(state, "2")).toBe("top");
    expect(rowPinSideOf(state, "9")).toBe("bottom");
    expect(rowPinSideOf(state, "5")).toBeUndefined();
  });
});

describe("column layout", () => {
  const layout = initialColumnLayout({ hidden: ["email"] });

  it("starts from the empty layout under a partial default", () => {
    expect(layout).toEqual({ ...EMPTY_COLUMN_LAYOUT, hidden: ["email"] });
    expect(initialColumnLayout(undefined)).toEqual(EMPTY_COLUMN_LAYOUT);
  });

  it("hides and shows a column, returning the same layout when nothing changes", () => {
    expect(withColumnHidden(layout, "email", true)).toBe(layout);
    expect(withColumnHidden(layout, "age", true).hidden).toEqual([
      "email",
      "age",
    ]);
    expect(withColumnHidden(layout, "email", false).hidden).toEqual([]);
  });

  it("pins, unpins and sizes a column", () => {
    const pinned = withColumnPinned(layout, "name", "start");
    expect(pinned.pinned).toEqual({ name: "start" });
    expect(withColumnPinned(pinned, "name", undefined).pinned).toEqual({});
    const sized = withColumnWidth(layout, "name", 120);
    expect(sized.widths).toEqual({ name: 120 });
    expect(withColumnWidth(sized, "name", undefined).widths).toEqual({});
  });

  it("moves a column, clamped, unless it goes nowhere or breaks a group", () => {
    const order = ["a", "b", "c"];
    expect(withColumnMoved(layout, order, "a", 9)?.order).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(withColumnMoved(layout, order, "c", -3)?.order).toEqual([
      "c",
      "a",
      "b",
    ]);
    expect(withColumnMoved(layout, order, "a", 0)).toBeUndefined();
    expect(withColumnMoved(layout, order, "z", 1)).toBeUndefined();
    expect(withColumnMoved(layout, order, "a", 1, () => false)).toBeUndefined();
  });

  it("takes a new order only when it is a permutation that keeps groups together", () => {
    const current = ["a", "b", "c"];
    expect(withColumnOrder(layout, current, ["c", "b", "a"])?.order).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(withColumnOrder(layout, current, ["a", "b"])).toBeUndefined();
    expect(withColumnOrder(layout, current, ["a", "a", "b"])).toBeUndefined();
    expect(withColumnOrder(layout, current, ["a", "b", "z"])).toBeUndefined();
    expect(
      withColumnOrder(layout, current, ["c", "b", "a"], () => false)
    ).toBeUndefined();
  });
});

describe("stored column layout", () => {
  const store = (raw: string | null) => ({
    getItem: () => raw,
    setItem: () => undefined,
    removeItem: () => undefined,
  });

  it("keeps only what it can trust from a stored layout", () => {
    expect(
      sanitizeStoredLayout({
        hidden: ["a", 3],
        order: "nope",
        pinned: { a: "start", b: "middle" },
        widths: { a: 120, b: -1, c: "wide", d: Number.POSITIVE_INFINITY },
        names: { a: " Alpha ", b: "  ", c: 7 },
      })
    ).toEqual({
      hidden: ["a"],
      order: [],
      pinned: { a: "start" },
      widths: { a: 120 },
      names: { a: "Alpha" },
    });
    expect(
      sanitizeStoredLayout({ hidden: [], pinned: [], widths: null })
    ).toEqual({ hidden: [], order: [], pinned: {}, widths: {} });
    expect(sanitizeStoredLayout([])).toBeNull();
  });

  it("reads a saved layout, and nothing when none is saved or it cannot be read", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(readStoredColumnLayout(store(null), "t")).toBeNull();
    expect(readStoredColumnLayout(undefined, "t")).toBeNull();
    expect(readStoredColumnLayout(store("{bad"), "t")).toBeNull();
    expect(
      readStoredColumnLayout(store('{"hidden":["a"]}'), "t")?.hidden
    ).toEqual(["a"]);
    expect(readStoredColumnLayout(store("[1]"), "t")).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('stored column layout under "t"')
    );
  });
});
