/**
 * Match marks, the Ctrl/Cmd+F scope, and scrolling the current hit into view.
 */
import type { GridCell } from "@adapttable/core";
import { Component, inject, Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import type { FindInTableState } from "./findInTable";
import {
  findMarkAttrs,
  injectFindFocus,
  injectFindScroll,
  injectFindShortcut,
  injectFindWindowScroll,
} from "./findMarks";

const cell: GridCell = { row: 1, col: 0 };

function state(over: Partial<FindInTableState> = {}): FindInTableState {
  return {
    open: true,
    setOpen: vi.fn(),
    query: "e",
    setQuery: vi.fn(),
    matches: [cell],
    matchKeys: new Set(["1:0"]),
    index: 0,
    current: cell,
    next: vi.fn(),
    previous: vi.fn(),
    openBar: vi.fn(),
    ...over,
  };
}

describe("findMarkAttrs", () => {
  it("leaves a cell alone when nothing matches", () => {
    const base = { role: "cell" };
    expect(
      findMarkAttrs(base, state({ matchKeys: new Set(), current: null }), cell)
    ).toBe(base);
  });

  it("leaves a cell that is not a hit", () => {
    const base = { role: "cell" };
    expect(findMarkAttrs(base, state(), { row: 0, col: 0 })).toBe(base);
  });

  it("marks a hit, and the one the walk is on", () => {
    const marked = findMarkAttrs({ role: "cell" }, state(), cell);
    expect(marked["data-cell-match"]).toBe("");
    expect(marked["data-cell-match-current"]).toBe("");
    const other = findMarkAttrs(
      { role: "cell" },
      state({
        current: { row: 0, col: 1 },
        matchKeys: new Set(["1:0", "0:1"]),
      }),
      cell
    );
    expect(other["data-cell-match"]).toBe("");
    expect(other["data-cell-match-current"]).toBeUndefined();
  });
});

@Component({ template: `<div id="root"></div>` })
class ShortcutHost {
  readonly open = signal<(() => void) | undefined>(undefined);
  constructor() {
    injectFindShortcut({
      root: () => document.querySelector("#root"),
      openBar: this.open,
      injector: inject(Injector),
    });
  }
}

describe("injectFindShortcut", () => {
  it("opens on Ctrl+F inside the table and ignores it outside", () => {
    const fixture = TestBed.createComponent(ShortcutHost);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.detectChanges();
    const open = vi.fn();
    fixture.componentInstance.open.set(open);
    fixture.detectChanges();
    const root = document.querySelector("#root")!;
    const inside = new KeyboardEvent("keydown", {
      key: "f",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(inside, "target", { value: root });
    document.dispatchEvent(inside);
    expect(open).toHaveBeenCalledOnce();
    expect(inside.defaultPrevented).toBe(true);

    const outside = new KeyboardEvent("keydown", {
      key: "f",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(outside);
    expect(open).toHaveBeenCalledOnce();
  });

  it("does nothing while find is off", () => {
    const fixture = TestBed.createComponent(ShortcutHost);
    fixture.detectChanges();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true })
    );
    expect(fixture.componentInstance.open()).toBeUndefined();
  });
});

@Component({
  template: `<div id="find-root"><div data-cell-match-current=""></div></div>`,
})
class ScrollHost {
  readonly current = signal<GridCell | null>(null);
  readonly enabled = signal(true);
  readonly scrolled = signal(0);
  constructor() {
    const injector = inject(Injector);
    injectFindScroll({
      root: () => document.querySelector("#find-root"),
      current: this.current,
      enabled: this.enabled,
      injector,
    });
    injectFindWindowScroll({
      current: this.current,
      rows: signal(["Ada", "Grace"]),
      firstRowIndex: signal(0),
      scrollToIndex: () => (index) => {
        this.scrolled.set(index);
      },
      injector,
    });
  }
}

describe("injectFindScroll and injectFindWindowScroll", () => {
  it("scrolls the marked cell and the window when the walk moves", async () => {
    const fixture = TestBed.createComponent(ScrollHost);
    document.body.append(fixture.nativeElement as HTMLElement);
    const hit = fixture.nativeElement.querySelector(
      "[data-cell-match-current]"
    ) as HTMLElement;
    hit.scrollIntoView = vi.fn();
    fixture.detectChanges();
    fixture.componentInstance.current.set(cell);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(hit.scrollIntoView).toHaveBeenCalled();
    expect(fixture.componentInstance.scrolled()).toBe(1);
  });

  it("does not scroll while disabled or before a match", async () => {
    const fixture = TestBed.createComponent(ScrollHost);
    fixture.componentInstance.enabled.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.scrolled()).toBe(0);
    fixture.componentInstance.enabled.set(true);
    fixture.componentInstance.current.set({ row: 9, col: 0 });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.scrolled()).toBe(0);
  });
});

@Component({ template: "" })
class FocusHost {
  readonly find = signal(state({ current: null, open: false }));
  readonly enabled = signal(true);
  readonly focused = signal<GridCell | null>(null);
  readonly selected = signal<GridCell | null>(null);
  constructor() {
    injectFindFocus({
      find: this.find,
      focusCell: (next) => {
        this.focused.set(next);
      },
      selectRange: (range) => {
        this.selected.set(range?.head ?? null);
      },
      enabled: this.enabled,
      injector: inject(Injector),
    });
  }
}

describe("injectFindFocus", () => {
  it("moves grid focus onto the current match", () => {
    const fixture = TestBed.createComponent(FocusHost);
    fixture.detectChanges();
    expect(fixture.componentInstance.focused()).toBeNull();
    fixture.componentInstance.find.set(state());
    fixture.detectChanges();
    expect(fixture.componentInstance.focused()).toEqual(cell);
    expect(fixture.componentInstance.selected()).toEqual(cell);
  });

  it("does nothing while the grid is off", () => {
    const fixture = TestBed.createComponent(FocusHost);
    fixture.componentInstance.enabled.set(false);
    fixture.componentInstance.find.set(state());
    fixture.detectChanges();
    expect(fixture.componentInstance.focused()).toBeNull();
  });
});
