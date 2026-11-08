import { describe, expect, it } from "vitest";

import { getLabels, locales } from "./getLabels";
import { loadLabels } from "./loadLabels";

describe("loadLabels", () => {
  it("loads the same preset getLabels returns for every bundled locale", async () => {
    for (const key of Object.keys(locales)) {
      expect(await loadLabels(key)).toBe(getLabels(key));
    }
  });

  it("resolves regional tags the way getLabels does", async () => {
    for (const tag of ["ar-EG", "pt-BR", "zh-TW", "zh-CN", "de-AT"]) {
      expect(await loadLabels(tag)).toBe(getLabels(tag));
    }
    expect(await loadLabels("ar-EG")).toBe(locales.ar);
  });

  it("resolves an unknown language to undefined instead of English", async () => {
    expect(await loadLabels("sw")).toBeUndefined();
    expect(await loadLabels("")).toBeUndefined();
  });
});
