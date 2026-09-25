import { describe, expect, it } from "vitest";

import {
  ACTIVE_FILTER_CHIPS,
  COLUMN_HEADER_RENAME,
  COLUMN_MENU,
  EXPAND_TOGGLE,
  FILTER_DRAWER,
  FILTER_POPOVER,
  ROW_REORDER_ANNOUNCER,
} from "./slotContract";

describe("the slot contract", () => {
  // The ids are what every kit fills, in every framework: renaming one
  // silently empties that position in every adapter.
  it("names each position with the id kits fill, as one element", () => {
    expect(
      [
        COLUMN_MENU,
        COLUMN_HEADER_RENAME,
        ACTIVE_FILTER_CHIPS,
        FILTER_DRAWER,
        FILTER_POPOVER,
        EXPAND_TOGGLE,
        ROW_REORDER_ANNOUNCER,
      ].map((key) => [key.id, key.single])
    ).toEqual([
      ["column-menu", true],
      ["column-header-rename", true],
      ["active-filter-chips", true],
      ["filter-drawer", true],
      ["filter-popover", true],
      ["expand-toggle", true],
      ["row-reorder-announcer", true],
    ]);
  });
});
