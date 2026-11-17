/**
 * Virtualized bodies through the unstyled table: a list that starts down the
 * page, rows taller than their estimate, and a window of columns. jsdom lays
 * nothing out, so each test gives elements the sizes a browser would.
 */
import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";
import { virtualize } from "@adapttable/angular-unstyled/virtualize";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { virtualizeTests } from "../../angular/test/kit/suites/virtualize";
import { kit } from "../testing/kit";
import { AdaptDataTable } from "./dataTable";

for (const test of virtualizeTests(kit)) it(test.name, test.run);

interface Item {
  id: string;
  [key: string]: string;
}

const COLUMN_COUNT = 12;

const COLUMNS: ColumnDef<Item>[] = Array.from(
  { length: COLUMN_COUNT },
  (_, index) => ({
    key: `c${String(index)}`,
    header: `C${String(index)}`,
    accessor: (row: Item) => row[`c${String(index)}`] ?? "",
  })
);

const ITEMS: Item[] = Array.from({ length: 25 }, (_, row) => ({
  id: String(row),
  ...Object.fromEntries(
    COLUMNS.map((column) => [column.key, `r${String(row)}${column.key}`])
  ),
}));

const layout = {
  listTop: 0,
  row: (_index: number): number => 40,
  scrollLeft: 0,
  boxWidth: 300,
};

const restore: (() => void)[] = [];

function stub(target: object, name: string, descriptor: PropertyDescriptor) {
  const previous = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, { configurable: true, ...descriptor });
  restore.push(() => {
    if (previous) Object.defineProperty(target, name, previous);
    else Reflect.deleteProperty(target, name);
  });
}

function part(element: Element): string | null {
  return element.getAttribute("data-adapttable-part");
}

function rowHeight(element: Element): number {
  const index = element.getAttribute("data-index");
  return part(element) === "row" && index !== null
    ? layout.row(Number(index))
    : 0;
}

beforeEach(() => {
  layout.listTop = 0;
  layout.row = () => 40;
  layout.scrollLeft = 0;
  stub(HTMLElement.prototype, "offsetHeight", {
    get(this: HTMLElement) {
      return part(this) === "scroll-box" ? 200 : rowHeight(this);
    },
  });
  stub(Element.prototype, "getBoundingClientRect", {
    value(this: Element) {
      const height = rowHeight(this);
      const top = part(this) === "tbody" ? layout.listTop : 0;
      return { top, left: 0, width: 0, height, bottom: top + height, right: 0 };
    },
  });
  stub(Element.prototype, "scrollLeft", {
    get(this: Element) {
      return part(this) === "scroll-box" ? layout.scrollLeft : 0;
    },
  });
  stub(Element.prototype, "clientWidth", {
    get(this: Element) {
      return part(this) === "scroll-box" ? layout.boxWidth : 0;
    },
  });
});

