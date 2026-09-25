import { createMemoryAdapter } from "@adapttable/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { multiSort } from "./multi-sort";

interface Row {
  id: string;
  name: string;
  salary: number;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", salary: 300 },
  { id: "2", name: "Ada", salary: 100 },
  { id: "3", name: "Bo", salary: 200 },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "salary", header: "Salary", sortable: true },
];

// antd sorts from the header cell itself.
const header = (name: string) => screen.getByRole("columnheader", { name });

describe("multi-sort after a plain sort (antd)", () => {
  const table = () => {
    const adapter = createMemoryAdapter("");
    render(
      <DataTable<Row>
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlAdapter={adapter}
        features={[multiSort()]}
      />
    );
    return adapter;
  };

  it("click then shift-click keeps the first sort as level one", () => {
    const adapter = table();
    fireEvent.click(header("Name"));
    fireEvent.click(header("Salary"), { shiftKey: true });

    expect(header("Name")).toHaveAttribute("data-sort-index", "1");
    expect(header("Salary")).toHaveAttribute("data-sort-index", "2");
    expect(new URLSearchParams(adapter.getSearch()).get("sort")).toBe(
      "name:asc,salary:asc"
    );
  });

  it("shift-Enter chains the same way", () => {
    const adapter = table();
    fireEvent.click(header("Name"));
    fireEvent.keyDown(header("Salary"), { key: "Enter", shiftKey: true });

    expect(new URLSearchParams(adapter.getSearch()).get("sort")).toBe(
      "name:asc,salary:asc"
    );
  });
});
