import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { expect } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `columnSizing.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function columnSizingTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  return collectConformanceTests(({ describe, it }) => {
    interface Row {
      id: string;
      name: string;
      note: string;
    }
    const ROWS: Row[] = [{ id: "1", name: "Ada", note: "note" }];
    const COLS: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name, minWidth: 120 },
      { key: "note", header: "Note", accessor: (r) => r.note, flex: 2 },
    ];

    /**
     * Flex columns and size-to-container for each adapter.
     *
     * The mechanism is CSS the browser already knows — a fixed table layout with
     * percentage widths — so what each kit has to get right is applying it to its
     * own table element and its own cells.
     */
    describe(`column sizing (${kit.name})`, () => {
      const table = (extra?: Record<string, unknown>) =>
        render(
          <DataTable
            data={ROWS}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            {...extra}
          />
        );
      const head = (key: string) =>
        document.querySelector<HTMLElement>(
          `thead [data-column-key="${key}"]`
        )!;

      it("carries the bounds a column declares", () => {
        table();
        expect(head("name").style.minWidth).toBe("120px");
      });

      it("gives a flex column its share even without the fitting mode", () => {
        // It asked for a share; the other column keeps its own size.
        table();
        expect(head("note").style.width).toBe("100%");
      });

      it("shares the container between the columns when asked to fit", () => {
        table({ fitColumns: true });
        // Two parts to one: the flex column takes two thirds.
        expect(head("note").style.width).toBe("66.66666666666666%");
        expect(head("name").style.width).toBe("33.33333333333333%");
      });
    });
  });
}
