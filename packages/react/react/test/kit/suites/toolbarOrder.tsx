import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { screen } from "@testing-library/react";
import { expect, vi } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `toolbarOrder.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function toolbarOrderTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  const {
    columnMenu,
    densityChooser,
    editHistory,
    editing,
    exportCsv,
    filters: filtersFeature,
    print,
    savedViews,
    undoRedoButtons,
  } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    /**
     * The toolbar reads Filters · Saved views · Columns · Export CSV. Every
     * adapter mounts these through core's named chrome slots, so this order is
     * the same in all of them — assert it here, in each, or it drifts unseen.
     */
    interface Row {
      id: string;
      name: string;
    }
    const rows: Row[] = [{ id: "a", name: "Alice" }];
    const columns: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name },
    ];

    describe(`toolbar order (${kit.name})`, () => {
      it("renders Filters, Saved views, Columns, then Export CSV", () => {
        render(
          <DataTable
            data={rows}
            columns={columns}
            rowKey={(r) => r.id}
            urlSync={false}
            filters={[{ key: "name", type: "text" }]}
            enableColumnMenu
            features={[
              columnMenu(),
              filtersFeature<Row>([{ key: "name", type: "text" }]),
              savedViews({ storageKey: "order-test" }),
              exportCsv<Row>(),
            ]}
            exportCsv
            savedViews={{ storageKey: "order-test" }}
          />
        );

        const wanted = ["Filters", "Saved views", "Columns", "Export CSV"];
        const buttons = screen.getAllByRole("button");
        const seen = buttons
          .map((b) => (b.textContent ?? "").trim())
          .filter((text) => wanted.includes(text));

        expect(seen).toEqual(wanted);
      });
      it("draws Undo and Redo after Export and Print, like every kit", () => {
        render(
          <DataTable
            data={rows}
            columns={[{ key: "name", header: "Name", editable: true }]}
            rowKey={(r) => r.id}
            urlSync={false}
            forceMobile={false}
            features={[
              editHistory(),
              densityChooser(),
              exportCsv<Row>(),
              print(vi.fn(), true),
              undoRedoButtons(),
              editing(vi.fn()),
            ]}
          />
        );

        const part = (name: string) =>
          document.querySelector(`[data-adapttable-part="${name}"]`);
        const order = [
          "export-csv-button",
          "print-button",
          "undo-button",
          "redo-button",
        ].map((name) => {
          const node = part(name);
          expect(node, name).not.toBeNull();
          return node;
        });
        for (let index = 1; index < order.length; index++) {
          const earlier = order[index - 1]!;
          const later = order[index]!;
          expect(
            earlier.compareDocumentPosition(later) &
              Node.DOCUMENT_POSITION_FOLLOWING
          ).toBeTruthy();
        }
      });
    });
  });
}
