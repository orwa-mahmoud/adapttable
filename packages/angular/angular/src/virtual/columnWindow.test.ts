/**
 * Windowed columns, their spacer cells, and the window-mode page offset.
 */
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import { AdaptColumnSpacer } from "./columnSpacer";
import { injectColumnWindow } from "./columnWindow";
import { injectMeasuredWindowScrollMargin } from "./windowScrollMargin";

/** A ResizeObserver the test fires by hand, as a browser would on resize. */
class FakeResizeObserver {
  static readonly live = new Set<FakeResizeObserver>();
  readonly observed = new Set<Element>();
  constructor(private readonly callback: () => void) {
    FakeResizeObserver.live.add(this);
  }
  observe(element: Element): void {
    this.observed.add(element);
  }
  unobserve(element: Element): void {
    this.observed.delete(element);
  }
  disconnect(): void {
    this.observed.clear();
    FakeResizeObserver.live.delete(this);
  }
  static fire(): void {
    for (const observer of [...FakeResizeObserver.live]) observer.callback();
  }
}

function installResizeObserver(): () => void {
  const previous = globalThis.ResizeObserver;
  globalThis.ResizeObserver =
    FakeResizeObserver as unknown as typeof ResizeObserver;
  return () => {
    globalThis.ResizeObserver = previous;
    FakeResizeObserver.live.clear();
  };
}

interface Row {
  id: string;
}

const COLUMNS: ColumnDef<Row>[] = Array.from({ length: 20 }, (_, index) => ({
  key: `c${String(index)}`,
  header: `C${String(index)}`,
}));

const WIDTHS = Object.fromEntries(COLUMNS.map((column) => [column.key, 100]));

const viewport = { scrollLeft: 0, clientWidth: 300 };

function wideBox(): HTMLElement {
  const box = document.createElement("div");
  Object.defineProperty(box, "scrollLeft", {
    get: () => viewport.scrollLeft,
  });
  Object.defineProperty(box, "clientWidth", {
    get: () => viewport.clientWidth,
  });
  document.body.append(box);
  return box;
}

@Component({ template: "" })
class WindowHost {
  readonly enabled = signal(true);
  readonly pinned = signal<ReadonlySet<string>>(new Set(["c19"]));
  readonly box = wideBox();
  readonly window = injectColumnWindow({
    columns: signal(COLUMNS),
    enabled: this.enabled,
    widths: signal(WIDTHS),
    pinnedKeys: this.pinned,
    getScrollElement: () => this.box,
    overscan: 1,
  });
}

@Component({
  imports: [AdaptColumnSpacer],
  template: `
    <table>
      <tr>
        <adapt-column-spacer [width]="start()" side="start" as="th" />
        <adapt-column-spacer [width]="end()" side="end" />
      </tr>
    </table>
  `,
})
class SpacerHost {
  readonly start = signal(0);
  readonly end = signal(250);
}

@Component({
  template: `<div class="root"><div data-adapttable-part="tbody"></div></div>`,
})
class MarginHost {
  readonly enabled = signal(true);
  readonly element = signal<Element | null>(null);
  readonly margin = injectMeasuredWindowScrollMargin({
    enabled: this.enabled,
    element: () => this.element(),
  });
}

afterEach(() => {
  viewport.scrollLeft = 0;
  document.body.replaceChildren();
});

