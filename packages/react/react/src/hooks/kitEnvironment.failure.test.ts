/**
 * A language whose labels fail to load leaves the table on its current copy,
 * reports the error, and loads on the next request.
 */
import { getLabels } from "@adapttable/i18n";
import type * as Load from "@adapttable/i18n/load";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const load = vi.hoisted(() => ({
  fail: new Set<string>(),
  gates: new Map<string, () => void>(),
}));

vi.mock("@adapttable/i18n/load", async (importOriginal) => {
  const actual = await importOriginal<typeof Load>();
  return {
    loadLabels: async (locale: string) => {
      const gate = load.gates.get(locale);
      if (gate)
        await new Promise<void>((resolve) => load.gates.set(locale, resolve));
      if (load.fail.has(locale)) throw new Error(`chunk for ${locale} failed`);
      return actual.loadLabels(locale);
    },
  };
});

import { useLocaleLabels } from "./kitEnvironment";

afterEach(() => {
  load.fail.clear();
  load.gates.clear();
  vi.restoreAllMocks();
});

describe("useLocaleLabels when a language fails to load", () => {
  it("keeps the current copy, reports the error and recovers", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", onRejection);
    load.fail.add("ar");
    const { result, rerender } = renderHook(
      ({ locale }: { locale: string | undefined }) => useLocaleLabels(locale),
      { initialProps: { locale: "ar" } }
    );
    await waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        '[adapttable] labels for "ar" did not load',
        expect.objectContaining({ message: "chunk for ar failed" })
      );
    });
    expect(result.current).toBeUndefined();

    load.fail.delete("ar");
    rerender({ locale: "de" });
    await waitFor(() => {
      expect(result.current).toBe(getLabels("de"));
    });
    rerender({ locale: "ar" });
    await waitFor(() => {
      expect(result.current).toBe(getLabels("ar"));
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off("unhandledRejection", onRejection);
    expect(rejections).toEqual([]);
  });

  it("ignores a late answer for a locale it has moved away from", async () => {
    load.gates.set("ar", () => undefined);
    const { result, rerender } = renderHook(
      ({ locale }: { locale: string }) => useLocaleLabels(locale),
      { initialProps: { locale: "ar" } }
    );
    rerender({ locale: "de" });
    await waitFor(() => {
      expect(result.current).toBe(getLabels("de"));
    });
    await act(async () => {
      load.gates.get("ar")?.();
      await Promise.resolve();
    });
    expect(result.current).toBe(getLabels("de"));
  });

  it("reports a failure that lands after teardown without touching state", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    load.fail.add("fr");
    load.gates.set("fr", () => undefined);
    const { unmount } = renderHook(() => useLocaleLabels("fr"));
    unmount();
    await act(async () => {
      load.gates.get("fr")?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(log).toHaveBeenCalledTimes(1);
  });
});
