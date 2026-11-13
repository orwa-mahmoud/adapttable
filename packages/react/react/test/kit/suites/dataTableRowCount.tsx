import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef, createMemoryAdapter } from "@adapttable/react";
import { screen } from "@testing-library/react";
import { expect } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `DataTable.rowCount.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function dataTableRowCountTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  return collectConformanceTests(({ describe, it }) => {
    /**
     * A windowed table states the dataset's size even with cell navigation off:
     * only a page of rows is in the DOM, so assistive tech cannot count the rest.
     * Core decides; this proves the each kit table element carries it.
     */

    interface Row {
      id: string;
      name: string;
    }
    const ROWS: Row[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `Name ${i}`,
    }));
    const columns: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
    ];

    const table = () => document.querySelector("table");
    const bodyRows = () => [...document.querySelectorAll("tbody tr")];

    function mount(search: string) {
      render(
        <DataTable
          data={ROWS}
          columns={columns}
          rowKey={(r) => r.id}
          urlAdapter={createMemoryAdapter(search)}
          forceMobile={false}
        />
      );
    }

    describe(`windowed table — dataset size (${kit.name})`, () => {
      it("states the dataset size and absolute row index without cell navigation", () => {
        mount("limit=2&page=3");
        expect(table()).toHaveAttribute("aria-rowcount", "10");
        // Nothing claims the grid keyboard contract.
        expect(screen.queryByRole("grid")).toBeNull();
        const indices = bodyRows().map((r) => r.getAttribute("aria-rowindex"));
        expect(indices).toContain("5");
        expect(indices).toContain("6");
      });

      it("says nothing when the whole dataset is on the page", () => {
        mount("limit=25");
        expect(table()).not.toHaveAttribute("aria-rowcount");
      });
    });
  });
}
