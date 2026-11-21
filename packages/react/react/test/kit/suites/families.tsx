import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { fireEvent } from "@testing-library/react";
import { expect, vi } from "vitest";

import { kitComponent, type ReactKitUnderTest } from "../kit";

/**
 * The shared `families.test.tsx` suite: behaviour every React kit shows.
 *
 * A family is every member of an area, built by one call and passed to
 * `features` as one entry. Each test reads the members' own chrome, so a
 * family that dropped a member, or one the table did not unfold, fails here.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function familiesTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { Table: DataTable, render } = kit;
  const editingFamily = kitComponent(kit, "editingFamily");
  const filteringFamily = kitComponent(kit, "filteringFamily");
  const columnLayoutFamily = kitComponent(kit, "columnLayoutFamily");
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
      {
        key: "name",
        header: "Name",
        accessor: (r) => r.name,
        editable: true,
      },
      { key: "team", header: "Team", accessor: (r) => r.team },
    ];

    const part = (name: string) =>
      document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

    const table = (features: unknown) =>
      render(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          features={features as never}
        />
      );

    describe(`feature families (${kit.name})`, () => {
      it("editingFamily edits a cell, marks it until the host confirms, and offers undo", () => {
        const save = vi.fn(() => new Promise<void>(() => undefined));
        table([editingFamily<Row>(save)]);

        expect(part("undo-button")).not.toBeNull();
        fireEvent.doubleClick(part("edit-cell-activate")!);
        const editor = part("edit-cell-editor")!;
        fireEvent.change(editor, { target: { value: "Augusta" } });
        fireEvent.keyDown(editor, { key: "Enter" });

        expect(save).toHaveBeenCalledWith(ROWS[0], "name", "Augusta");
        expect(part("edit-cell-activate")).toHaveAttribute("data-dirty");
      });

      it("filteringFamily draws the filter panel trigger and the header filter triggers", () => {
        table([
          filteringFamily<Row>([
            {
              key: "team",
              type: "select",
              options: [
                { value: "Core", label: "Core" },
                { value: "Web", label: "Web" },
              ],
            },
          ]),
        ]);

        expect(part("filters-button")).not.toBeNull();
        expect(part("filter-header-trigger")).not.toBeNull();
      });

      it("columnLayoutFamily draws the columns menu and resize handles", () => {
        table([columnLayoutFamily()]);

        expect(part("column-menu-button")).not.toBeNull();
        expect(part("resize-handle")).not.toBeNull();
      });

      it("composes two families in one list", () => {
        const save = vi.fn();
        table([columnLayoutFamily(), editingFamily<Row>(save)]);

        expect(part("column-menu-button")).not.toBeNull();
        expect(part("undo-button")).not.toBeNull();
        expect(part("edit-cell-activate")).not.toBeNull();
      });
    });
  });
}
