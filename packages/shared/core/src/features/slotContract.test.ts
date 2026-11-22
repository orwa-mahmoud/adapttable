import { describe, expect, it } from "vitest";

import {
  ACTIVE_FILTER_CHIPS,
  AGENT_APPROVAL,
  BATCH_EDIT_BAR,
  BULK_BAR,
  CHROME_BODY,
  COLUMN_GROUP_TOGGLE,
  COLUMN_HEADER_RENAME,
  COLUMN_LAYOUT_LIVE,
  COLUMN_MENU,
  COLUMN_SELECT,
  COMMAND_PALETTE,
  COMMAND_PALETTE_LIVE,
  CONTEXT_MENU,
  CONTEXT_MENU_LIVE,
  EDITABLE_CELL,
  EDITING_LIVE,
  EXPAND_TOGGLE,
  EXPANSION_LIVE,
  FILL_HANDLE,
  FILTER_CHIPS_LIVE,
  FILTER_DRAWER,
  FILTER_HEADER,
  FILTER_POPOVER,
  FILTERS_FORM,
  FIND_BAR,
  GRID_FOCUS_ANNOUNCER,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  GROUPING_LIVE,
  GROUPING_PANEL,
  KEYED_WINDOW,
  PINNING_LIVE,
  ROW_ACTIONS_LIVE,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_ANNOUNCER,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
  SAVED_VIEWS,
  SELECTION_LIVE,
  SIDE_PANEL,
  STATUS_BAR,
  TABLE_ASSISTANT,
  TOOLBAR_EXTRAS,
  TREE_CELL,
  TREE_LIVE,
  TREE_TOGGLE,
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

describe("the positions every binding fills", () => {
  // Moved from the React binding with their ids and single flags unchanged:
  // a kit already filling one by id must keep landing in the same place.
  it("keeps each id and single flag", () => {
    const table: readonly (readonly [
      { readonly id: string; readonly single?: boolean },
      string,
      true | undefined,
    ])[] = [
      [STATUS_BAR, "status-bar", true],
      [FIND_BAR, "find-bar", true],
      [BATCH_EDIT_BAR, "batch-edit-bar", true],
      [AGENT_APPROVAL, "agent-approval", true],
      [TABLE_ASSISTANT, "table-assistant", true],
      [COMMAND_PALETTE, "command-palette", true],
      [CONTEXT_MENU, "context-menu", true],
      [SIDE_PANEL, "side-panel", true],
      [BULK_BAR, "bulk-bar", true],
      [FILTERS_FORM, "filters-form", true],
      [CHROME_BODY, "chrome-body", true],
      [KEYED_WINDOW, "keyed-window", true],
      [SAVED_VIEWS, "saved-views", true],
      [COMMAND_PALETTE_LIVE, "command-palette-live", true],
      [CONTEXT_MENU_LIVE, "context-menu-live", true],
      [GROUPING_LIVE, "grouping-live", true],
      [GROUPING_PANEL, "grouping-panel", true],
      [TREE_LIVE, "tree-live", true],
      [EXPANSION_LIVE, "expansion-live", true],
      [EDITING_LIVE, "editing-live", true],
      [PINNING_LIVE, "pinning-live", true],
      [FILTER_CHIPS_LIVE, "filter-chips-live", true],
      [COLUMN_LAYOUT_LIVE, "column-layout-live", true],
      [ROW_ACTIONS_LIVE, "row-actions-live", true],
      [SELECTION_LIVE, "selection-live", true],
      [COLUMN_SELECT, "column-select", undefined],
      [GRID_FOCUS_ANNOUNCER, "grid-focus-announcer", true],
      [FILTER_HEADER, "filter-header", true],
      [EDITABLE_CELL, "editable-cell", true],
      [FILL_HANDLE, "fill-handle", undefined],
      [TOOLBAR_EXTRAS, "toolbar-extras", undefined],
      [TREE_CELL, "tree-cell", undefined],
      [TREE_TOGGLE, "tree-toggle", undefined],
      [ROW_EDIT_ACTIONS, "row-edit-actions", true],
      [ROW_REORDER_HANDLE, "row-reorder-handle", undefined],
      [ROW_REORDER_BUTTONS, "row-reorder-buttons", undefined],
      [COLUMN_GROUP_TOGGLE, "column-group-toggle", undefined],
      [GROUP_HEADER_ROW, "group-header-row", undefined],
      [GROUP_HEADER_CARD, "group-header-card", undefined],
    ];
    for (const [key, id, single] of table) {
      expect([key.id, key.single]).toEqual([id, single]);
    }
    expect(new Set(table.map(([, id]) => id)).size).toBe(table.length);
  });
});
