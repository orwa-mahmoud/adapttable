/**
 * Row and cell marks: they appear, fade on their own, stay still for a
 * reader who asked for reduced motion, and are not made while disabled.
 */
import { highlightDuration } from "@adapttable/core";
import {
  computed,
  createEnvironmentInjector,
  EnvironmentInjector,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { injectHighlight } from "./highlight";

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

describe("injectHighlight", () => {
  it("marks a row and a cell, and lets the marks fade", () => {
    const injector = scope();
    const highlight = injectHighlight(true, injector);
    const rowLit = computed(() => highlight.isRowHighlighted("7"));
    highlight.flashRow("7");
    highlight.flashCell({ rowId: "7", columnKey: "budget" });
    expect(rowLit()).toBe(true);
    expect(highlight.isCellHighlighted("7", "budget")).toBe(true);
    expect(highlight.isCellHighlighted("7", "name")).toBe(false);
    expect(highlight.animated()).toBe(true);
    vi.advanceTimersByTime(highlightDuration(false));
    expect(rowLit()).toBe(false);
    injector.destroy();
  });

  it("keeps the mark still, and brief, for a reader who asked for reduced motion", () => {
    reducedMotion = true;
    const injector = scope();
    const highlight = injectHighlight(true, injector);
    highlight.flashRow("7");
    expect(highlight.isRowHighlighted("7")).toBe(true);
    expect(highlight.animated()).toBe(false);
    vi.advanceTimersByTime(highlightDuration(true));
    expect(highlight.isRowHighlighted("7")).toBe(false);
    injector.destroy();
  });

  it("makes no mark while disabled, and clears on request", () => {
    const enabled = signal(false);
    const injector = scope();
    const highlight = injectHighlight(enabled, injector);
    highlight.flashRow("7");
    expect(highlight.isRowHighlighted("7")).toBe(false);
    enabled.set(true);
    highlight.flashRow("7");
    expect(highlight.isRowHighlighted("7")).toBe(true);
    highlight.clear();
    expect(highlight.isRowHighlighted("7")).toBe(false);
    injector.destroy();
  });

  it("runs in an injection context without an injector", () => {
    const highlight = TestBed.runInInjectionContext(() =>
      injectHighlight(true)
    );
    highlight.flashRow("3");
    expect(highlight.isRowHighlighted("3")).toBe(true);
  });
});
