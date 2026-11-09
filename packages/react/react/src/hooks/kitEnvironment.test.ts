import { getLabels } from "@adapttable/i18n";
import { loadLabels } from "@adapttable/i18n/load";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useLocaleLabels } from "./kitEnvironment";

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
