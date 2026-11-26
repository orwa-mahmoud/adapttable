import {
  type AdaptTableFeature,
  type ColumnDef,
  type ColumnLayoutState,
} from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, vi } from "vitest";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `columnTools.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function columnToolsTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { columnMenu, resizableColumns } = kit.features;
  return collectConformanceTests(({ describe, it, afterEach }) => {
    /**
     * Column tools on the each kit table: a multi-sort badge, a resize handle,
     * a header's own text, a phone sort select, and renaming from the header.
     */

    interface City {
      id: string;
      name: string;
      country: string;
    }

    const CITIES: City[] = [
      { id: "1", name: "Dubai", country: "UAE" },
      { id: "2", name: "Amman", country: "Jordan" },
    ];

    const COLUMNS: ColumnDef<City>[] = [
      {
        key: "name",
        header: "Name",
        sortable: true,
        renameable: true,
        headerActions: "info",
        accessor: (row) => row.name,
      },
      {
        key: "country",
        header: "Country",
        sortable: true,
        accessor: (row) => row.country,
      },
    ];

    let features: AdaptTableFeature[] = [];
    let mobile = false;
    let dir: "ltr" | "rtl" = "ltr";
    const renamed = vi.fn();

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [forceMobile]="mobile"
          [dir]="dir"
          [features]="features"
          [defaultColumnLayout]="defaultColumnLayout"
          (columnLayoutChange)="layouts.push($event)"
        />
      `,
    })
    class Host {
      readonly rows = CITIES;
      readonly columns = COLUMNS;
      readonly rowKey = (row: City) => row.id;
      readonly features = features;
      readonly mobile = mobile;
      readonly dir = dir;
      readonly defaultColumnLayout = { widths: { name: 150, country: 120 } };
      readonly layouts: ColumnLayoutState[] = [];
    }

    async function mount() {
      const fixture = TestBed.createComponent(Host);
      document.body.append(fixture.nativeElement as HTMLElement);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      return fixture;
    }

    const parts = (name: string) => [
      ...document.querySelectorAll<HTMLElement>(kitSelector(name)),
    ];

    function columnCells(key: string) {
      return [
        ...document.querySelectorAll<HTMLTableCellElement>(
          `th[data-column-key="${key}"], td[data-column-key="${key}"]`
        ),
      ];
    }

    function measuredResizeHandle() {
      const header = columnCells("name")[0]!;
      // Supply only browser geometry; the real layout writes every cell's style.
      vi.spyOn(header, "getBoundingClientRect").mockImplementation(
        () => new DOMRect(0, 0, Number.parseFloat(header.style.width), 32)
      );
      return header.querySelector<HTMLElement>(kitSelector("resize-handle"))!;
    }

    function expectColumnWidths(width: number) {
      expect(columnCells("name").map((cell) => cell.style.width)).toEqual([
        `${String(width)}px`,
        `${String(width)}px`,
        `${String(width)}px`,
      ]);
      expect(columnCells("country").map((cell) => cell.style.width)).toEqual([
        "120px",
        "120px",
        "120px",
      ]);
    }

    afterEach(() => {
      document.dispatchEvent(new MouseEvent("pointercancel"));
      document.body.replaceChildren();
      features = [];
      mobile = false;
      dir = "ltr";
      renamed.mockClear();
      vi.restoreAllMocks();
    });

    describe(`the ${kit.name} table's column tools`, () => {
      it.each([
        { direction: "ltr" as const, widen: "ArrowRight", narrow: "ArrowLeft" },
        { direction: "rtl" as const, widen: "ArrowLeft", narrow: "ArrowRight" },
      ])(
        "resizes the desktop column and tells the host with $direction arrow keys",
        async ({ direction, widen, narrow }) => {
          features = [resizableColumns()];
          dir = direction;
          const fixture = await mount();
          const handle = measuredResizeHandle();
          expectColumnWidths(150);
          handle.focus();
          handle.dispatchEvent(
            new KeyboardEvent("keydown", { key: widen, bubbles: true })
          );
          await fixture.whenStable();
          expect(
            fixture.componentInstance.layouts.map((layout) => layout.widths)
          ).toEqual([{ name: 166, country: 120 }]);
          expectColumnWidths(166);
          expect(document.activeElement).toBe(handle);

          handle.dispatchEvent(
            new KeyboardEvent("keydown", { key: narrow, bubbles: true })
          );
          await fixture.whenStable();
          expect(
            fixture.componentInstance.layouts.map((layout) => layout.widths)
          ).toEqual([
            { name: 166, country: 120 },
            { name: 150, country: 120 },
          ]);
          expectColumnWidths(150);
        }
      );

      it.each([
        { direction: "ltr" as const, delta: 1, end: "pointerup" },
        { direction: "rtl" as const, delta: -1, end: "pointercancel" },
      ])(
        "resizes the desktop column with a $direction drag and stops after $end",
        async ({ direction, delta, end }) => {
          features = [resizableColumns()];
          dir = direction;
          const fixture = await mount();
          const handle = measuredResizeHandle();
          const frames = vi.spyOn(globalThis, "requestAnimationFrame");
          expectColumnWidths(150);
          const down = new MouseEvent("pointerdown", {
            clientX: 100,
            bubbles: true,
            cancelable: true,
          });
          handle.dispatchEvent(down);
          expect(down.defaultPrevented).toBe(true);
          document.dispatchEvent(
            new MouseEvent("pointermove", { clientX: 100 + 40 * delta })
          );
          document.dispatchEvent(new MouseEvent(end));
          await fixture.whenStable();
          expect(
            fixture.componentInstance.layouts.map((layout) => layout.widths)
          ).toEqual([{ name: 190, country: 120 }]);
          expectColumnWidths(190);

          const scheduled = frames.mock.calls.length;
          document.dispatchEvent(
            new MouseEvent("pointermove", { clientX: 500 })
          );
          expect(frames).toHaveBeenCalledTimes(scheduled);
          expect(fixture.componentInstance.layouts).toHaveLength(1);
          expectColumnWidths(190);
        }
      );

      it("clamps a desktop drag to the minimum column width", async () => {
        features = [resizableColumns()];
        const fixture = await mount();
        const handle = measuredResizeHandle();
        handle.dispatchEvent(
          new MouseEvent("pointerdown", { clientX: 100, bubbles: true })
        );
        document.dispatchEvent(
          new MouseEvent("pointermove", { clientX: -500 })
        );
        document.dispatchEvent(new MouseEvent("pointerup"));
        await fixture.whenStable();
        expect(
          fixture.componentInstance.layouts.map((layout) => layout.widths)
        ).toEqual([{ name: 60, country: 120 }]);
        expectColumnWidths(60);
      });

      it("sizes the desktop column from its widest body cell on double-click", async () => {
        features = [resizableColumns()];
        const fixture = await mount();
        const handle = measuredResizeHandle();
        const cells = columnCells("name");
        for (const [index, cell] of cells.entries()) {
          Object.defineProperty(cell, "scrollWidth", {
            value: index === 2 ? 300 : 100,
          });
        }
        handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        await fixture.whenStable();
        expect(
          fixture.componentInstance.layouts.map((layout) => layout.widths)
        ).toEqual([{ name: 324, country: 120 }]);
        expectColumnWidths(324);
      });

      it("renames a column from its header", async () => {
        features = [columnMenu({ onRename: renamed })];
        const fixture = await mount();
        parts("header-rename-button")[0]!.click();
        await fixture.whenStable();
        const input = parts("header-rename-input")[0] as HTMLInputElement;
        input.value = "Person";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        parts("header-rename-form")[0]!.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
        expect(renamed).toHaveBeenCalledWith("name", "Person");
        expect(parts("header-rename-announcer").length).toBeGreaterThan(0);
      });
    });
  });
}
