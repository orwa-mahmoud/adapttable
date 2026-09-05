import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import { deriveSortByOptions } from "@adapttable/core";

interface Row {
  id: string;
  name: string;
}

describe("deriveSortByOptions", () => {
  it("includes one option per sortable, string-labelled column, in order", () => {
    const columns: ColumnDef<Row>[] = [
      { key: "name", header: "Name", sortable: true },
      { key: "id", header: "ID", sortable: true },
    ];
    expect(deriveSortByOptions(columns)).toEqual([
      { value: "name", label: "Name" },
      { value: "id", label: "ID" },
    ]);
  });

  it("skips non-sortable columns", () => {
    const columns: ColumnDef<Row>[] = [
      { key: "name", header: "Name", sortable: true },
      { key: "id", header: "ID" },
    ];
    expect(deriveSortByOptions(columns)).toEqual([
      { value: "name", label: "Name" },
    ]);
  });

  it("falls back to mobileLabel when the header is not a string", () => {
    const columns: ColumnDef<Row>[] = [
      {
        key: "name",
        header: <span>Name</span>,
        mobileLabel: "Name",
        sortable: true,
      },
    ];
    expect(deriveSortByOptions(columns)).toEqual([
      { value: "name", label: "Name" },
    ]);
  });

  it("skips a sortable column with no string label to show", () => {
    const columns: ColumnDef<Row>[] = [
      { key: "name", header: <span>Name</span>, sortable: true },
    ];
    expect(deriveSortByOptions(columns)).toEqual([]);
  });
});
