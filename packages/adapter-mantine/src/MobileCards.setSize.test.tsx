/**
 * A card list is a real <ul>, so a windowed one states its size the way a list
 * does: `aria-setsize` on each item with its absolute `aria-posinset`. Core
 * decides when the list is a window; this proves the mantine cards carry it.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { renderMantine } from "./test-utils";

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

const cards = () => [
  ...document.querySelectorAll('[data-adapttable-part="card"]'),
];

function mount(search: string) {
  renderMantine(
    <DataTable
      data={ROWS}
      columns={columns}
      rowKey={(r) => r.id}
      urlAdapter={createMemoryAdapter(search)}
      forceMobile
    />
  );
}

describe("windowed card list — position in the set (mantine)", () => {
  it("numbers a page from its absolute position in the dataset", () => {
    mount("limit=2&page=3");
    expect(cards().map((c) => c.getAttribute("aria-posinset"))).toEqual([
      "5",
      "6",
    ]);
    expect(cards().map((c) => c.getAttribute("aria-setsize"))).toEqual([
      "10",
      "10",
    ]);
  });

  it("says nothing when every card is already in the list", () => {
    mount("limit=25");
    expect(cards()).toHaveLength(10);
    expect(cards()[0]).not.toHaveAttribute("aria-posinset");
    expect(cards()[0]).not.toHaveAttribute("aria-setsize");
  });
});
