import { describe, expect, it } from "vitest";

import { getDirection, isRtlLocale, primarySubtag } from "./direction";

describe("primarySubtag", () => {
  it("extracts the primary subtag and lower-cases it", () => {
    expect(primarySubtag("ar-EG")).toBe("ar");
    expect(primarySubtag("en_US")).toBe("en");
    expect(primarySubtag("FR")).toBe("fr");
  });

  it("returns an empty string for an empty input", () => {
    expect(primarySubtag("")).toBe("");
  });
});

describe("isRtlLocale", () => {
  it("returns true for RTL languages and their regional variants", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isRtlLocale("ar-EG")).toBe(true);
    expect(isRtlLocale("he-IL")).toBe(true);
    expect(isRtlLocale("fa")).toBe(true);
    expect(isRtlLocale("ur")).toBe(true);
  });

  it("returns false for LTR languages", () => {
    expect(isRtlLocale("en")).toBe(false);
    expect(isRtlLocale("fr-FR")).toBe(false);
  });
});

describe("explicit scripts", () => {
  it("follows the script a tag names over its language", () => {
    for (const tag of ["az-Arab", "pa-Arab", "pa_arab_PK", "ku-Arab-IQ"]) {
      expect(getDirection(tag), tag).toBe("rtl");
    }
    for (const tag of ["ar-Latn", "ks-Deva", "ur-Latn-PK", "he-Latn"]) {
      expect(getDirection(tag), tag).toBe("ltr");
    }
  });

  it("keeps the language rule for a tag without a script", () => {
    expect(getDirection("ar-EG")).toBe("rtl");
    expect(getDirection("he-IL")).toBe("rtl");
    expect(getDirection("en-US")).toBe("ltr");
    expect(getDirection("az")).toBe("ltr");
  });
});

describe("getDirection", () => {
  it("maps locales to rtl / ltr", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("en-US")).toBe("ltr");
  });
});
