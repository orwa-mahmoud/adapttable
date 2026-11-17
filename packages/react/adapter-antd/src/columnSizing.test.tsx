import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { columnSizingTests } from "../../react/test/kit/suites/columnSizing";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

for (const test of columnSizingTests(kit)) it(test.name, test.run);

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
 * Flex columns and size-to-container for the mui adapter.
 *
 * The mechanism is CSS the browser already knows — a fixed table layout with
 * percentage widths — so what each kit has to get right is applying it to its
 * own table element and its own cells.
 */
describe("column sizing (antd)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        {...extra}
      />
    );
  const head = (key: string) =>
    document.querySelector<HTMLElement>(`thead [data-column-key="${key}"]`)!;

  it("leaves the table layout to antd's own Table", () => {
    // This adapter renders through antd's <Table>, which sets its own layout
    // mode; the per-column widths, bounds and shares still apply.
    const { container } = table({ fitColumns: true });
    expect(container.querySelector("table")).not.toBeNull();
    expect(head("note").style.width).toBe("66.66666666666666%");
  });
});
