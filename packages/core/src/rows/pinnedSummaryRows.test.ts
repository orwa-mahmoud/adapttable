import { describe, expect, it } from "vitest";

import {
  allPinnedSummaryEntries,
  EMPTY_PINNED_ROWS,
  isPinnedSummaryRowId,
  PINNED_SUMMARY_BOTTOM_PART,
  PINNED_SUMMARY_KEY_PREFIX,
  PINNED_SUMMARY_TOP_PART,
  pinnedSummaryEntries,
  pinnedSummaryPart,
  pinnedSummaryRowId,
  pinnedSummarySideFromId,
  resolvePinnedRows,
} from "./pinnedSummaryRows";

describe("pinned summary rows", () => {
  it("mints namespaced identities that never look like data-row ids", () => {
    expect(pinnedSummaryRowId("top", 0)).toBe(
      `${PINNED_SUMMARY_KEY_PREFIX}:top:0`
    );
    expect(isPinnedSummaryRowId(pinnedSummaryRowId("bottom", 2))).toBe(true);
    expect(isPinnedSummaryRowId("totals")).toBe(false);
  });

  it("treats omitted edges as empty lists", () => {
    expect(resolvePinnedRows(undefined)).toEqual({ top: [], bottom: [] });
    expect(resolvePinnedRows(EMPTY_PINNED_ROWS)).toEqual({
      top: [],
      bottom: [],
    });
    expect(resolvePinnedRows({ top: [{ id: "a" }] })).toEqual({
      top: [{ id: "a" }],
      bottom: [],
    });
  });

  it("keeps host order and names each entry", () => {
    const entries = pinnedSummaryEntries([{ id: "a" }, { id: "b" }], "top");
    expect(entries.map((entry) => entry.id)).toEqual([
      `${PINNED_SUMMARY_KEY_PREFIX}:top:0`,
      `${PINNED_SUMMARY_KEY_PREFIX}:top:1`,
    ]);
    expect(allPinnedSummaryEntries({ bottom: [{ id: "z" }] })).toEqual([
      {
        row: { id: "z" },
        side: "bottom",
        index: 0,
        id: `${PINNED_SUMMARY_KEY_PREFIX}:bottom:0`,
      },
    ]);
  });

  it("names the public part for each edge", () => {
    expect(pinnedSummaryPart("top")).toBe(PINNED_SUMMARY_TOP_PART);
    expect(pinnedSummaryPart("bottom")).toBe(PINNED_SUMMARY_BOTTOM_PART);
    expect(pinnedSummarySideFromId(pinnedSummaryRowId("top", 0))).toBe("top");
    expect(pinnedSummarySideFromId(pinnedSummaryRowId("bottom", 1))).toBe(
      "bottom"
    );
    expect(pinnedSummarySideFromId("1")).toBeUndefined();
  });
});
