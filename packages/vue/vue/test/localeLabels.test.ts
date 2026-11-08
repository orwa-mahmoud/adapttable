import { getLabels } from "@adapttable/i18n";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import { type KitEnvironment, useLocaleLabels } from "../src/kitEnvironment";

describe("useLocaleLabels", () => {
  it("fills labels from the locale and follows a locale change", async () => {
    const environment = shallowRef<KitEnvironment>({
      dir: "rtl",
      locale: "ar-EG",
    });
    const scope = effectScope();
    const merged = scope.run(() => useLocaleLabels(environment));
    expect(merged?.value).toEqual({ dir: "rtl", locale: "ar-EG" });
    await vi.waitFor(() => {
      expect(merged?.value.labels).toBe(getLabels("ar"));
    });

    environment.value = { locale: "de" };
    await nextTick();
    expect(merged?.value.labels).toBeUndefined();
    await vi.waitFor(() => {
      expect(merged?.value.labels).toBe(getLabels("de"));
    });
    scope.stop();
  });

  it("keeps labels the kit set and loads nothing for them", async () => {
    const own = { rowsPerPage: "Per page" };
    const environment = shallowRef<KitEnvironment>({
      locale: "ar",
      labels: own,
    });
    const scope = effectScope();
    const merged = scope.run(() => useLocaleLabels(environment));
    await nextTick();
    expect(merged?.value.labels).toBe(own);
    scope.stop();
  });
});
