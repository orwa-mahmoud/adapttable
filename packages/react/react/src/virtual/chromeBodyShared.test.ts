/**
 * Shared chrome-body helpers.
 *
 * The virtual and lean paths both size rows through these. A tree walks a
 * different list than the page of rows, so a per-row height has to ask the
 * walked entry — otherwise a folder's children inherit the wrong estimate.
 */
import { DEFAULT_ROW_SIZE_PX } from "@adapttable/core";
import { describe, expect, it } from "vitest";

import type { ComposedTableProps } from "../props";
import type { TableChrome } from "../useTableChrome";
import { estimateBodyItemSize } from "./chromeBodyShared";

interface Row {
  id: string;
}

describe("estimateBodyItemSize", () => {
  it("sizes a tree row from the walked entry, and falls back when the slot is empty", () => {
    const row: Row = { id: "leaf" };
    const chrome = {
      isMobile: false,
      grouping: undefined,
      tree: {
        entries: [
          {
            row,
            key: "leaf",
            level: 0,
            hasChildren: false,
            expanded: false,
            path: [],
          },
        ],
      },
    } as unknown as TableChrome<Row>;
    const sizeOf = estimateBodyItemSize(
      chrome,
      {
        rowHeight: (item: Row) => (item.id === "leaf" ? 52 : 24),
      } as unknown as ComposedTableProps<Row>,
      []
    );
    expect(sizeOf(0)).toBe(52);
    expect(sizeOf(1)).toBe(DEFAULT_ROW_SIZE_PX);
  });
});
