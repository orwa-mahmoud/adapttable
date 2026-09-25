import { describe, expect, it } from "vitest";

import {
  resolveFilterMode,
  showSimpleFilterFields,
  toolbarShowsFilters,
} from "./filterChrome";

describe("resolveFilterMode", () => {
  it("defaults to the popover", () => {
    expect(resolveFilterMode()).toBe("popover");
    expect(resolveFilterMode(undefined, false)).toBe("popover");
  });

  it("treats headerFilters as header mode", () => {
    expect(resolveFilterMode(undefined, true)).toBe("header");
    expect(resolveFilterMode("popover", true)).toBe("header");
    expect(resolveFilterMode("drawer", true)).toBe("header");
  });

  it("honours an explicit mode when headerFilters is off", () => {
    expect(resolveFilterMode("drawer")).toBe("drawer");
    expect(resolveFilterMode("header")).toBe("header");
    expect(resolveFilterMode("popover")).toBe("popover");
  });
});

describe("toolbarShowsFilters", () => {
  it("follows the form in popover and drawer", () => {
    expect(toolbarShowsFilters("popover", true, false)).toBe(true);
    expect(toolbarShowsFilters("drawer", true, false)).toBe(true);
    expect(toolbarShowsFilters("popover", false, true)).toBe(false);
  });

  it("keeps Filters in header mode only when the AND/OR tree is on", () => {
    expect(toolbarShowsFilters("header", true, false)).toBe(false);
    expect(toolbarShowsFilters("header", true, true)).toBe(true);
  });
});

describe("showSimpleFilterFields", () => {
  it("mounts the field list unless header mode or the host turned it off", () => {
    expect(showSimpleFilterFields(false)).toBe(true);
    expect(showSimpleFilterFields(false, true)).toBe(true);
    expect(showSimpleFilterFields(false, false)).toBe(false);
    expect(showSimpleFilterFields(true, true)).toBe(false);
  });
});
