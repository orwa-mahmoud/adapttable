/**
 * How the showcase groups people, written once for React, Vue and Angular:
 * by team, then status, the largest groups first, each closed by a footer
 * with its budget subtotal. A framework builds the subtotal with its own
 * binding's `aggregate` and supplies only how the total looks.
 */
import type {
  AggregateSpec,
  ColumnMetadata,
  GroupNode,
} from "@adapttable/core";
import { xlsxWriter } from "@adapttable/core/xlsx";

import { budget, type Person } from "../people";

/** The keys the showcase groups by, outermost first. */
export const PEOPLE_GROUP_BY: readonly string[] = ["team", "status"];

/** What each group adds up: its budget. */
export const PEOPLE_GROUP_TOTALS: AggregateSpec = { budget: "sum" };

/**
 * The column the subtotal reads, by the value the table sorts budget by, so
 * it adds the number behind the formatted cell rather than parsing "$1,240".
 */
export const PEOPLE_TOTAL_COLUMNS: readonly ColumnMetadata<Person>[] = [
  { key: "budget", sortValue: (row) => budget(row) },
];

/** The larger group first; a group's size is its leaf rows. */
export function largestGroupsFirst(
  a: GroupNode<Person>,
  b: GroupNode<Person>
): number {
  return b.leafRows.length - a.leafRows.length;
}

/** A subtotal's number, from whatever the aggregate computed. */
export function totalOf(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

/**
 * Export the grouped sheet as a spreadsheet. `scope: "all"` takes every
 * filtered row, so collapsed groups and later pages still leave the file;
 * the writer adds Excel outline levels for each nest and bolds the group
 * headers and totals.
 */
export const GROUPED_XLSX_EXPORT = {
  scope: "all",
  writer: xlsxWriter({ sheetName: "People" }),
  filename: "people.xlsx",
} as const;
