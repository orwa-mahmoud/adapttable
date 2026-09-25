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

describe("getDirection", () => {
  it("maps locales to rtl / ltr", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("en-US")).toBe("ltr");
  });
});
