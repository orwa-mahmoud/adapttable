/**
 * On a mobile card layout there are no column headers to click, so this select
 * is the only way to sort at all. A column with a rendered header and no
 * mobile label has nothing to put in it — offering an option labelled
 * "[object Object]" would be worse than leaving it out.
 */
import { describe, expect, it } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import { deriveSortByOptions } from "./sortByOptions";

interface Row {
  id: string;
}

describe("deriveSortByOptions", () => {
  it("offers one option per labellable sortable column, in column order", () => {
    const columns: ColumnMetadata<Row>[] = [
      { key: "name", header: "Name", sortable: true },
      { key: "team", header: "Team" },
      {
        key: "chip",
        header: { rendered: true },
        mobileLabel: "Chip",
        sortable: true,
      },
      { key: "icon", header: { rendered: true }, sortable: true },
    ];
    expect(deriveSortByOptions(columns)).toEqual([
      { value: "name", label: "Name" },
      { value: "chip", label: "Chip" },
    ]);
  });

  it("offers nothing when no column is sortable", () => {
    expect(deriveSortByOptions([{ key: "name", header: "Name" }])).toEqual([]);
  });
});
