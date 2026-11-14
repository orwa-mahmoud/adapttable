import { fireEvent, render, screen } from "@testing-library/react";
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
describe("context menu (unstyled)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        contextMenu
        {...extra}
      />
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

  it("runs a built-in item and closes", () => {
    table();
    fireEvent.contextMenu(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { clientX: 5, clientY: 5 }
    );
    fireEvent.click(screen.getByText("Sort ascending"));
    expect(menu()).toBeNull();
  });

  it("walks entries with the arrow keys and closes on an outside click", () => {
    table();
    fireEvent.contextMenu(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { clientX: 5, clientY: 5 }
    );
    const menuEl = menu()!;
    fireEvent.keyDown(menuEl, { key: "ArrowDown" });
    fireEvent.keyDown(menuEl, { key: "ArrowUp" });
    fireEvent.mouseDown(document.body);
    expect(menu()).toBeNull();
  });

  it("hides a column from the menu", () => {
    table();
    fireEvent.contextMenu(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { clientX: 5, clientY: 5 }
    );
    fireEvent.click(screen.getByText("Hide column"));
    expect(document.querySelector('[data-column-key="name"]')).toBeNull();
  });

  it("opens filters from the menu when the column can filter", () => {
    table({
      columns: [
        {
          key: "name",
          header: "Name",
          accessor: (r: Row) => r.name,
          sortable: true,
          filter: "text",
        },
      ],
    });
    fireEvent.contextMenu(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { clientX: 5, clientY: 5 }
    );
    fireEvent.click(screen.getByText("Filter column"));
    expect(menu()).toBeNull();
  });

  it("copies from a cell menu", () => {
    table({ cellNavigation: true });
    fireEvent.contextMenu(
      document.querySelector('[data-adapttable-part="cell"]')!,
      { clientX: 5, clientY: 5 }
    );
    fireEvent.click(screen.getByText("Copy"));
    expect(menu()).toBeNull();
  });
});
