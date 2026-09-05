/**
 * The group header row's shape.
 *
 * The case that matters is the one that shipped wrong: a subtotal must land in
 * its own column's cell, not at the end of a spanning row where a wide table
 * puts it past the visible edge.
 */
import type { ColumnMetadata } from "../columnModel";
import { describe, expect, it } from "vitest";

import {
  groupAggregateEntries,
  groupLeafCount,
  groupRowLayout,
} from "./groupRowLayout";

interface Row {
  name: string;
}
const COLUMNS: ColumnMetadata<Row>[] = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "status", header: "Status" },
  { key: "budget", header: "Budget" },
  { key: "load", header: "Load" },
];

const keys = (columns: readonly ColumnMetadata<Row>[]) =>
  columns.map((c) => c.key);

describe("groupRowLayout", () => {
  it("stays one spanning cell when there is nothing to align", () => {
    const layout = groupRowLayout<Row>(COLUMNS, undefined);
    expect(keys(layout.labelColumns)).toEqual([
      "name",
      "email",
      "status",
      "budget",
      "load",
    ]);
    expect(layout.cells).toEqual([]);
  });

  it("gives every column after the label its own cell", () => {
    // The label spans up to the first aggregate; from there each column gets a
    // cell so the number sits under the column it totals.
    const layout = groupRowLayout<Row>(COLUMNS, { budget: "$414,300" });
    expect(keys(layout.labelColumns)).toEqual(["name", "email", "status"]);
    expect(layout.cells.map((cell) => [cell.column.key, cell.node])).toEqual([
      ["budget", "$414,300"],
      ["load", undefined],
    ]);
  });

  it("keeps a cell empty for a column with no aggregate", () => {
    const layout = groupRowLayout<Row>(COLUMNS, { load: "78%" });
    expect(keys(layout.labelColumns)).toEqual([
      "name",
      "email",
      "status",
      "budget",
    ]);
    expect(layout.cells.map((cell) => cell.node)).toEqual(["78%"]);
  });

  it("places several aggregates each under its own column", () => {
    const layout = groupRowLayout<Row>(COLUMNS, {
      status: "6",
      budget: "$1",
      load: "9%",
    });
    expect(keys(layout.labelColumns)).toEqual(["name", "email"]);
    expect(layout.cells.map((cell) => [cell.column.key, cell.node])).toEqual([
      ["status", "6"],
      ["budget", "$1"],
      ["load", "9%"],
    ]);
  });

  it("shares the first cell when the first column is the one with a number", () => {
    // The label has to live somewhere, so it keeps the first column and the
    // aggregate joins it there rather than being dropped.
    const layout = groupRowLayout<Row>(COLUMNS, { name: "6 people" });
    expect(keys(layout.labelColumns)).toEqual(["name"]);
    expect(layout.labelAggregates.map((cell) => cell.node)).toEqual([
      "6 people",
    ]);
    expect(layout.cells.map((cell) => cell.column.key)).toEqual([
      "email",
      "status",
      "budget",
      "load",
    ]);
  });

  it("ignores an aggregate for a column that is not rendered", () => {
    // A hidden column's number has nowhere to go, and inventing a cell for it
    // would shift every other cell out from under its column.
    const layout = groupRowLayout<Row>(COLUMNS, { secret: "hidden" });
    expect(layout.cells).toEqual([]);
    expect(keys(layout.labelColumns)).toHaveLength(5);
  });
});

describe("groupAggregateEntries", () => {
  it("lists only the columns that have a number, in column order", () => {
    // A card has no columns to align to, so empty cells would be noise.
    const entries = groupAggregateEntries<Row>(COLUMNS, {
      load: "78%",
      budget: "$1",
    });
    expect(entries.map((entry) => [entry.column.key, entry.node])).toEqual([
      ["budget", "$1"],
      ["load", "78%"],
    ]);
  });

  it("is empty when the group has no aggregates", () => {
    expect(groupAggregateEntries<Row>(COLUMNS, undefined)).toEqual([]);
  });
});

describe("groupLeafCount", () => {
  it("prefers the server's count over the page of leaves in hand", () => {
    expect(groupLeafCount({ leafIds: ["a", "b"], serverCount: 4000 })).toBe(
      4000
    );
    expect(groupLeafCount({ leafIds: ["a", "b"] })).toBe(2);
  });
});
