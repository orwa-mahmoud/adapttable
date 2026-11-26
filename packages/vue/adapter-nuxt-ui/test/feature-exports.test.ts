import { describe, expect, it } from "vitest";

import * as base from "../src";
import * as cellNavigationEntry from "../src/cell-navigation";
import { columnSelectionCheckbox } from "../src/column-selection";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { rowReorder } from "../src/row-reorder";
import { savedViews, SavedViewsPanel } from "../src/saved-views";
import { sidePanel } from "../src/side-panel";

describe("Nuxt optional feature exports", () => {
  it("serves column selection from its own entry and keeps optional factories out of the base", () => {
    expect(columnSelectionCheckbox().id).toBe("column-selection-checkbox");
    expect(Object.hasOwn(cellNavigationEntry, "columnSelectionCheckbox")).toBe(
      false
    );
    for (const name of [
      "columnSelectionCheckbox",
      "commandPalette",
      "contextMenu",
      "rowReorder",
      "savedViews",
      "SavedViewsPanel",
      "sidePanel",
    ])
      expect(Object.hasOwn(base, name)).toBe(false);
    for (const factory of [
      commandPalette,
      contextMenu,
      rowReorder,
      savedViews,
      sidePanel,
    ])
      expect(typeof factory).toBe("function");
    expect(SavedViewsPanel).toBeDefined();
  });
});
