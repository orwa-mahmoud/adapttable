import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { contextMenuTests } from "../../react/test/kit/suites/contextMenu";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

for (const test of contextMenuTests(kit)) it(test.name, test.run);

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
];

/**
 * The context menu, opened the ways a user opens one.
 *
 * The binding is the part that fails silently: forget to spread
 * `regionProps` and nothing happens, with no error and nothing in the DOM.
 * So every route is exercised against a real table rather than trusted.
 */
describe("context menu (base-ui)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          contextMenu
          {...extra}
        />
      </>
    );

  const menu = () =>
    document.querySelector('[data-adapttable-part="context-menu"]');

  it("renders nothing at all when the prop is absent", () => {
    table({ contextMenu: undefined });
    fireEvent.contextMenu(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { clientX: 5, clientY: 5 }
    );

    expect(menu()).toBeNull();
  });

  it("closes when the surface is dismissed", async () => {
    table();
    fireEvent.contextMenu(screen.getByText("Ada"));
    expect(menu()).not.toBeNull();

    // Escape is the overlay's own dismissal, and it has to reach the table's
    // close callback or the menu stays open over a table it no longer tracks.
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });

    await waitFor(() => {
      expect(menu()).toBeNull();
    });
  });
});
