import { type AdaptTableFeature, type ColumnDef } from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect } from "vitest";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `virtualize.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function virtualizeTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { virtualize } = kit.features;
  return collectConformanceTests(({ describe, it, beforeEach, afterEach }) => {
    /**
     * Virtualized bodies through the each kit table: a list that starts down the
     * page, rows taller than their estimate, and a window of columns. jsdom lays
     * nothing out, so each test gives elements the sizes a browser would.
     */

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

    function stub(
      target: object,
      name: string,
      descriptor: PropertyDescriptor
    ) {
      const previous = Object.getOwnPropertyDescriptor(target, name);
      Object.defineProperty(target, name, {
        configurable: true,
        ...descriptor,
      });
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
          return {
            top,
            left: 0,
            width: 0,
            height,
            bottom: top + height,
            right: 0,
          };
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
        ...document.querySelectorAll<HTMLElement>(kitSelector("row")),
      ].map((row) => row.getAttribute("data-row-id")!);
    }

    function spacerHeight(): string {
      const cell = document.querySelector<HTMLElement>(
        `${kitSelector("virtual-spacer")} td`
      );
      expect(cell).not.toBeNull();
      return cell!.style.height;
    }

    describe(`virtualize (${kit.name} Angular)`, () => {
      it("windows the rows in view below a table that starts down the page", async () => {
        // jsdom's window is 768px tall and the list starts 400px down, so 368px
        // of it shows: ten 40px rows. Measured from the page, not from zero —
        // which would show twenty.
        layout.listTop = 400;
        await mount({
          features: [virtualize({ estimateRowSize: 40, virtualOverscan: 0 })],
        });
        expect(renderedRowIds()).toEqual(
          Array.from({ length: 10 }, (_, index) => String(index))
        );
      });

      it("keeps the true height below the window when rows measure taller", async () => {
        layout.row = (index) => (index === 0 ? 100 : 40);
        await mount({
          features: [virtualize({ estimateRowSize: 40, virtualOverscan: 0 })],
          maxHeight: 200,
        });
        // 100 + 40 + 40 + 40 reaches past the 200px box: four rows render, and
        // the other twenty-one stand in below at their estimate.
        expect(renderedRowIds()).toEqual(["0", "1", "2", "3"]);
        expect(spacerHeight()).toBe(`${String(21 * 40)}px`);
      });
    });
  });
}
