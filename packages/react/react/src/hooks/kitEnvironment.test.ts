import { getLabels } from "@adapttable/i18n";
import { loadLabels } from "@adapttable/i18n/load";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useLocaleLabels, withKitEnvironment } from "./kitEnvironment";

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

describe("useLocaleLabels", () => {
  it("loads the labels of the library locale and drops them when it changes", async () => {
    const initialProps: { locale: string | undefined } = { locale: "ar-EG" };
    const { result, rerender } = renderHook(
      ({ locale }: { locale: string | undefined }) => useLocaleLabels(locale),
      { initialProps }
    );
    expect(result.current).toBeUndefined();
    await waitFor(() => {
      expect(result.current).toBe(getLabels("ar"));
    });

    rerender({ locale: "de" });
    expect(result.current).toBeUndefined();
    await waitFor(() => {
      expect(result.current).toBe(getLabels("de"));
    });

    rerender({ locale: undefined });
    expect(result.current).toBeUndefined();
  });

  it("stays unset for a language without labels", async () => {
    const { result } = renderHook(() => useLocaleLabels("sv"));
    await act(async () => {
      await loadLabels("sv");
    });
    expect(result.current).toBeUndefined();
  });
});
