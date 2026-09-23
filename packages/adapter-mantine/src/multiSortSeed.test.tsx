import { createMemoryAdapter } from "@adapttable/react";
import { MantineProvider } from "@mantine/core";
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

const sortButton = (header: string) =>
  screen.getByRole("button", { name: `Sort by: ${header}` });

describe("multi-sort after a plain sort (mantine)", () => {
  const table = () => {
    const adapter = createMemoryAdapter("");
    render(
      <MantineProvider>
        <DataTable<Row>
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlAdapter={adapter}
          features={[multiSort()]}
        />
      </MantineProvider>
    );
    return adapter;
  };

  it("click then shift-click keeps the first sort as level one", () => {
    const adapter = table();
    fireEvent.click(sortButton("Name"));
    fireEvent.click(sortButton("Salary"), { shiftKey: true });

    expect(sortButton("Name").closest("th")).toHaveAttribute(
      "data-sort-index",
      "1"
    );
    expect(sortButton("Salary").closest("th")).toHaveAttribute(
      "data-sort-index",
      "2"
    );
    expect(new URLSearchParams(adapter.getSearch()).get("sort")).toBe(
      "name:asc,salary:asc"
    );
  });

  it("shift-Enter chains the same way", () => {
    const adapter = table();
    fireEvent.click(sortButton("Name"));
    // A keyboard-activated click: Enter on a focused button, detail 0.
    fireEvent.click(sortButton("Salary"), { shiftKey: true, detail: 0 });

    expect(new URLSearchParams(adapter.getSearch()).get("sort")).toBe(
      "name:asc,salary:asc"
    );
  });
});