describe("injectColumnWindow", () => {
  it("renders the pinned column and the scrolled-into-view span, spacing the rest", async () => {
    const fixture = TestBed.createComponent(WindowHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const window = fixture.componentInstance.window();
    expect(window.enabled).toBe(true);
    // The full 300px scroll box includes the 100px pin: c0/c1 are
    // visible in the remaining 200px, with c2 as the one-column overscan.
    expect(viewport.clientWidth - WIDTHS.c19!).toBe(200);
    expect(window.columns.map((column) => column.key)).toEqual([
      "c19",
      "c0",
      "c1",
      "c2",
    ]);
    expect(window.paddingStart).toBe(0);
    expect(window.paddingEnd).toBe((19 - 3) * 100);
    expect(
      window.paddingStart + window.columns.length * 100 + window.paddingEnd
    ).toBe(2000);
  });

  it("moves with a horizontal scroll, either direction", async () => {
    const fixture = TestBed.createComponent(WindowHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    viewport.scrollLeft = -1000;
    host.box.dispatchEvent(new Event("scroll"));
    await fixture.whenStable();
    const window = host.window();
    expect(window.columns.map((column) => column.key)).toEqual([
      "c19",
      "c9",
      "c10",
      "c11",
      "c12",
    ]);
    // At 1000px, c10/c11 occupy the 200px left after the pin. c9/c12
    // provide one column of overscan on each side.
    expect(viewport.clientWidth - WIDTHS.c19!).toBe(200);
    expect(window.paddingStart).toBe(900);
    expect(window.paddingEnd).toBe(600);
    expect(
      window.paddingStart + window.columns.length * 100 + window.paddingEnd
    ).toBe(2000);
  });

  it("widens the window when the box grows", async () => {
    const uninstall = installResizeObserver();
    try {
      const fixture = TestBed.createComponent(WindowHost);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      viewport.clientWidth = 600;
      FakeResizeObserver.fire();
      await fixture.whenStable();
      // The pin leaves 500px for c0..c4, followed by one overscan c5.
      expect(viewport.clientWidth - WIDTHS.c19!).toBe(500);
      const window = fixture.componentInstance.window();
      expect(window.columns.map((column) => column.key)).toEqual([
        "c19",
        "c0",
        "c1",
        "c2",
        "c3",
        "c4",
        "c5",
      ]);
      expect(window.paddingStart).toBe(0);
      expect(window.paddingEnd).toBe(1300);
      expect(
        window.paddingStart + window.columns.length * 100 + window.paddingEnd
      ).toBe(2000);
    } finally {
      viewport.clientWidth = 300;
      uninstall();
    }
  });

  it("renders every column with no spacers while off", async () => {
    const fixture = TestBed.createComponent(WindowHost);
    fixture.componentInstance.enabled.set(false);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const window = fixture.componentInstance.window();
    expect(window.enabled).toBe(false);
    expect(window.columns).toHaveLength(20);
    expect(window.paddingStart + window.paddingEnd).toBe(0);
  });
});

describe("AdaptColumnSpacer", () => {
  it("draws a hidden cell of the skipped width, and nothing for zero", async () => {
    const fixture = TestBed.createComponent(SpacerHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(
      root.querySelector('[data-adapttable-part="column-spacer-start"]')
    ).toBeNull();
    const end = root.querySelector<HTMLElement>(
      '[data-adapttable-part="column-spacer-end"]'
    )!;
    expect(end.tagName).toBe("TD");
    expect(end.getAttribute("aria-hidden")).toBe("true");
    expect(end.style.width).toBe("250px");
    expect(end.style.minWidth).toBe("250px");

    fixture.componentInstance.start.set(120);
    await fixture.whenStable();
    const start = root.querySelector<HTMLElement>(
      '[data-adapttable-part="column-spacer-start"]'
    )!;
    expect(start.tagName).toBe("TH");
    expect(start.style.width).toBe("120px");
  });
});

describe("injectMeasuredWindowScrollMargin", () => {
  it("is where the list starts on the page, and zero while off", async () => {
    const fixture = TestBed.createComponent(MarginHost);
    document.body.append(fixture.nativeElement as HTMLElement);
    const root = (fixture.nativeElement as HTMLElement).querySelector(".root")!;
    const list = root.querySelector('[data-adapttable-part="tbody"]')!;
    list.getBoundingClientRect = () =>
      ({
        top: 420.4,
        left: 0,
        width: 0,
        height: 0,
        bottom: 0,
        right: 0,
      }) as DOMRect;
    const host = fixture.componentInstance;
    host.element.set(root);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(host.margin()).toBe(420);

    host.enabled.set(false);
    await fixture.whenStable();
    expect(host.margin()).toBe(0);
  });

  it("follows the list when the page above it resizes", async () => {
    const uninstall = installResizeObserver();
    try {
      const fixture = TestBed.createComponent(MarginHost);
      document.body.append(fixture.nativeElement as HTMLElement);
      const root = (fixture.nativeElement as HTMLElement).querySelector(
        ".root"
      )!;
      const list = root.querySelector('[data-adapttable-part="tbody"]')!;
      let top = 120;
      list.getBoundingClientRect = () =>
        ({ top, left: 0, width: 0, height: 0, bottom: 0, right: 0 }) as DOMRect;
      const host = fixture.componentInstance;
      host.element.set(root);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      expect(host.margin()).toBe(120);

      top = 300;
      FakeResizeObserver.fire();
      expect(host.margin()).toBe(300);
      top = 180;
      globalThis.dispatchEvent(new Event("resize"));
      expect(host.margin()).toBe(180);

      host.enabled.set(false);
      await fixture.whenStable();
      expect(FakeResizeObserver.live.size).toBe(0);
    } finally {
      uninstall();
    }
  });
});
