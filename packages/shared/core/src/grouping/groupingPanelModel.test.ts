import { describe, expect, it } from "vitest";

import {
  GROUPING_COLUMN_DND_MIME,
  groupingDragKey,
  hasGroupingColumnDrag,
  moveGroupingKey,
  moveGroupingKeyBy,
  removeGroupingKey,
} from "./groupingPanelModel";

describe("grouping panel model", () => {
  it("adds a header at an insertion boundary without duplicates", () => {
    expect(moveGroupingKey(["team", "status"], "country", 1)).toEqual([
      "team",
      "country",
      "status",
    ]);
    expect(moveGroupingKey(["team", "status"], "team", 2)).toEqual([
      "status",
      "team",
    ]);
  });

  it("moves chips by one logical position and withholds invalid moves", () => {
    expect(moveGroupingKeyBy(["team", "status"], "status", -1)).toEqual([
      "status",
      "team",
    ]);
    expect(moveGroupingKeyBy(["team", "status"], "team", -1)).toEqual([
      "team",
      "status",
    ]);
  });

  it("removes one key while preserving the remaining order", () => {
    expect(removeGroupingKey(["team", "status", "country"], "status")).toEqual([
      "team",
      "country",
    ]);
  });

  it("detects and reads the native grouping drag payload", () => {
    const transfer = {
      types: [GROUPING_COLUMN_DND_MIME],
      getData: (type: string) =>
        type === GROUPING_COLUMN_DND_MIME ? "budget" : "",
    };
    expect(hasGroupingColumnDrag({ dataTransfer: transfer as never })).toBe(
      true
    );
    expect(groupingDragKey({ dataTransfer: transfer as never })).toBe("budget");
    expect(
      groupingDragKey({
        dataTransfer: {
          types: [GROUPING_COLUMN_DND_MIME],
          getData: () => "",
        } as never,
      })
    ).toBeUndefined();
    expect(hasGroupingColumnDrag({ dataTransfer: null })).toBe(false);
  });
});
