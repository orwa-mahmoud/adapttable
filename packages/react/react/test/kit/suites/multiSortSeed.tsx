import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef, createMemoryAdapter } from "@adapttable/react";
import { fireEvent, screen } from "@testing-library/react";
import { expect } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `multiSortSeed.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function multiSortSeedTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  const { multiSort } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    interface Row {
      id: string;
      name: string;
      salary: number;
    }
    const ROWS: Row[] = [
      { id: "1", name: "Ada", salary: 300 },
      { id: "2", name: "Ada", salary: 100 },
      { id: "3", name: "Bo", salary: 200 },
    ];
    const COLS: ColumnDef<Row>[] = [
      { key: "name", header: "Name", sortable: true },
      { key: "salary", header: "Salary", sortable: true },
    ];

    const sortButton = (header: string) =>
      screen.getByRole("button", { name: `Sort by: ${header}` });

    describe(`multi-sort after a plain sort (${kit.name})`, () => {
      const table = () => {
        const adapter = createMemoryAdapter("");
        render(
          <DataTable<Row>
            data={ROWS}
            columns={COLS}
            rowKey={(r) => r.id}
            urlAdapter={adapter}
            features={[multiSort()]}
          />
        );
        return adapter;
      };

      it("click then shift-click keeps the first sort as level one", () => {
        const adapter = table();
        fireEvent.click(sortButton("Name"));
        fireEvent.click(sortButton("Salary"), { shiftKey: true });

        expect(sortButton("Name").closest("th")).toHaveAttribute(
          "data-sort-index",
          "1"
        );
        expect(sortButton("Salary").closest("th")).toHaveAttribute(
          "data-sort-index",
          "2"
        );
        expect(new URLSearchParams(adapter.getSearch()).get("sort")).toBe(
          "name:asc,salary:asc"
        );
      });

      it("shift-Enter chains the same way", () => {
        const adapter = table();
        fireEvent.click(sortButton("Name"));
        // A keyboard-activated click: Enter on a focused button, detail 0.
        fireEvent.click(sortButton("Salary"), { shiftKey: true, detail: 0 });

        expect(new URLSearchParams(adapter.getSearch()).get("sort")).toBe(
          "name:asc,salary:asc"
        );
      });
    });
  });
}
