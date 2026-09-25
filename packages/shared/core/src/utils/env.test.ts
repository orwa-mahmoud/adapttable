import { afterEach, describe, expect, it, vi } from "vitest";

import { isBrowser, safeLocalStorage } from "./env";

afterEach(() => vi.unstubAllGlobals());

describe("env", () => {
  it("detects the browser and hands back localStorage", () => {
    expect(isBrowser()).toBe(true);
    expect(safeLocalStorage()).toBe(globalThis.localStorage);
  });

  it("returns undefined under SSR (no window at all)", () => {
    vi.stubGlobal("window", undefined);
    expect(isBrowser()).toBe(false);
    expect(safeLocalStorage()).toBeUndefined();
  });
});
