import { MantineProvider } from "@mantine/core";
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
 * Flex columns and size-to-container for the mantine adapter.
 *
 * The mechanism is CSS the browser already knows — a fixed table layout with
 * percentage widths — so what each kit has to get right is applying it to its
 * own table element and its own cells.
 */
describe("column sizing (mantine)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <MantineProvider>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          {...extra}
        />
      </MantineProvider>
    );

  it("fixes the table layout so those percentages mean something", () => {
    const { container } = table({ fitColumns: true });
    const el = container.querySelector<HTMLElement>("table")!;
    expect(el.style.tableLayout).toBe("fixed");
    expect(el.style.width).toBe("100%");
  });

  it("leaves the table alone without the prop", () => {
    const { container } = table();
    expect(
      container.querySelector<HTMLElement>("table")!.style.tableLayout
    ).toBe("");
  });
});
