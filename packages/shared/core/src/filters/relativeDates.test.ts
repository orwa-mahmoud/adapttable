import { describe, expect, it } from "vitest";

import { defaultLabels } from "../labels";
import {
  countedRelativeToken,
  isRelativeDateToken,
  joinRelativeToken,
  parseRelativeToken,
  relativeTokenLabel,
  resolveRelativeRange,
  splitRelativeToken,
} from "./relativeDates";

/** Wednesday 2026-08-12 15:00 local — a mid-week, mid-month instant. */
const NOW = new Date(2026, 7, 12, 15, 0, 0);

describe("parseRelativeToken", () => {
  it("accepts named windows and counted last/next", () => {
    expect(parseRelativeToken("today")).toBe("today");
    expect(parseRelativeToken("last:7")).toBe("last:7");
    expect(parseRelativeToken("next:3")).toBe("next:3");
    expect(parseRelativeToken("2026-08-12")).toBeUndefined();
    expect(parseRelativeToken("last:0")).toBeUndefined();
    expect(isRelativeDateToken("thisMonth")).toBe(true);
    expect(isRelativeDateToken("08-12")).toBe(false);
  });
});

describe("resolveRelativeRange", () => {
  it("resolves named days against the given now, not the clock", () => {
    const today = resolveRelativeRange("today", NOW)!;
    expect(new Date(today.startMs)).toEqual(new Date(2026, 7, 12));
    expect(today.endMs - today.startMs).toBe(86_400_000 - 1);

    const yesterday = resolveRelativeRange("yesterday", NOW)!;
    expect(new Date(yesterday.startMs)).toEqual(new Date(2026, 7, 11));

    const tomorrow = resolveRelativeRange("tomorrow", NOW)!;
    expect(new Date(tomorrow.startMs)).toEqual(new Date(2026, 7, 13));
  });

  it("uses ISO weeks (Monday) and calendar months", () => {
    const week = resolveRelativeRange("thisWeek", NOW)!;
    expect(new Date(week.startMs)).toEqual(new Date(2026, 7, 10));
    expect(new Date(week.endMs).getDate()).toBe(16);

    const month = resolveRelativeRange("thisMonth", NOW)!;
    expect(new Date(month.startMs)).toEqual(new Date(2026, 7, 1));
    expect(new Date(month.endMs).getDate()).toBe(31);

    const prev = resolveRelativeRange("previousMonth", NOW)!;
    expect(new Date(prev.startMs)).toEqual(new Date(2026, 6, 1));
    expect(new Date(prev.endMs).getDate()).toBe(31);
  });

  it("counts last/next N days including today", () => {
    const last7 = resolveRelativeRange("last:7", NOW)!;
    expect(new Date(last7.startMs)).toEqual(new Date(2026, 7, 6));
    expect(new Date(last7.endMs).getDate()).toBe(12);

    const next3 = resolveRelativeRange("next:3", NOW)!;
    expect(new Date(next3.startMs)).toEqual(new Date(2026, 7, 12));
    expect(new Date(next3.endMs).getDate()).toBe(14);
  });

  it("rejects unknown tokens so an ISO date is never a window", () => {
    expect(resolveRelativeRange("2026-08-12", NOW)).toBeUndefined();
    expect(countedRelativeToken("last", 0)).toBe("last:1");
  });
});

describe("relativeTokenLabel", () => {
  it("fills N into the last/next wording", () => {
    expect(relativeTokenLabel("last:7", defaultLabels)).toBe("Last 7 days");
    expect(relativeTokenLabel("next:3", defaultLabels)).toBe("Next 3 days");
    expect(relativeTokenLabel("today", defaultLabels)).toBe("Today");
  });
});

describe("splitRelativeToken / joinRelativeToken", () => {
  it("round-trips named and counted tokens", () => {
    expect(splitRelativeToken("thisWeek")).toEqual({
      preset: "thisWeek",
      n: 7,
    });
    expect(splitRelativeToken("last:14")).toEqual({ preset: "last", n: 14 });
    expect(splitRelativeToken("next:3")).toEqual({ preset: "next", n: 3 });
    expect(joinRelativeToken("next", 3)).toBe("next:3");
    expect(joinRelativeToken("today", 99)).toBe("today");
    expect(splitRelativeToken("2026-08-12")).toEqual({
      preset: "today",
      n: 7,
    });
  });
});
