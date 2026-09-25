/**
 * The grouping keys, in every form they arrive in.
 */
import { describe, expect, it } from "vitest";

import { formatGroupBy, parseGroupBy } from "./groupKeys";

describe("parseGroupBy", () => {
  it("reads one key, a list, and a comma-separated string alike", () => {
    expect(parseGroupBy("team")).toEqual(["team"]);
    expect(parseGroupBy(["team", "status"])).toEqual(["team", "status"]);
    expect(parseGroupBy("team,status")).toEqual(["team", "status"]);
  });

  it("has no keys for nothing", () => {
    expect(parseGroupBy(null)).toEqual([]);
    expect(parseGroupBy(undefined)).toEqual([]);
    expect(parseGroupBy("")).toEqual([]);
    expect(parseGroupBy([])).toEqual([]);
  });

  it("drops blanks rather than grouping on them", () => {
    // A trailing comma is a typo, not a request to group by a nameless column.
    expect(parseGroupBy("team, ,status,")).toEqual(["team", "status"]);
  });
});

describe("formatGroupBy", () => {
  it("writes the keys as the single string state is stored as", () => {
    expect(formatGroupBy(["team", "status"])).toBe("team,status");
    expect(formatGroupBy("team")).toBe("team");
  });

  it("is nothing when nothing is grouped", () => {
    expect(formatGroupBy([])).toBeUndefined();
    expect(formatGroupBy(null)).toBeUndefined();
  });
});
