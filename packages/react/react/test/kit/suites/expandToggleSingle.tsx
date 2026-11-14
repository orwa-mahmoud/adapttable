import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { fireEvent } from "@testing-library/react";
import { expect } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `expandToggle.single.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function expandToggleSingleTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { Table: DataTable, render } = kit;
  const { nestedTable, rowDetail } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    interface Row {
      id: string;
      name: string;
    }

    const ROWS: Row[] = [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ];
    const columns: ColumnDef<Row>[] = [{ key: "name", header: "Name" }];

    const toggles = () =>
      document.querySelectorAll<HTMLElement>("tbody button[aria-expanded]");

    /**
     * `rowDetail` and `nestedTable` fill the same expand control, and a row opens
     * one panel — so composing both draws one control per row, not two.
     */
    describe(`one expand toggle (${kit.name})`, () => {
      it("draws a single toggle per row when both are composed", () => {
        render(
          <DataTable<Row>
            data={ROWS}
            columns={columns}
            rowKey={(r) => r.id}
            urlSync={false}
            forceMobile={false}
            features={[
              rowDetail<Row>((row) => <div>Detail for {row.name}</div>),
              nestedTable<Row>((row) => ({
                label: `Orders for ${row.name}`,
                table: () => <div>Nested for {row.name}</div>,
              })),
            ]}
          />
        );
        expect(toggles()).toHaveLength(ROWS.length);
        fireEvent.click(toggles()[0]!);
        expect(toggles()[0]).toHaveAttribute("aria-expanded", "true");
      });

      it("draws one toggle per row for either feature alone", () => {
        render(
          <DataTable<Row>
            data={ROWS}
            columns={columns}
            rowKey={(r) => r.id}
            urlSync={false}
            forceMobile={false}
            features={[
              rowDetail<Row>((row) => <div>Detail for {row.name}</div>),
            ]}
          />
        );
        expect(toggles()).toHaveLength(ROWS.length);
      });
    });
  });
}
