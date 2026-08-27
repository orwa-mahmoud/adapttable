/**
 * A windowed table states the dataset's size even with cell navigation off:
 * only a page of rows is in the DOM, so assistive tech cannot count the rest.
 * Core decides; this proves the mui table element carries it.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { renderMui } from "./test-utils";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(i),
  name: `Name ${i}`,
}));
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

const table = () => document.querySelector("table");
const bodyRows = () => [...document.querySelectorAll("tbody tr")];

function mount(search: string) {
  renderMui(
    <DataTable
      data={ROWS}
      columns={columns}
      rowKey={(r) => r.id}
      urlAdapter={createMemoryAdapter(search)}
      forceMobile={false}
    />
  );
}

describe("windowed table — dataset size (mui)", () => {
  it("states the dataset size and absolute row index without cell navigation", () => {
    mount("limit=2&page=3");
    expect(table()).toHaveAttribute("aria-rowcount", "10");
    // Nothing claims the grid keyboard contract.
    expect(screen.queryByRole("grid")).toBeNull();
    const indices = bodyRows().map((r) => r.getAttribute("aria-rowindex"));
    expect(indices).toContain("5");
    expect(indices).toContain("6");
  });

  it("says nothing when the whole dataset is on the page", () => {
    mount("limit=25");
    expect(table()).not.toHaveAttribute("aria-rowcount");
  });
});
