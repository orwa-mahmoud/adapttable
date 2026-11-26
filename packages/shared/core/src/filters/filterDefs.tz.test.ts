/**
 * Date filters in named time zones. These specs switch `process.env.TZ`, which
 * only takes effect in a forked worker, so they run in core's `timezones`
 * project.
 */
import { describe, expect, it } from "vitest";

import { defaultFilterRegistry } from "./filterBuiltins";
import { type FilterDef, filterPredicate } from "./filterDefs";

function pred<T>(def: FilterDef<T>) {
  return filterPredicate(def, defaultFilterRegistry);
}

describe("filterPredicate in named time zones", () => {
  it("dateRange: boundary-day rows survive in UTC+4 and UTC-8 alike", () => {
    const originalTZ = process.env.TZ;
    const inTZ = (tz: string, run: () => void) => {
      process.env.TZ = tz;
      try {
        run();
      } finally {
        process.env.TZ = originalTZ;
      }
    };
    const p = pred<{ hiredAt: Date | string }>({
      key: "hiredAt",
      type: "dateRange",
    });
    for (const tz of ["Asia/Dubai", "America/Los_Angeles"]) {
      inTZ(tz, () => {
        // Early morning and late night of the boundary days, as a local
        // Date and as a local-naive datetime string.
        const early = new Date(2026, 0, 1, 2, 0);
        const late = new Date(2026, 0, 31, 23, 30);
        const range = { hiredAtFrom: "2026-01-01", hiredAtTo: "2026-01-31" };
        expect(p({ hiredAt: early }, range)).toBe(true);
        expect(p({ hiredAt: late }, range)).toBe(true);
        expect(p({ hiredAt: "2026-01-01T02:00:00" }, range)).toBe(true);
        expect(p({ hiredAt: "2026-01-31T23:30:00" }, range)).toBe(true);
        // Just past either edge stays out.
        expect(p({ hiredAt: new Date(2025, 11, 31, 23, 59) }, range)).toBe(
          false
        );
        expect(p({ hiredAt: new Date(2026, 1, 1, 0, 0) }, range)).toBe(false);
      });
    }
  });

  it("dateRange: a date-only day spans one local calendar day on daylight-saving days", () => {
    const originalTZ = process.env.TZ;
    const p = pred<{ hiredAt: string }>({ key: "hiredAt", type: "dateRange" });
    const on = (day: string) => ({ hiredAtFrom: day, hiredAtOp: "on" });
    const cases = [
      // 23-hour days: the next day's first hour is not part of this day.
      ["America/New_York", "2026-03-08", "2026-03-09T04:30:00Z", false],
      ["Australia/Sydney", "2026-10-04", "2026-10-04T13:30:00Z", false],
      // 25-hour days: the last hour still belongs to this day.
      ["America/New_York", "2026-11-01", "2026-11-02T04:45:00Z", true],
      ["Australia/Sydney", "2026-04-05", "2026-04-05T13:30:00Z", true],
    ] as const;
    try {
      for (const [tz, day, instant, inDay] of cases) {
        process.env.TZ = tz;
        const row = { hiredAt: instant };
        expect(p(row, on(day)), `${tz} on ${day}`).toBe(inDay);
        expect(
          p(row, { hiredAtFrom: day, hiredAtTo: day }),
          `${tz} ${day}..${day}`
        ).toBe(inDay);
        expect(
          p(row, { hiredAtFrom: day, hiredAtOp: "after" }),
          `${tz} after ${day}`
        ).toBe(!inDay);
      }
    } finally {
      process.env.TZ = originalTZ;
    }
  });
});
