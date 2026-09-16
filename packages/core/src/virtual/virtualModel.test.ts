/**
 * The pure half of virtualization — the part the base table graph may import,
 * because it names no virtualizer at all. Two things have to hold: an index
 * used for ARIA and focus must be the DATASET index rather than the window's,
 * and a card list must become its own scroll element or the virtualizer has
 * nothing to track and quietly mounts every card.
 */
import { describe, expect, it, vi } from "vitest";

import { bindMobileCardList, mobileCardListStyle } from "./mobileCardList";
import {
  resolveVirtualRows,
  rowSourceIndex,
  virtualColumnSpan,
  windowGroupedEntries,
} from "./virtualTableModel";

interface Row {
  id: string;
}

const ROWS: Row[] = [{ id: "r1" }, { id: "r2" }];
const rowKey = (row: Row) => row.id;

describe("rowSourceIndex", () => {
  it("is the window index until pinning pulls rows out of it", () => {
    expect(rowSourceIndex({ index: 3 })).toBe(3);
    expect(rowSourceIndex({ index: 0, sourceIndex: 7 })).toBe(7);
  });
});

describe("resolveVirtualRows", () => {
  it("materializes every source row when virtualization is off", () => {
    expect(resolveVirtualRows(ROWS, rowKey)).toEqual([
      { row: ROWS[0], index: 0, key: "r1" },
      { row: ROWS[1], index: 1, key: "r2" },
    ]);
  });

  it("keeps the virtualizer's own entries when it produced a window", () => {
    const entries = [{ row: ROWS[1]!, index: 5, key: "r2" }];
    expect(resolveVirtualRows(ROWS, rowKey, entries)).toBe(entries);
  });
});

describe("virtualColumnSpan", () => {
  it("counts the chrome columns a spacer has to cross", () => {
    expect(virtualColumnSpan(4, false, false)).toBe(4);
    expect(virtualColumnSpan(4, true, true)).toBe(6);
    expect(virtualColumnSpan(4, true, true, true, true)).toBe(8);
  });
});

describe("windowGroupedEntries", () => {
  const entries = ["a", "b", "c"];

  it("returns the same list when the window covers all of it", () => {
    expect(windowGroupedEntries(entries, [0, 1, 2])).toBe(entries);
  });

  it("slices to the window, dropping an index past the end", () => {
    expect(windowGroupedEntries(entries, [2, 0])).toEqual(["c", "a"]);
    expect(windowGroupedEntries(entries, [9, 1])).toEqual(["b"]);
  });
});

describe("mobileCardListStyle", () => {
  it("leaves the page as the scroller when no height is capped", () => {
    expect(mobileCardListStyle(undefined)).toBeUndefined();
  });

  it("clips the list so it becomes the scroll element", () => {
    expect(mobileCardListStyle(400)).toEqual({
      maxHeight: 400,
      overflowY: "auto",
    });
  });
});

describe("bindMobileCardList", () => {
  const node = { nodeType: 1 } as unknown as HTMLElement;

  it("hands the node to the virtualizer", () => {
    const virtualScrollRef = vi.fn();
    bindMobileCardList(virtualScrollRef)(node);
    expect(virtualScrollRef).toHaveBeenCalledWith(node);
  });

  it("composes a kit's own callback ref onto the same element", () => {
    const virtualScrollRef = vi.fn();
    const extra = vi.fn();
    bindMobileCardList(virtualScrollRef, extra)(node);
    expect(extra).toHaveBeenCalledWith(node);
  });

  it("composes a kit's object ref onto the same element", () => {
    const extra = { current: null as HTMLElement | null };
    bindMobileCardList(undefined, extra)(node);
    expect(extra.current).toBe(node);
  });

  it("survives a list that is neither virtualized nor kit-tracked", () => {
    expect(() => bindMobileCardList(undefined)(node)).not.toThrow();
    expect(() => bindMobileCardList(undefined, null)(node)).not.toThrow();
  });
});
