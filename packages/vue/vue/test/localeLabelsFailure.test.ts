/**
 * A language whose labels fail to load leaves the table on its current copy,
 * reports the error, and loads on the next request.
 */
import { getLabels } from "@adapttable/i18n";
import type * as Load from "@adapttable/i18n/load";
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import { type KitEnvironment, useLocaleLabels } from "../src/kitEnvironment";

const load = vi.hoisted(() => ({ fail: new Set<string>() }));

vi.mock("@adapttable/i18n/load", async (importOriginal) => {
  const actual = await importOriginal<typeof Load>();
  return {
    loadLabels: async (locale: string) => {
      if (load.fail.has(locale)) throw new Error(`chunk for ${locale} failed`);
      return actual.loadLabels(locale);
    },
  };
});

afterEach(() => {
  load.fail.clear();
  vi.restoreAllMocks();
});

describe("useLocaleLabels when a language fails to load", () => {
  it("keeps the current copy, reports the error and recovers", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", onRejection);
    load.fail.add("ar");
    const environment = shallowRef<KitEnvironment>({ locale: "ar" });
    const scope = effectScope();
    const merged = scope.run(() => useLocaleLabels(environment));
    await vi.waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        '[adapttable] labels for "ar" did not load',
        expect.objectContaining({ message: "chunk for ar failed" })
      );
    });
    expect(merged?.value.labels).toBeUndefined();

    load.fail.delete("ar");
    environment.value = { locale: "de" };
    await nextTick();
    await vi.waitFor(() => {
      expect(merged?.value.labels).toBe(getLabels("de"));
    });
    environment.value = { locale: "ar" };
    await nextTick();
    await vi.waitFor(() => {
      expect(merged?.value.labels).toBe(getLabels("ar"));
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off("unhandledRejection", onRejection);
    expect(rejections).toEqual([]);
    scope.stop();
  });
});
