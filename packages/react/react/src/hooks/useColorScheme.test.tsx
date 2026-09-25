import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DARK_SCHEME_QUERY, useColorScheme } from "./useColorScheme";

afterEach(() => vi.unstubAllGlobals());

function stubPrefersDark(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((q: string) => ({
      matches: q === DARK_SCHEME_QUERY && dark,
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
  );
}

describe("useColorScheme", () => {
  it("returns an explicit preference unchanged", () => {
    stubPrefersDark(true);
    expect(renderHook(() => useColorScheme("light")).result.current).toBe(
      "light"
    );
    expect(renderHook(() => useColorScheme("dark")).result.current).toBe(
      "dark"
    );
  });

  it("follows the OS when auto", () => {
    stubPrefersDark(true);
    expect(renderHook(() => useColorScheme("auto")).result.current).toBe(
      "dark"
    );
    stubPrefersDark(false);
    expect(renderHook(() => useColorScheme("auto")).result.current).toBe(
      "light"
    );
  });

  it("defaults to auto", () => {
    stubPrefersDark(true);
    expect(renderHook(() => useColorScheme()).result.current).toBe("dark");
  });
});
