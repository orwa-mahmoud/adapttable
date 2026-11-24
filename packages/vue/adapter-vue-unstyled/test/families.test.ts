import { describe, expect, it } from "vitest";

import { columnLayoutFamily } from "../src/column-layout";
import { editingFamily } from "../src/editing";
import { filteringFamily } from "../src/filtering";

describe("feature families", () => {
  it("publishes filtering, column layout and editing from their entries", () => {
    expect(filteringFamily([]).map((feature) => feature.id)).toEqual([
      "filters",
      "header-filters",
    ]);
    expect(columnLayoutFamily().map((feature) => feature.id)).toEqual([
      "column-menu",
      "resizable-columns",
      "fit-columns",
    ]);
    expect(editingFamily(() => undefined).map((feature) => feature.id)).toEqual(
      ["editing", "dirty-indicators", "edit-history", "undo-redo-buttons"]
    );
  });
});
