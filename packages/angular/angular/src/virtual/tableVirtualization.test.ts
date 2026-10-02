/**
 * Row and keyed windows over the real TanStack virtualizer. jsdom lays
 * nothing out, so each test gives the scroll box, the window and the rows
 * the sizes a browser would.
 */
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdaptAttrs } from "../attrs";
import { featureOptionsOf } from "../featureHost";
import { virtualize } from "../features/virtualize";
import {
  injectKeyedVirtualization,
  injectKeyedVirtualizer,
  injectTableVirtualization,
  injectTableVirtualizer,
} from "./tableVirtualization";

interface Row {
  id: string;
}

const ROWS: Row[] = Array.from({ length: 60 }, (_, index) => ({
  id: String(index),
}));

/** Heights by element: the scroll box, and a row by its `data-index`. */
const layout = {
  box: 200,
  row: (index: number): number => (index === 0 ? 100 : 40),
  scrollTop: 0,
  scrollY: 0,
};

const restore: (() => void)[] = [];

function stub<T extends object>(
  target: T,
  name: PropertyKey,
  descriptor: PropertyDescriptor
): void {
  const previous = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, { configurable: true, ...descriptor });
  restore.push(() => {
    if (previous) Object.defineProperty(target, name, previous);
    else Reflect.deleteProperty(target, name);
  });
}

function isBox(element: Element): boolean {
  return element.classList.contains("box");
}

/** The box's height, a row's by its `data-index`, and nothing else's. */
function heightOf(element: Element): number {
  if (isBox(element)) return layout.box;
  const index = element.getAttribute("data-index");
  return index === null ? 0 : layout.row(Number(index));
}

beforeEach(() => {
  layout.scrollTop = 0;
  layout.scrollY = 0;
  stub(HTMLElement.prototype, "offsetHeight", {
    get(this: HTMLElement) {
      return heightOf(this);
    },
  });
  stub(Element.prototype, "clientHeight", {
    get(this: Element) {
      return isBox(this) ? layout.box : 0;
    },
  });
  stub(Element.prototype, "scrollHeight", {
    get(this: Element) {
      return isBox(this) ? 100_000 : 0;
    },
  });
  stub(Element.prototype, "scrollTo", {
    value(this: Element, options: { top?: number }) {
      if (isBox(this) && options.top !== undefined) {
        layout.scrollTop = options.top;
      }
    },
  });
  stub(Element.prototype, "scrollTop", {
    get(this: Element) {
      return isBox(this) ? layout.scrollTop : 0;
    },
    set(this: Element, value: number) {
      if (isBox(this)) layout.scrollTop = value;
    },
  });
  stub(Element.prototype, "getBoundingClientRect", {
    value(this: Element) {
      const height = heightOf(this);
      return { top: 0, left: 0, width: 0, height, bottom: height, right: 0 };
    },
  });
  stub(globalThis, "scrollY", {
    get: () => layout.scrollY,
  });
});

afterEach(() => {
  while (restore.length > 0) restore.pop()!();
  document.body.replaceChildren();
});

@Component({
  imports: [AdaptAttrs],
  template: `
    <div class="box" #box>
      @for (entry of vz.virtualization().rows; track entry.key) {
        <div
          class="row"
          [attr.data-index]="entry.index"
          [adaptAttrs]="{ ref: vz.virtualization().measureElement }"
        >
          {{ entry.row.id }}
        </div>
      }
    </div>
  `,
})
class BoxHost {
  readonly enabled = signal(true);
  readonly estimate = signal(40);
  readonly onEndReached = vi.fn();
  readonly vz = injectTableVirtualizer({
    rows: signal(ROWS.slice(0, 20)),
    rowKey: (row: Row) => row.id,
    enabled: this.enabled,
    estimateSize: this.estimate,
    overscan: 0,
    getScrollElement: () => document.querySelector(".box"),
    onEndReached: () => {
      this.onEndReached();
    },
  });
}

@Component({ template: "" })
class PageHost {
  readonly margin = input(0);
  readonly window = injectTableVirtualization({
    rows: signal(ROWS),
    rowKey: (row: Row) => row.id,
    enabled: true,
    estimateSize: 40,
    overscan: 0,
    scrollMargin: this.margin,
  });
}

