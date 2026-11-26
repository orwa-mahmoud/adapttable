import { type ColumnDef } from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect } from "vitest";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `findInTable.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function findInTableTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { cellNavigation, findInTable } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    /**
     * Find in table for the each kit Angular kit: the bar, the marks, and the
     * toolbar button.
     */

    interface Row {
      id: string;
      name: string;
      team: string;
    }

    const ROWS: Row[] = [
      { id: "1", name: "Ada", team: "Core" },
      { id: "2", name: "Grace", team: "Web" },
    ];

    const COLUMNS: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (row) => row.name },
      { key: "team", header: "Team", accessor: (row) => row.team },
    ];

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [forceMobile]="false"
          [features]="features"
        />
      `,
    })
    class Host {
      readonly rows = ROWS;
      readonly columns = COLUMNS;
      readonly rowKey = (row: Row) => row.id;
      features = [findInTable({ button: true })];
    }

    const part = (name: string) =>
      document.querySelector<HTMLElement>(kitSelector(name));

    describe(`find in table (${kit.name} Angular)`, () => {
      async function mount(navigable = false) {
        const fixture = TestBed.createComponent(Host);
        if (navigable) {
          fixture.componentInstance.features = [
            findInTable({ button: true }),
            cellNavigation(),
          ];
        }
        fixture.detectChanges();
        await fixture.whenStable();
        document.body.append(fixture.nativeElement as HTMLElement);
        return fixture;
      }

      it("opens on Ctrl+F inside the table when the grid is on", async () => {
        const fixture = await mount(true);
        const cell = document.querySelector<HTMLElement>("[data-grid-cell]")!;
        cell.focus();
        cell.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "f",
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
          })
        );
        fixture.detectChanges();
        await fixture.whenStable();
        expect(part("find-bar")).not.toBeNull();
      });

      it("draws no find button unless the feature asks for one", async () => {
        const fixture = TestBed.createComponent(Host);
        fixture.componentInstance.features = [findInTable()];
        fixture.detectChanges();
        await fixture.whenStable();
        expect(part("find-button")).toBeNull();
        expect(part("find-bar")).toBeNull();
      });
    });
  });
}
