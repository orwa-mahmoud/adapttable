/**
 * The cells a live patch changed: marked for a moment, carried as an
 * attribute, read reactively, and never lit for a reader who asked for
 * reduced motion.
 */
import { CHANGED_CELL_FLASH_MS, type RowPatchEvent } from "@adapttable/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, effectScope, nextTick, shallowRef } from "vue";

import { useChangedCellFlash } from "../src/stream";

interface Row {
  id: string;
  name: string;
  budget: number;
}

const UPDATE: RowPatchEvent<Row> = {
  type: "update",
  id: "7",
  prev: { id: "7", name: "Ada", budget: 10 },
  next: { id: "7", name: "Ada", budget: 12 },
  index: 0,
};

let reducedMotion = false;
let notify: (() => void) | undefined;

beforeEach(() => {
  reducedMotion = false;
  notify = undefined;
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query.includes("reduce") && reducedMotion;
    },
    addEventListener: (_type: string, listener: () => void) => {
      notify = listener;
    },
    removeEventListener: () => {
      notify = undefined;
    },
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useChangedCellFlash", () => {
  it("marks the cell a patch changed, as an attribute, until it fades", () => {
    const scope = effectScope();
    const flash = scope.run(() => useChangedCellFlash({ enabled: true }))!;
    const attrs = scope.run(() =>
      computed(() => flash.flashProps("7", "budget"))
    )!;
    expect(attrs.value).toEqual({});
    flash.mark([UPDATE]);
    expect(flash.isFlashing("7", "budget")).toBe(true);
    expect(flash.isFlashing("7", "name")).toBe(false);
    expect(flash.isRowFlashing("7")).toBe(true);
    expect(attrs.value).toEqual({ "data-flash": "" });
    vi.advanceTimersByTime(CHANGED_CELL_FLASH_MS);
    expect(attrs.value).toEqual({});
    scope.stop();
  });

  it("is off by default", () => {
    const scope = effectScope();
    const flash = scope.run(() => useChangedCellFlash())!;
    flash.mark([UPDATE]);
    expect(flash.isFlashing("7", "budget")).toBe(false);
    scope.stop();
  });

  it("lights nothing for a reader who asks for reduced motion", async () => {
    const scope = effectScope();
    const flash = scope.run(() => useChangedCellFlash({ enabled: true }))!;
    flash.mark([UPDATE]);
    expect(flash.isFlashing("7", "budget")).toBe(true);
    reducedMotion = true;
    notify?.();
    await nextTick();
    expect(flash.isFlashing("7", "budget")).toBe(false);
    flash.mark([UPDATE]);
    expect(flash.isFlashing("7", "budget")).toBe(false);
    scope.stop();
    expect(notify).toBeUndefined();
  });

  it("drops what is lit when it is turned off", () => {
    const enabled = shallowRef(true);
    const scope = effectScope();
    const flash = scope.run(() =>
      useChangedCellFlash(() => ({ enabled: enabled.value }))
    )!;
    flash.mark([UPDATE]);
    expect(flash.isFlashing("7", "budget")).toBe(true);
    enabled.value = false;
    expect(flash.isFlashing("7", "budget")).toBe(false);
    enabled.value = true;
    expect(flash.isFlashing("7", "budget")).toBe(false);
    scope.stop();
  });

  it("holds a mark for durationMs", () => {
    const scope = effectScope();
    const flash = scope.run(() =>
      useChangedCellFlash({ enabled: true, durationMs: 300 })
    )!;
    flash.mark([UPDATE]);
    vi.advanceTimersByTime(299);
    expect(flash.isFlashing("7", "budget")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(flash.isFlashing("7", "budget")).toBe(false);
    scope.stop();
  });

  it("must run inside a scope", () => {
    expect(() => useChangedCellFlash()).toThrow(/useChangedCellFlash/);
  });
});