@Component({ template: "" })
class PairHost {
  readonly vz = injectTableVirtualizer({
    rows: signal(ROWS.slice(0, 20)),
    rowKey: (row: Row) => row.id,
    enabled: true,
    estimateSize: 40,
    overscan: 0,
    expandable: true,
    getScrollElement: () => document.querySelector(".box"),
  });
}

@Component({ template: `<div class="box"></div>` })
class KeyedHost {
  readonly enabled = signal(true);
  readonly onEndReached = vi.fn();
  readonly vz = injectKeyedVirtualizer({
    keys: signal(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]),
    enabled: this.enabled,
    estimateSize: 50,
    overscan: 0,
    getScrollElement: () => document.querySelector(".box"),
    onEndReached: () => {
      this.onEndReached();
    },
  });
}

async function mount<T>(
  host: new () => T,
  inputs: Record<string, unknown> = {}
) {
  const fixture = TestBed.createComponent(host);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance };
}

function scrollBox(top: number): void {
  layout.scrollTop = top;
  document.querySelector(".box")!.dispatchEvent(new Event("scroll"));
}

function rendered(): string[] {
  return [...document.querySelectorAll(".row")].map((row) =>
    row.textContent.trim()
  );
}

describe("virtualize feature", () => {
  it("turns virtualize on and carries the windowing knobs", () => {
    expect(featureOptionsOf([virtualize()])).toMatchObject({
      virtualize: true,
    });
    expect(
      featureOptionsOf([
        virtualize({ estimateRowSize: 72, virtualizeColumns: true }),
      ])
    ).toMatchObject({
      virtualize: true,
      estimateRowSize: 72,
      virtualizeColumns: true,
    });
    expect(featureOptionsOf([virtualize(false)])).toMatchObject({
      virtualize: false,
    });
  });
});

describe("injectTableVirtualizer in a scroll box", () => {
  it("renders the rows in view and spaces the rest", async () => {
    layout.row = () => 40;
    const { host } = await mount(BoxHost);
    expect(rendered()).toEqual(["0", "1", "2", "3", "4"]);
    const window = host.vz.virtualization();
    expect(window.enabled).toBe(true);
    expect(window.paddingTop).toBe(0);
    expect(window.paddingBottom).toBe(15 * 40);
  });

  it("moves the window as the box scrolls, and says once when the end is in view", async () => {
    layout.row = () => 40;
    const { fixture, host } = await mount(BoxHost);
    scrollBox(400);
    await fixture.whenStable();
    expect(rendered()).toEqual(["10", "11", "12", "13", "14"]);
    expect(host.vz.virtualization().paddingTop).toBe(400);
    expect(host.onEndReached).not.toHaveBeenCalled();

    scrollBox(600);
    await fixture.whenStable();
    expect(rendered()).toEqual(["15", "16", "17", "18", "19"]);
    expect(host.onEndReached).toHaveBeenCalledOnce();
  });

  it("keeps the true total when rows measure taller than the estimate", async () => {
    layout.row = (index) => (index === 0 ? 100 : 40);
    const { fixture, host } = await mount(BoxHost);
    await fixture.whenStable();
    expect(rendered()).toEqual(["0", "1", "2", "3"]);
    const window = host.vz.virtualization();
    // 100 for the first row, 40 for each of the other nineteen.
    expect(window.paddingTop + 100 + 3 * 40 + window.paddingBottom).toBe(
      100 + 19 * 40
    );
  });

  it("renders every row with no spacers while windowing is off", async () => {
    layout.row = () => 40;
    const { fixture, host } = await mount(BoxHost);
    host.enabled.set(false);
    await fixture.whenStable();
    expect(rendered()).toHaveLength(20);
    expect(host.vz.virtualization().paddingBottom).toBe(0);
    expect(host.vz.virtualization().measureElement).toBeUndefined();

    host.enabled.set(true);
    await fixture.whenStable();
    expect(rendered()).toHaveLength(5);
  });

  it("scrolls the box to bring a row into view", async () => {
    layout.row = () => 40;
    const { host } = await mount(BoxHost);
    host.vz.scrollToIndex(12);
    // Centred: row 12 starts at 480; half the 200px box above it.
    expect(layout.scrollTop).toBe(480 - 100 + 20);
  });
});

