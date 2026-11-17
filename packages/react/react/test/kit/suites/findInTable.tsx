import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { act, fireEvent, screen } from "@testing-library/react";
import { expect } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `findInTable.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function findInTableTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  const { cellNavigation, findInTable } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    interface Row {
      id: string;
      name: string;
      team: string;
    }
    const ROWS: Row[] = [
      { id: "1", name: "Ada", team: "Core" },
      { id: "2", name: "Grace", team: "Web" },
    ];
    const COLS: ColumnDef<Row>[] = [
      { key: "name", header: "N", accessor: (r) => r.name },
      { key: "team", header: "T", accessor: (r) => r.team },
    ];

    /**
     * Find in table for each adapter.
     *
     * Core owns the search and the bar; each adapter has to render the bar, mark
     * the hits on its own cells, and hand Ctrl/Cmd+F to the grid.
     */
    describe(`find in table (${kit.name})`, () => {
      const table = (extra?: Record<string, unknown>) =>
        render(
          <DataTable
            data={ROWS}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            cellNavigation
            features={[findInTable(), cellNavigation()]}
            {...extra}
          />
        );
      const cell = (row: number, col: number) =>
        document.querySelector<HTMLElement>(
          `[data-grid-cell="${row}:${col}"]`
        )!;
      const bar = () =>
        document.querySelector('[data-adapttable-part="find-bar"]');
      const input = () =>
        document.querySelector<HTMLInputElement>(
          '[data-adapttable-part="find-input"]'
        )!;

      it("opens on Ctrl/Cmd+F and marks what it finds", () => {
        table({ findInTable: true });
        act(() => cell(0, 0).focus());
        fireEvent.keyDown(cell(0, 0), { key: "f", ctrlKey: true });
        expect(bar()).not.toBeNull();
        fireEvent.change(input(), { target: { value: "ace" } });
        // Only Grace matches, and the walk is standing on it.
        expect(document.querySelectorAll("[data-cell-match]")).toHaveLength(1);
        expect(cell(1, 0).hasAttribute("data-cell-match-current")).toBe(true);
        expect(screen.getByText("1 of 1")).toBeInTheDocument();
      });

      it("walks the hits and wraps", () => {
        table({ findInTable: true });
        act(() => cell(0, 0).focus());
        fireEvent.keyDown(cell(0, 0), { key: "f", ctrlKey: true });
        fireEvent.change(input(), { target: { value: "e" } });
        const total = document.querySelectorAll("[data-cell-match]").length;
        expect(total).toBeGreaterThan(1);
        fireEvent.click(
          document.querySelector('[data-adapttable-part="find-next"]')!
        );
        expect(screen.getByText(`2 of ${total}`)).toBeInTheDocument();
      });

      it("closes on Escape, leaving no cell marked", () => {
        table({ findInTable: true });
        act(() => cell(0, 0).focus());
        fireEvent.keyDown(cell(0, 0), { key: "f", ctrlKey: true });
        fireEvent.change(input(), { target: { value: "ace" } });
        fireEvent.keyDown(input(), { key: "Escape" });
        expect(bar()).toBeNull();
        expect(document.querySelectorAll("[data-cell-match]")).toHaveLength(0);
      });

      it("leaves Ctrl/Cmd+F to the browser without the prop", () => {
        // The feature is composed here — the import brings the bar's code — so
        // this is the prop, on its own, still deciding that nothing opens.
        table({ findInTable: false });
        act(() => cell(0, 0).focus());
        fireEvent.keyDown(cell(0, 0), { key: "f", ctrlKey: true });
        expect(bar()).toBeNull();
      });

      it("draws no find bar when the feature was never imported", () => {
        render(
          <DataTable
            data={ROWS}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            cellNavigation
            findInTable
          />
        );
        expect(bar()).toBeNull();
      });
    });
  });
}
