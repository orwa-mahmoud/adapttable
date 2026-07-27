import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useScrollToTableTop } from "./useScrollToTableTop";

describe("useScrollToTableTop", () => {
  it("skips a StrictMode mount (restored scroll is not yanked)", async () => {
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    const ref = {
      current: {
        getBoundingClientRect: () => ({ top: -80 }),
      } as HTMLElement,
    };

    const { rerender } = renderHook(
      ({ dep }) => useScrollToTableTop({ ref, deps: [dep], offset: 56 }),
      { initialProps: { dep: "a" }, wrapper: StrictMode }
    );
    await act(async () => Promise.resolve());
    expect(scrollBy).not.toHaveBeenCalled();

    // A real view change still scrolls.
    rerender({ dep: "b" });
    await act(async () => Promise.resolve());
    expect(scrollBy).toHaveBeenCalledTimes(1);
    scrollBy.mockRestore();
  });

  it("skips the initial render", async () => {
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    const ref = {
      current: {
        getBoundingClientRect: () => ({ top: -80 }),
      } as HTMLElement,
    };

    renderHook(() =>
      useScrollToTableTop({
        ref,
        deps: ["a"],
        offset: 56,
      })
    );
    await act(async () => Promise.resolve());

    expect(scrollBy).not.toHaveBeenCalled();
    scrollBy.mockRestore();
  });

  it("scrolls the table back below the sticky offset after dependencies change", async () => {
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    const ref = {
      current: {
        getBoundingClientRect: () => ({ top: 24 }),
      } as HTMLElement,
    };

    const { rerender } = renderHook(
      ({ dep }) =>
        useScrollToTableTop({
          ref,
          deps: [dep],
          offset: 56,
        }),
      { initialProps: { dep: "a" } }
    );
    rerender({ dep: "b" });
    await act(async () => Promise.resolve());

    expect(scrollBy).toHaveBeenCalledWith({
      top: -40,
      behavior: "smooth",
    });
    scrollBy.mockRestore();
  });

  it("does nothing when the table is already below the sticky offset", async () => {
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    const ref = {
      current: {
        getBoundingClientRect: () => ({ top: 120 }),
      } as HTMLElement,
    };

    const { rerender } = renderHook(
      ({ dep }) =>
        useScrollToTableTop({
          ref,
          deps: [dep],
          offset: 56,
        }),
      { initialProps: { dep: "a" } }
    );
    rerender({ dep: "b" });
    await act(async () => Promise.resolve());

    expect(scrollBy).not.toHaveBeenCalled();
    scrollBy.mockRestore();
  });

  it("does nothing when the ref has no current node", async () => {
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    const ref = { current: null };

    const { rerender } = renderHook(
      ({ dep }) =>
        useScrollToTableTop({
          ref,
          deps: [dep],
          offset: 56,
        }),
      { initialProps: { dep: "a" } }
    );
    rerender({ dep: "b" });
    await act(async () => Promise.resolve());

    expect(scrollBy).not.toHaveBeenCalled();
    scrollBy.mockRestore();
  });

  it("can be disabled", async () => {
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    const ref = {
      current: {
        getBoundingClientRect: () => ({ top: -80 }),
      } as HTMLElement,
    };

    const { rerender } = renderHook(
      ({ dep }) =>
        useScrollToTableTop({
          ref,
          deps: [dep],
          enabled: false,
          offset: 56,
        }),
      { initialProps: { dep: "a" } }
    );
    rerender({ dep: "b" });
    await act(async () => Promise.resolve());

    expect(scrollBy).not.toHaveBeenCalled();
    scrollBy.mockRestore();
  });
});
