import { describe, expect, it } from "vitest";

import { withKitEnvironment } from "./kitEnvironment";

describe("withKitEnvironment", () => {
  it("uses the library when the table left the field unset", () => {
    const merged = withKitEnvironment(
      {},
      {
        dir: "rtl",
        locale: "ar",
        density: "compact",
        labels: { search: "بحث" },
      }
    );
    expect(merged.dir).toBe("rtl");
    expect(merged.locale).toBe("ar");
    expect(merged.density).toBe("compact");
    expect(merged.labels).toEqual({ search: "بحث" });
  });

  it("keeps an explicit prop ahead of the library", () => {
    const merged = withKitEnvironment(
      {
        dir: "ltr" as const,
        locale: "de",
        density: "comfortable" as const,
        labels: { search: "Find" },
      },
      {
        dir: "rtl",
        locale: "ar",
        density: "compact",
        labels: { search: "بحث" },
      }
    );
    expect(merged.dir).toBe("ltr");
    expect(merged.locale).toBe("de");
    expect(merged.density).toBe("comfortable");
    expect(merged.labels).toEqual({ search: "Find" });
  });
});