describe("injectTableVirtualization against the page", () => {
  it("windows the rows below a table that starts down the page", async () => {
    const { fixture, host } = await mount(PageHost, { margin: 400 });
    // jsdom's window is 768px tall; the list starts 400px down, so 368px of
    // it shows — ten 40px rows.
    const first = host.window();
    expect(first.rows.map((entry) => entry.row.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => String(index))
    );

    layout.scrollY = 800;
    globalThis.dispatchEvent(new Event("scroll"));
    await fixture.whenStable();
    const scrolled = host.window().rows.map((entry) => Number(entry.row.id));
    // 800px scrolled, less the 400px above the list: rows from index 10.
    expect(scrolled[0]).toBe(10);
    expect(scrolled.at(-1)).toBe(29);
  });

  it("starts at the top of the list when it sits at the top of the page", async () => {
    const { host } = await mount(PageHost, { margin: 0 });
    expect(host.window().rows).toHaveLength(20);
  });
});

describe("row-pair measurement", () => {
  it("counts an open detail panel into its row's height", async () => {
    const { fixture, host } = await mount(PairHost);
    document.body.insertAdjacentHTML("beforeend", '<div class="box"></div>');
    await fixture.whenStable();
    const window = host.vz.virtualization();
    expect(window.measureElement).toBeUndefined();
    const pair = window.measureRowPair!;
    const before = window.paddingTop + window.paddingBottom;

    layout.row = (index) => (index === 0 ? 40 : 160);
    const row = document.createElement("tr");
    row.setAttribute("data-index", "0");
    const detail = document.createElement("tr");
    detail.setAttribute("data-index", "1");
    pair.row(0)(row);
    pair.detail(0)(detail);
    await fixture.whenStable();

    const after = host.vz.virtualization();
    expect(after.paddingTop + after.paddingBottom - before).toBe(160);
  });
});

describe("injectKeyedVirtualizer", () => {
  it("windows keyed entries in a scroll box and every index while off", async () => {
    layout.row = () => 50;
    const { fixture, host } = await mount(KeyedHost);
    expect(host.vz.virtualization().indices).toEqual([0, 1, 2, 3]);
    expect(host.vz.virtualization().paddingBottom).toBe(6 * 50);

    scrollBox(300);
    await fixture.whenStable();
    expect(host.vz.virtualization().indices).toEqual([6, 7, 8, 9]);
    expect(host.onEndReached).toHaveBeenCalledOnce();

    host.enabled.set(false);
    await fixture.whenStable();
    expect(host.vz.virtualization().indices).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });
  it("measures a taller entry and scrolls an entry into view", async () => {
    layout.row = (index) => (index === 1 ? 150 : 50);
    const { fixture, host } = await mount(KeyedHost);
    const before = host.vz.virtualization();
    expect(before.paddingBottom).toBe(6 * 50);
    const entry = document.createElement("div");
    entry.setAttribute("data-index", "1");
    before.measureElement!(entry);
    await fixture.whenStable();
    // Entry 1 measures 150, so entries 0 and 1 fill the 200px box and the
    // other eight wait below at their estimate.
    const after = host.vz.virtualization();
    expect(after.indices).toEqual([0, 1]);
    expect(after.paddingBottom).toBe(8 * 50);

    host.vz.scrollToIndex(8);
    // Centred: entry 8 starts at 50 + 150 + 6 × 50 = 500.
    expect(layout.scrollTop).toBe(500 - 100 + 25);
  });

  it("lists every entry from the window-only injector while off", () => {
    const window = TestBed.runInInjectionContext(() =>
      injectKeyedVirtualization({ keys: signal(["x", "y"]), enabled: false })
    );
    expect(window().enabled).toBe(false);
    expect(window().indices).toEqual([0, 1]);
  });
});
