import { describe, expect, it } from "vitest";

import { EMPTY_COLUMN_LAYOUT } from "../columns/columnLayoutModel";
import {
  type LayoutStorage,
  readStoredColumnLayout,
  sanitizeStoredLayout,
  writeStoredColumnLayout,
} from "./tableStores";

describe("persisted column-group collapse", () => {
  it("round-trips collapsed group IDs through the shared layout codec", () => {
    const values = new Map<string, string>();
    const storage: LayoutStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    };
    const layout = {
      ...EMPTY_COLUMN_LAYOUT,
      collapsedGroups: ["contact", "résumé"],
    };
    writeStoredColumnLayout(storage, "columns", layout, EMPTY_COLUMN_LAYOUT);
    expect(readStoredColumnLayout(storage, "columns")).toEqual(layout);
    writeStoredColumnLayout(
      storage,
      "columns",
      EMPTY_COLUMN_LAYOUT,
      EMPTY_COLUMN_LAYOUT
    );
    expect(values.has("columns")).toBe(false);
  });
  it("discards malformed IDs and omits empty optional group state", () => {
    expect(
      sanitizeStoredLayout({ collapsedGroups: ["contact", null, 3] })
    ).toEqual({ ...EMPTY_COLUMN_LAYOUT, collapsedGroups: ["contact"] });
    expect(sanitizeStoredLayout({ collapsedGroups: "contact" })).toEqual(
      EMPTY_COLUMN_LAYOUT
    );
    expect(sanitizeStoredLayout({ collapsedGroups: [] })).toEqual(
      EMPTY_COLUMN_LAYOUT
    );
  });
});
