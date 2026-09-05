import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSearchInput } from "./useSearchInput";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useSearchInput", () => {
  it("seeds from the committed search value", () => {
    const { result } = renderHook(() => useSearchInput("hello", vi.fn(), 300));
    expect(result.current.value).toBe("hello");
  });

  it("commits the trimmed value after the debounce", () => {
    const setSearch = vi.fn();
    const { result } = renderHook(() => useSearchInput("", setSearch, 300));
    act(() => result.current.setValue("  ali "));
    expect(setSearch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(setSearch).toHaveBeenCalledWith("ali");
  });

  it("does not re-commit a value already in sync", () => {
    const setSearch = vi.fn();
    renderHook(() => useSearchInput("ali", setSearch, 300));
    act(() => vi.advanceTimersByTime(300));
    expect(setSearch).not.toHaveBeenCalled();
  });

  it("mirrors an external committed change into the input", () => {
    const { result, rerender } = renderHook(
      ({ s }) => useSearchInput(s, vi.fn(), 300),
      { initialProps: { s: "a" } }
    );
    rerender({ s: "external" });
    expect(result.current.value).toBe("external");
  });

  it("does not resurrect a pending value when the search is cleared externally", () => {
    // User types "abc" and it commits.
    let search = "";
    const setSearch = vi.fn((s: string) => {
      search = s;
    });
    const { result, rerender } = renderHook(() =>
      useSearchInput(search, setSearch, 300)
    );
    const abcCommits = () =>
      setSearch.mock.calls.filter(([s]) => s === "abc").length;

    act(() => result.current.setValue("abc"));
    act(() => vi.advanceTimersByTime(300));
    expect(abcCommits()).toBe(1);
    rerender(); // echo: search === "abc"

    // An external "clear all" lands while the debounced value still holds
    // "abc" (the input was just reset to "" but the debounce hasn't ticked).
    search = "";
    act(() => result.current.setValue(""));
    rerender();
    act(() => vi.advanceTimersByTime(300));
    // The stale debounced "abc" must NOT be re-committed over the clear.
    expect(abcCommits()).toBe(1);
    expect(result.current.value).toBe("");
  });

  it("keeps later typing when the committed value echoes back (no clobber)", () => {
    let search = "";
    const setSearch = vi.fn((s: string) => {
      search = s;
    });
    const { result, rerender } = renderHook(() =>
      useSearchInput(search, setSearch, 300)
    );
    act(() => result.current.setValue("ab"));
    act(() => vi.advanceTimersByTime(300));
    expect(setSearch).toHaveBeenCalledWith("ab");
    // User types more before the committed "ab" re-render arrives.
    act(() => result.current.setValue("abc"));
    rerender();
    // The echoed "ab" must NOT reset the live "abc".
    expect(result.current.value).toBe("abc");
  });
});
