import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useHorizontalOverflow } from "./useHorizontalOverflow";

type ResizeCallback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver
) => void;

function installResizeObserver() {
  const observed: Element[] = [];
  let callback: ResizeCallback | undefined;
  class FakeResizeObserver {
    constructor(cb: ResizeCallback) {
      callback = cb;
    }
    observe(el: Element) {
      observed.push(el);
    }
    disconnect() {
      observed.length = 0;
    }
    unobserve() {
      // not used by the hook
    }
  }
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  return {
    observed,
    fire: () => callback?.([], new FakeResizeObserver(() => undefined)),
  };
}

function fakeWrapper(scrollWidth: number, clientWidth: number): HTMLElement {
  const node = document.createElement("div");
  node.appendChild(document.createElement("table"));
  Object.defineProperty(node, "scrollWidth", {
    value: scrollWidth,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(node, "clientWidth", {
    value: clientWidth,
    configurable: true,
  });
  return node;
}

afterEach(() => vi.unstubAllGlobals());

describe("useHorizontalOverflow", () => {
  it("reports overflow when content is wider, watching wrapper AND table", () => {
    const ro = installResizeObserver();
    const { result } = renderHook(() => useHorizontalOverflow());
    const node = fakeWrapper(900, 600);
    act(() => result.current.ref(node));
    expect(result.current.overflowing).toBe(true);
    // Both the wrapper and its first child (the table) are observed.
    expect(ro.observed).toHaveLength(2);
  });

  it("clears when the content fits again (resize fires the re-measure)", () => {
    const ro = installResizeObserver();
    const { result } = renderHook(() => useHorizontalOverflow());
    const node = fakeWrapper(900, 600);
    act(() => result.current.ref(node));
    expect(result.current.overflowing).toBe(true);
    Object.defineProperty(node, "scrollWidth", {
      value: 600,
      configurable: true,
    });
    act(() => {
      ro.fire();
    });
    expect(result.current.overflowing).toBe(false);
  });

  it("sub-pixel rounding (≤1px) never counts as overflow", () => {
    installResizeObserver();
    const { result } = renderHook(() => useHorizontalOverflow());
    act(() => result.current.ref(fakeWrapper(601, 600)));
    expect(result.current.overflowing).toBe(false);
  });

  it("detaching disconnects; SSR (no ResizeObserver) stays false", () => {
    const ro = installResizeObserver();
    const { result } = renderHook(() => useHorizontalOverflow());
    act(() => result.current.ref(fakeWrapper(900, 600)));
    act(() => result.current.ref(null));
    expect(ro.observed).toHaveLength(0);
    vi.unstubAllGlobals();
    const ssr = renderHook(() => useHorizontalOverflow());
    act(() => ssr.result.current.ref(fakeWrapper(900, 600)));
    expect(ssr.result.current.overflowing).toBe(false);
  });

  it("a wrapper with no child observes just the wrapper", () => {
    const ro = installResizeObserver();
    const { result } = renderHook(() => useHorizontalOverflow());
    const bare = document.createElement("div");
    Object.defineProperty(bare, "scrollWidth", { value: 0 });
    Object.defineProperty(bare, "clientWidth", { value: 0 });
    act(() => result.current.ref(bare));
    expect(ro.observed).toHaveLength(1);
    expect(result.current.overflowing).toBe(false);
  });
});
