/**
 * The row-pinning feature and its live state: the lists in the URL unless
 * the host holds them, and refused while grouping or a tree is armed.
 */
import {
  createMemoryAdapter,
  resolveLabels,
  type RowPinState,
} from "@adapttable/core";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { featureOptionsOf } from "../featureHost";
import {
  injectTableRowPinning,
  rowPinning,
  type TableRowPinningOptions,
} from "./rowPinning";

interface Row {
  id: string;
}

function liveWith(options: Partial<TableRowPinningOptions<Row>> = {}) {
  const urlAdapter = createMemoryAdapter();
  const blocked = signal(false);
  const pinning = TestBed.runInInjectionContext(() =>
    injectTableRowPinning<Row>({
      features: [rowPinning()],
      getRowId: (row) => row.id,
      labels: signal(resolveLabels(undefined)),
      blocked,
      urlAdapter,
      ...options,
    })
  );
  return { pinning, urlAdapter, blocked };
}

describe("rowPinning()", () => {
  it("arms pinning, and carries the host's lists", () => {
    expect(featureOptionsOf([rowPinning()])).toEqual({
      rowPinningArmed: true,
    });
    const pinnedRowIds = { top: ["a"], bottom: [] };
    expect(featureOptionsOf([rowPinning({ pinnedRowIds })])).toEqual({
      rowPinningArmed: true,
      pinnedRowIds,
    });
  });
});

describe("injectTableRowPinning", () => {
  it("is absent while pinning is not composed", () => {
    expect(
      TestBed.runInInjectionContext(() =>
        injectTableRowPinning<Row>({
          features: [],
          getRowId: (row) => row.id,
          labels: signal(resolveLabels(undefined)),
          blocked: signal(false),
        })
      )
    ).toBeUndefined();
  });

  it("keeps the table's own lists in the URL", () => {
    const { pinning, urlAdapter } = liveWith();
    pinning!()!.pin("a", "top");
    expect(urlAdapter.getSearch()).toContain("rowPin");
    expect(pinning!()!.sideOf("a")).toBe("top");
  });

  it("leaves the URL alone when the host holds the lists, and tells the host", () => {
    const onPinnedRowIdsChange = vi.fn();
    const pinnedRowIds: RowPinState = { top: [], bottom: [] };
    const { pinning, urlAdapter } = liveWith({
      features: [rowPinning({ pinnedRowIds, onPinnedRowIdsChange })],
    });
    pinning!()!.pin("a", "bottom");
    expect(onPinnedRowIdsChange).toHaveBeenCalledWith({
      top: [],
      bottom: ["a"],
    });
    expect(urlAdapter.getSearch()).not.toContain("rowPin");
    expect(pinning!()!.sideOf("a")).toBeUndefined();
  });

  it("follows the host's signal without writing its lists to the URL", () => {
    const pinnedRowIds = signal<RowPinState>({ top: ["a"], bottom: [] });
    const onPinnedRowIdsChange = vi.fn((next: RowPinState) => {
      pinnedRowIds.set(next);
    });
    const { pinning, urlAdapter } = liveWith({
      features: [rowPinning({ pinnedRowIds, onPinnedRowIdsChange })],
    });
    expect(pinning!()!.state).toEqual({ top: ["a"], bottom: [] });
    pinning!()!.pin("b", "bottom");
    expect(onPinnedRowIdsChange).toHaveBeenLastCalledWith({
      top: ["a"],
      bottom: ["b"],
    });
    expect(pinning!()!.state).toEqual({ top: ["a"], bottom: ["b"] });

    pinnedRowIds.set({ top: ["c"], bottom: ["a"] });
    expect(pinning!()!.sideOf("b")).toBeUndefined();
    expect(pinning!()!.sideOf("c")).toBe("top");
    pinning!()!.unpin("a");
    expect(onPinnedRowIdsChange).toHaveBeenLastCalledWith({
      top: ["c"],
      bottom: [],
    });
    expect(pinning!()!.state).toEqual({ top: ["c"], bottom: [] });

    pinnedRowIds.set({ top: [], bottom: [] });
    expect(pinning!()!.state).toEqual({ top: [], bottom: [] });
    expect(onPinnedRowIdsChange).toHaveBeenCalledTimes(2);
    expect(urlAdapter.getSearch()).toBe("");
  });

  it("keeps an uncontrolled table's lists local when URL sync is off", () => {
    const { pinning, urlAdapter } = liveWith({ urlSync: false });
    pinning!()!.pin("a", "top");
    expect(pinning!()!.state).toEqual({ top: ["a"], bottom: [] });
    expect(urlAdapter.getSearch()).toBe("");
  });

  it("observes a table's own lists without holding them", () => {
    const onPinnedRowIdsChange = vi.fn();
    const { pinning } = liveWith({
      features: [rowPinning({ onPinnedRowIdsChange })],
    });
    pinning!()!.pin("a", "top");
    expect(onPinnedRowIdsChange).toHaveBeenCalledWith({
      top: ["a"],
      bottom: [],
    });
    expect(pinning!()!.sideOf("a")).toBe("top");
  });

  it("is refused while grouping or a tree is armed, and says so", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { pinning, blocked } = liveWith();
    blocked.set(true);
    TestBed.tick();
    expect(pinning!()).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("row pinning is ignored")
    );
  });
});
