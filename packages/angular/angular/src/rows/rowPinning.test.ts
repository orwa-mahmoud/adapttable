/**
 * Row pinning as a signal: pin, move and unpin; the pin entries for the
 * actions menu; a host that holds the lists; and nothing while disabled.
 */
import {
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  type RowPinState,
  UNPIN_ROW_ACTION_KEY,
} from "@adapttable/core";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { injectRowPinning, type RowPinningOptions } from "./rowPinning";

interface Row {
  id: string;
}

const LABELS = {
  pinToTop: "Pin to top",
  pinToBottom: "Pin to bottom",
  unpinRow: "Unpin row",
};

const pinningWith = (options: Partial<RowPinningOptions<Row>> = {}) =>
  TestBed.runInInjectionContext(() =>
    injectRowPinning<Row>({
      enabled: true,
      getRowId: (row) => row.id,
      labels: LABELS,
      ...options,
    })
  );

/** The keys of the actions a row is offered. */
const offered = (
  state: ReturnType<ReturnType<typeof pinningWith>>,
  id: string
) =>
  state.actions
    .filter((action) => action.isHidden?.({ id }) !== true)
    .map((action) => action.key);

describe("injectRowPinning", () => {
  it("pins to either edge, moves between them, and unpins", () => {
    const pinning = pinningWith();
    pinning().pin("a", "top");
    pinning().pin("b", "bottom");
    expect(pinning().state).toEqual({ top: ["a"], bottom: ["b"] });
    expect(pinning().sideOf("a")).toBe("top");
    pinning().pin("a", "bottom");
    expect(pinning().state).toEqual({ top: [], bottom: ["b", "a"] });
    pinning().unpin("b");
    expect(pinning().state).toEqual({ top: [], bottom: ["a"] });
    expect(pinning().sideOf("b")).toBeUndefined();
  });

  it("offers each row the pins it does not have", () => {
    const pinning = pinningWith();
    expect(offered(pinning(), "a")).toEqual([
      PIN_TOP_ACTION_KEY,
      PIN_BOTTOM_ACTION_KEY,
    ]);
    pinning().pin("a", "top");
    expect(offered(pinning(), "a")).toEqual([
      PIN_BOTTOM_ACTION_KEY,
      UNPIN_ROW_ACTION_KEY,
    ]);
    pinning()
      .actions.find((action) => action.key === UNPIN_ROW_ACTION_KEY)
      ?.onClick?.({ id: "a" });
    expect(pinning().sideOf("a")).toBeUndefined();
  });

  it("asks the host that holds the lists, and follows its answer", () => {
    const pinnedRowIds = signal<RowPinState>({ top: ["a"], bottom: [] });
    const onPinnedRowIdsChange = vi.fn();
    const pinning = pinningWith({ pinnedRowIds, onPinnedRowIdsChange });
    expect(pinning().sideOf("a")).toBe("top");
    pinning().pin("b", "top");
    expect(onPinnedRowIdsChange).toHaveBeenCalledWith({
      top: ["a", "b"],
      bottom: [],
    });
    expect(pinning().sideOf("b")).toBeUndefined();
    pinnedRowIds.set({ top: ["a", "b"], bottom: [] });
    expect(pinning().sideOf("b")).toBe("top");
  });

  it("does nothing, and offers nothing, while disabled", () => {
    const enabled = signal(false);
    const pinning = pinningWith({ enabled });
    pinning().pin("a", "top");
    expect(pinning().sideOf("a")).toBeUndefined();
    expect(pinning().actions).toEqual([]);
    enabled.set(true);
    pinning().pin("a", "top");
    expect(pinning().sideOf("a")).toBe("top");
  });
});