afterEach(() => {
  while (restore.length > 0) restore.pop()!();
  document.body.replaceChildren();
});

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data()"
      [columns]="columns()"
      [rowKey]="rowKey"
      [urlSync]="false"
      paginationMode="infinite"
      [maxHeight]="maxHeight()"
      [columnLayout]="columnLayout"
      [defaults]="defaults"
      [features]="features()"
    />
  `,
})
class Host {
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly columns = input<readonly ColumnDef<Item>[]>(COLUMNS.slice(0, 2));
  readonly maxHeight = input<number | undefined>(undefined);
  readonly data = input(ITEMS);
  readonly rowKey = (row: Item) => row.id;
  readonly defaults = { limit: 25 };
  readonly columnLayout = {
    hidden: [],
    order: [],
    pinned: {},
    widths: Object.fromEntries(COLUMNS.map((column) => [column.key, 100])),
  };
}

async function mount(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Host);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  // The window reads its offset and sizes once the list has mounted.
  await fixture.whenStable();
  return fixture;
}

function renderedRowIds(): string[] {
  return [
    ...document.querySelectorAll<HTMLElement>('[data-adapttable-part="row"]'),
  ].map((row) => row.getAttribute("data-row-id")!);
}

describe("virtualize (unstyled Angular)", () => {
  it("measures newly attached rows after their cell content is rendered", async () => {
    const measured = vi.fn((index: number) => {
      const row = document.querySelector(
        `[data-adapttable-part="row"][data-index="${String(index)}"]`
      );
      expect(row?.textContent).toContain(`r${String(index)}c0`);
      return 40;
    });
    layout.row = measured;
    await mount({
      features: [virtualize({ estimateRowSize: 40, virtualOverscan: 0 })],
      maxHeight: 200,
    });
    expect(measured).toHaveBeenCalled();
  });

  it("leaves bounded virtual loading to the window instead of a page sentinel", async () => {
    await mount({
      features: [virtualize({ estimateRowSize: 40, virtualOverscan: 0 })],
      maxHeight: 200,
      data: Array.from({ length: 1000 }, (_, index) => ({
        id: String(index),
        c0: "row",
        c1: "value",
      })),
    });
    expect(renderedRowIds()).toEqual(["0", "1", "2", "3", "4"]);
    expect(
      document.querySelector('[data-adapttable-part="load-more"]')
    ).toBeNull();
  });

  it("reveals an unmounted keyboard destination and focuses it after rendering", async () => {
    let scrollTop = 0;
    stub(Element.prototype, "scrollHeight", {
      get() {
        return 25 * 40;
      },
    });
    stub(Element.prototype, "clientHeight", {
      get() {
        return 200;
      },
    });
    stub(Element.prototype, "scrollTop", {
      get() {
        return scrollTop;
      },
    });
    stub(Element.prototype, "scrollTo", {
      value(this: Element, options: ScrollToOptions) {
        scrollTop = options.top ?? scrollTop;
        this.dispatchEvent(new Event("scroll"));
      },
    });
    const fixture = await mount({
      features: [
        cellNavigation(),
        virtualize({ estimateRowSize: 40, virtualOverscan: 0 }),
      ],
      maxHeight: 200,
    });
    const first = document.querySelector<HTMLElement>(
      '[data-grid-cell="0:0"]'
    )!;
    first.focus();
    first.dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", ctrlKey: true, bubbles: true })
    );
    await fixture.whenStable();
    await fixture.whenStable();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(scrollTop).toBeGreaterThan(0);
      expect(document.activeElement?.getAttribute("data-grid-cell")).toBe(
        "24:1"
      );
    });
    expect(scrollTop).toBeGreaterThan(0);
  });

  it("switches between bounded and page windows without remounting the table", async () => {
    layout.listTop = 400;
    const disposed = vi.fn();
    const mounted = vi.fn<NonNullable<AdaptTableFeature["mount"]>>(
      () => disposed
    );
    const fixture = await mount({
      features: [
        virtualize({ estimateRowSize: 40, virtualOverscan: 0 }),
        { id: "window-observer", mount: mounted },
      ],
      maxHeight: 200,
    });
    const table = document.querySelector("table");
    const search = document.querySelector<HTMLInputElement>(
      '[data-adapttable-part="search-field"] input'
    )!;
    expect(search).not.toBeNull();
    search.focus();
    expect(document.activeElement).toBe(search);
    expect(mounted).toHaveBeenCalledOnce();
    const runtime = mounted.mock.calls[0]![0].runtime;
    expect(runtime.rowAt(0)).toBe(ITEMS[0]);
    // Core's materializeWindowRows/rowWindow intentionally renders no rows
    // before a new virtualizer's first slice. Rows may remount during the
    // transition; the table, feature runtime and focused toolbar stay live.
    expect(renderedRowIds()).toEqual(["0", "1", "2", "3", "4"]);
    fixture.componentRef.setInput("maxHeight", undefined);
    await fixture.whenStable();
    await fixture.whenStable();
    expect(renderedRowIds()).toEqual(
      Array.from({ length: 10 }, (_, index) => String(index))
    );
    expect(document.querySelector("table")).toBe(table);
    expect(mounted).toHaveBeenCalledOnce();
    expect(disposed).not.toHaveBeenCalled();
    expect(mounted.mock.calls[0]![0].runtime).toBe(runtime);
    expect(runtime.rowAt(0)).toBe(ITEMS[0]);
    expect(document.activeElement).toBe(search);
    fixture.componentRef.setInput("maxHeight", 200);
    await fixture.whenStable();
    await fixture.whenStable();
    expect(renderedRowIds()).toEqual(["0", "1", "2", "3", "4"]);
    expect(document.querySelector("table")).toBe(table);
    expect(mounted).toHaveBeenCalledOnce();
    expect(disposed).not.toHaveBeenCalled();
    expect(mounted.mock.calls[0]![0].runtime).toBe(runtime);
    expect(runtime.rowAt(0)).toBe(ITEMS[0]);
    expect(document.activeElement).toBe(search);
    expect(fixture.componentInstance.data()).toBe(ITEMS);
    fixture.destroy();
    expect(disposed).toHaveBeenCalledOnce();
  });

  it("renders only the columns scrolled into view, with spacers for the rest", async () => {
    const fixture = await mount({
      features: [virtualize({ virtualizeColumns: true })],
      columns: COLUMNS,
      maxHeight: 400,
    });
    const headers = () =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '[data-adapttable-part="header-cell"]'
        ),
      ].map((cell) => cell.textContent.trim());
    // 300px of 100px columns, plus three either side.
    expect(headers()).toEqual(["C0", "C1", "C2", "C3", "C4", "C5"]);
    const endSpacer = document.querySelector<HTMLElement>(
      'th[data-adapttable-part="column-spacer-end"]'
    )!;
    expect(endSpacer.style.width).toBe(`${String(6 * 100)}px`);
    expect(
      document.querySelector('[data-adapttable-part="column-spacer-start"]')
    ).toBeNull();
    const firstRow = document.querySelector('[data-adapttable-part="row"]')!;
    expect(
      firstRow.querySelectorAll('[data-adapttable-part="cell"]')
    ).toHaveLength(6);

    layout.scrollLeft = 600;
    document
      .querySelector('[data-adapttable-part="scroll-box"]')!
      .dispatchEvent(new Event("scroll"));
    await fixture.whenStable();
    expect(headers()).toEqual([
      "C3",
      "C4",
      "C5",
      "C6",
      "C7",
      "C8",
      "C9",
      "C10",
      "C11",
    ]);
    const startSpacer = document.querySelector<HTMLElement>(
      'th[data-adapttable-part="column-spacer-start"]'
    )!;
    expect(startSpacer.style.width).toBe("300px");
    expect(document.querySelector("table")?.getAttribute("aria-colcount")).toBe(
      String(COLUMN_COUNT)
    );
    for (const selector of ["header-cell", "cell"]) {
      const cells = document.querySelectorAll(
        `[data-adapttable-part="${selector}"]`
      );
      expect(
        [...cells].slice(0, 9).map((cell) => cell.getAttribute("aria-colindex"))
      ).toEqual(["4", "5", "6", "7", "8", "9", "10", "11", "12"]);
    }
  });
});
