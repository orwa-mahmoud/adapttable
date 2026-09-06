/**
 * The scroll rule, driven with real geometry.
 *
 * jsdom reports every box as zero, so the element's metrics are defined here
 * — otherwise the hook would always believe the reader is at the bottom and
 * the behaviour that matters would never be exercised.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useConversationScroll } from "./useConversationScroll";

function makeScroller(patch: {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
}): HTMLDivElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollHeight", {
    value: patch.scrollHeight,
    configurable: true,
  });
  Object.defineProperty(el, "clientHeight", {
    value: patch.clientHeight,
    configurable: true,
  });
  el.scrollTop = patch.scrollTop;
  return el;
}

describe("useConversationScroll", () => {
  it("follows a new message when the reader is at the bottom", () => {
    const el = makeScroller({
      scrollHeight: 1000,
      clientHeight: 200,
      scrollTop: 800,
    });
    const { result, rerender } = renderHook(
      ({ count }: { count: number }) => useConversationScroll(count),
      { initialProps: { count: 1 } }
    );
    result.current.ref.current = el;
    act(() => {
      result.current.onScroll();
    });

    rerender({ count: 2 });

    expect(el.scrollTop).toBe(1000);
    expect(result.current.hasUnseen).toBe(false);
  });

  it("stays put when the reader is reading further up", () => {
    const el = makeScroller({
      scrollHeight: 1000,
      clientHeight: 200,
      scrollTop: 100,
    });
    const { result, rerender } = renderHook(
      ({ count }: { count: number }) => useConversationScroll(count),
      { initialProps: { count: 1 } }
    );
    result.current.ref.current = el;
    act(() => {
      result.current.onScroll();
    });

    rerender({ count: 2 });

    // Yanking them to the bottom is what makes an earlier result impossible
    // to read.
    expect(el.scrollTop).toBe(100);
    expect(result.current.hasUnseen).toBe(true);
  });

  it("takes them to the newest message on request", () => {
    const el = makeScroller({
      scrollHeight: 1000,
      clientHeight: 200,
      scrollTop: 100,
    });
    const { result, rerender } = renderHook(
      ({ count }: { count: number }) => useConversationScroll(count),
      { initialProps: { count: 1 } }
    );
    result.current.ref.current = el;
    act(() => {
      result.current.onScroll();
    });
    rerender({ count: 2 });
    act(() => {
      result.current.jumpToLatest();
    });

    expect(el.scrollTop).toBe(1000);
    expect(result.current.hasUnseen).toBe(false);
  });

  it("clears the affordance once they scroll back down themselves", () => {
    const el = makeScroller({
      scrollHeight: 1000,
      clientHeight: 200,
      scrollTop: 100,
    });
    const { result, rerender } = renderHook(
      ({ count }: { count: number }) => useConversationScroll(count),
      { initialProps: { count: 1 } }
    );
    result.current.ref.current = el;
    act(() => {
      result.current.onScroll();
    });
    rerender({ count: 2 });
    expect(result.current.hasUnseen).toBe(true);

    el.scrollTop = 800;
    act(() => {
      result.current.onScroll();
    });

    expect(result.current.hasUnseen).toBe(false);
  });

  it("counts within a hair of the end as the end", () => {
    // A pixel of rounding must not read as "reading further up".
    const el = makeScroller({
      scrollHeight: 1000,
      clientHeight: 200,
      scrollTop: 790,
    });
    const { result, rerender } = renderHook(
      ({ count }: { count: number }) => useConversationScroll(count),
      { initialProps: { count: 1 } }
    );
    result.current.ref.current = el;
    act(() => {
      result.current.onScroll();
    });
    rerender({ count: 2 });

    expect(result.current.hasUnseen).toBe(false);
  });

  it("does nothing at all without an element or a message", () => {
    const { result, rerender } = renderHook(
      ({ count }: { count: number }) => useConversationScroll(count),
      { initialProps: { count: 0 } }
    );

    expect(() => {
      act(() => {
        result.current.onScroll();
        result.current.jumpToLatest();
      });
      rerender({ count: 0 });
    }).not.toThrow();
    expect(result.current.hasUnseen).toBe(false);
  });
});
