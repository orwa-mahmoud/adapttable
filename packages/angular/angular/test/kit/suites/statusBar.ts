import { type AdaptTableFeature, type ColumnDef } from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect } from "vitest";

import { type AngularKitUnderTest } from "../kit";

/**
 * The shared `statusBar.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function statusBarTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { cellNavigation, grouping, selectionStats, statusBar } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    /**
     * The each kit status bar: row counts, a selected row, and the figures.
     */

    interface Row {
      id: string;
      name: string;
      amount: number;
    }

    const part = (name: string) =>
      document.querySelector<HTMLElement>(kitSelector(name));

    describe("statusBar", () => {
      it("is a feature", () => {
        expect(statusBar()).toBeTruthy();
        expect(selectionStats()).toBeTruthy();
      });
    });

    interface Task extends Row {
      team: string;
    }

    const TASKS: Task[] = [
      { id: "1", name: "Ada", amount: 10, team: "Core" },
      { id: "2", name: "Zoe", amount: 30, team: "Web" },
    ];

    const TASK_COLUMNS: ColumnDef<Task>[] = [
      {
        key: "name",
        header: "Name",
        accessor: (row) => row.name,
        editable: true,
      },
      { key: "amount", header: "Amount", accessor: (row) => row.amount },
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
          [features]="features()"
        />
      `,
    })
    class StripHost {
      readonly rows = TASKS;
      readonly columns = TASK_COLUMNS;
      readonly rowKey = (row: Task) => row.id;
      readonly features = input<readonly AdaptTableFeature[]>([]);
    }

    describe("status bar notices", () => {
      it("groups, aggregates a selection, and follows the grid", async () => {
        const grouped = TestBed.createComponent(StripHost);
        grouped.componentRef.setInput("features", [
          statusBar(),
          selectionStats(),
          grouping("team", { rowReorder: true } as never),
        ]);
        document.body.append(grouped.nativeElement);
        grouped.detectChanges();
        await grouped.whenStable();
        expect(part("status-bar")?.textContent).toContain("Showing");
        grouped.destroy();

        const ranged = TestBed.createComponent(StripHost);
        ranged.componentRef.setInput("features", [
          statusBar(),
          selectionStats(),
          grouping(["team"]),
          cellNavigation(),
        ]);
        document.body.append(ranged.nativeElement);
        ranged.detectChanges();
        await ranged.whenStable();
        expect(part("status-bar")).not.toBeNull();
        ranged.destroy();
      });
    });
  });
}
