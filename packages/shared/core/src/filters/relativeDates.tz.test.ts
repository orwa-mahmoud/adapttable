/**
 * Relative date ranges in named time zones. These specs switch
 * `process.env.TZ`, which only takes effect in a forked worker, so they run in
 * core's `timezones` project.
 */
import { describe, expect, it } from "vitest";

import { resolveRelativeRange } from "./relativeDates";

describe("resolveRelativeRange across daylight-saving days", () => {
  const originalTZ = process.env.TZ;
  const inTZ = (tz: string, run: () => void) => {
    process.env.TZ = tz;
    try {
      run();
    } finally {
      process.env.TZ = originalTZ;
    }
  };
  /** The last millisecond before a local midnight given with its offset. */
  const before = (midnight: string) => Date.parse(midnight) - 1;

  it("ends a 23-hour day at the next local midnight", () => {
    inTZ("America/New_York", () => {
      const lateOnTheDay = Date.parse("2026-03-08T23:59:00-04:00");
      const today = resolveRelativeRange("today", lateOnTheDay)!;
      expect(today.endMs).toBe(before("2026-03-09T00:00:00-04:00"));
      const justAfterMidnight = Date.parse("2026-03-09T00:05:00-04:00");
      const yesterday = resolveRelativeRange("yesterday", justAfterMidnight)!;
      expect(yesterday.startMs).toBe(Date.parse("2026-03-08T00:00:00-05:00"));
      expect(yesterday.endMs).toBe(before("2026-03-09T00:00:00-04:00"));
      const last2 = resolveRelativeRange("last:2", justAfterMidnight)!;
      expect(last2.startMs).toBe(Date.parse("2026-03-08T00:00:00-05:00"));
      expect(last2.endMs).toBe(before("2026-03-10T00:00:00-04:00"));
    });
  });

  it("ends a 25-hour day at the next local midnight", () => {
    inTZ("America/New_York", () => {
      const lateOnTheDay = Date.parse("2026-11-01T23:50:00-05:00");
      const today = resolveRelativeRange("today", lateOnTheDay)!;
      expect(today.endMs).toBe(before("2026-11-02T00:00:00-05:00"));
      const dayBefore = Date.parse("2026-10-31T23:59:00-04:00");
      const tomorrow = resolveRelativeRange("tomorrow", dayBefore)!;
      expect(tomorrow.endMs).toBe(before("2026-11-02T00:00:00-05:00"));
      expect(resolveRelativeRange("next:2", dayBefore)!.endMs).toBe(
        before("2026-11-02T00:00:00-05:00")
      );
    });
  });

  it("holds in the southern hemisphere", () => {
    inTZ("Australia/Sydney", () => {
      const start = resolveRelativeRange(
        "today",
        Date.parse("2026-10-04T12:00:00+11:00")
      )!;
      expect(start.endMs).toBe(before("2026-10-05T00:00:00+11:00"));
      const end = resolveRelativeRange(
        "today",
        Date.parse("2026-04-05T12:00:00+10:00")
      )!;
      expect(end.endMs).toBe(before("2026-04-06T00:00:00+10:00"));
    });
  });
});
