/**
 * The cells a live patch changed: marked for a moment, carried as an
 * attribute, and never lit for a reader who asked for reduced motion.
 */
import { CHANGED_CELL_FLASH_MS, type RowPatchEvent } from "@adapttable/core";
import {
  computed,
  createEnvironmentInjector,
  EnvironmentInjector,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { injectChangedCellFlash } from "./changedCellFlash";

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

beforeEach(() => {
  reducedMotion = false;
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce") && reducedMotion,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function scope() {
  return createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
}

describe("injectChangedCellFlash", () => {
  it("marks the cell a patch changed, as an attribute, until it fades", () => {
    const injector = scope();
    const flash = injectChangedCellFlash({ enabled: true, injector });
    const attrs = computed(() => flash.flashAttrs("7", "budget"));
    flash.mark([UPDATE]);
    expect(flash.isFlashing("7", "budget")).toBe(true);
    expect(flash.isFlashing("7", "name")).toBe(false);
    expect(flash.isRowFlashing("7")).toBe(true);
    expect(attrs()).toEqual({ "data-flash": "" });
    vi.advanceTimersByTime(CHANGED_CELL_FLASH_MS);
    expect(attrs()).toEqual({});
    injector.destroy();
  });

  it("lights nothing for a reader who asked for reduced motion", () => {
    reducedMotion = true;
    const injector = scope();
    const flash = injectChangedCellFlash({ enabled: true, injector });
    flash.mark([UPDATE]);
    expect(flash.isFlashing("7", "budget")).toBe(false);
    injector.destroy();
  });

  it("drops what is lit when it is turned off", () => {
    const enabled = signal(true);
    const injector = scope();
    const flash = injectChangedCellFlash({ enabled, injector });
    flash.mark([UPDATE]);
    expect(flash.isFlashing("7", "budget")).toBe(true);
    enabled.set(false);
    TestBed.tick();
    expect(flash.isFlashing("7", "budget")).toBe(false);
    enabled.set(true);
    expect(flash.isFlashing("7", "budget")).toBe(false);
    injector.destroy();
  });
});
