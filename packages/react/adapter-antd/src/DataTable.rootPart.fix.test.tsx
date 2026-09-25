import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderAntd } from "./test-utils";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "A" },
  { id: "2", name: "B" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

describe("antd root part", () => {
  it.each([
    ["desktop", false],
    ["mobile", true],
  ])("names the table root `root` (%s)", (_mode, forceMobile) => {
    const { container } = renderAntd(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={forceMobile}
        className="host-root"
      />
    );

    const roots = container.querySelectorAll('[data-adapttable-part="root"]');
    expect(roots).toHaveLength(1);
    const root = roots[0]!;
    // The same element that carries the host's className and wraps the toolbar.
    expect(root).toHaveClass("host-root");
    expect(
      root.querySelector('[data-adapttable-part="toolbar"]')
    ).not.toBeNull();
  });
});
