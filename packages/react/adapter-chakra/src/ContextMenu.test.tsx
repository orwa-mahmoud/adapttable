import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render } from "@testing-library/react";
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
describe("context menu (chakra)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          contextMenu
          {...extra}
        />
      </ChakraProvider>
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
});
