import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  documentOffsetTop,
  measureWindowScrollMargin,
  useMeasuredWindowScrollMargin,
  virtualListElement,
} from "./windowScrollMargin";

function fakeRect(top: number): DOMRect {
  return {
    top,
    left: 0,
    right: 0,
    bottom: top,
    width: 0,
    height: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("virtualListElement", () => {
  it("finds a named tbody or cards list, otherwise the root", () => {
    const root = document.createElement("div");
    expect(virtualListElement(null)).toBeNull();
    expect(virtualListElement(root)).toBe(root);

    const cards = document.createElement("div");
    cards.setAttribute("data-adapttable-part", "cards");
    root.appendChild(cards);
    expect(virtualListElement(root)).toBe(cards);

    cards.remove();
    const body = document.createElement("div");
    body.setAttribute("data-adapttable-part", "tbody");
    root.appendChild(body);
    expect(virtualListElement(root)).toBe(body);
  });
});

describe("documentOffsetTop / measureWindowScrollMargin", () => {
  it("adds the viewport top to the window scroll", () => {
    const el = document.createElement("div");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue(fakeRect(240));
    vi.spyOn(window, "scrollY", "get").mockReturnValue(40);
    expect(documentOffsetTop(el)).toBe(280);
  });

  it("never reports a negative offset", () => {
    const el = document.createElement("div");
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue(fakeRect(-12));
    vi.spyOn(window, "scrollY", "get").mockReturnValue(0);
    expect(documentOffsetTop(el)).toBe(0);
  });

  it("reads the list node inside a root, or zero when nothing is mounted", () => {
    expect(measureWindowScrollMargin(null)).toBe(0);
    const root = document.createElement("div");
    const body = document.createElement("div");
    body.setAttribute("data-adapttable-part", "tbody");
    root.appendChild(body);
    vi.spyOn(body, "getBoundingClientRect").mockReturnValue(fakeRect(180));
    vi.spyOn(window, "scrollY", "get").mockReturnValue(20);
    expect(measureWindowScrollMargin(root)).toBe(200);
  });
});

describe("useMeasuredWindowScrollMargin", () => {
  it("stays at zero until a list is observed, then tracks its document Y", () => {
    const { result } = renderHook(() => useMeasuredWindowScrollMargin(true));
    expect(result.current.scrollMargin).toBe(0);

    const box = document.createElement("div");
    const body = document.createElement("div");
    body.setAttribute("data-adapttable-part", "tbody");
    box.appendChild(body);
    vi.spyOn(body, "getBoundingClientRect").mockReturnValue(fakeRect(320));
    vi.spyOn(window, "scrollY", "get").mockReturnValue(16);

    act(() => {
      result.current.observe(box);
    });
    expect(result.current.scrollMargin).toBe(336);
  });

  it("clears the margin when the list unmounts or measuring turns off", () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useMeasuredWindowScrollMargin(enabled),
      { initialProps: { enabled: true } }
    );
    const box = document.createElement("div");
    vi.spyOn(box, "getBoundingClientRect").mockReturnValue(fakeRect(100));
    act(() => {
      result.current.observe(box);
    });
    expect(result.current.scrollMargin).toBe(100);

    act(() => {
      result.current.observe(null);
    });
    expect(result.current.scrollMargin).toBe(0);

    act(() => {
      result.current.observe(box);
    });
    rerender({ enabled: false });
    expect(result.current.scrollMargin).toBe(0);
  });
});

describe("useMeasuredWindowScrollMargin — re-measuring", () => {
  /** A ResizeObserver that hands its callback back so a test can fire it. */
  function stubResizeObserver() {
    const observed: Element[] = [];
    let fire = () => undefined as void;
    let disconnected = 0;
    class Stub {
      constructor(callback: () => void) {
        fire = callback;
      }
      observe(node: Element) {
        observed.push(node);
      }
      disconnect() {
        disconnected += 1;
      }
      unobserve() {
        // The hook only ever disconnects.
      }
    }
    vi.stubGlobal("ResizeObserver", Stub);
    return {
      observed,
      fire: () => fire(),
      get disconnected() {
        return disconnected;
      },
    };
  }

  it("watches the list and the document, and re-reads when either changes", () => {
    const ro = stubResizeObserver();
    const box = document.createElement("div");
    const rect = vi.spyOn(box, "getBoundingClientRect");
    rect.mockReturnValue(fakeRect(100));

    const { result, unmount } = renderHook(() =>
      useMeasuredWindowScrollMargin(true)
    );
    act(() => {
      result.current.observe(box);
    });
    expect(result.current.scrollMargin).toBe(100);
    // The page above the list can grow without the list itself resizing, which
    // is why the document element is watched.
    expect(ro.observed).toContain(document.documentElement);

    rect.mockReturnValue(fakeRect(260));
    act(() => {
      ro.fire();
    });
    expect(result.current.scrollMargin).toBe(260);

    rect.mockReturnValue(fakeRect(310));
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current.scrollMargin).toBe(310);

    unmount();
    expect(ro.disconnected).toBeGreaterThan(0);
  });

  it("falls back to the table root when no scroll box was observed", () => {
    const root = document.createElement("div");
    const cards = document.createElement("div");
    cards.setAttribute("data-adapttable-part", "cards");
    root.appendChild(cards);
    vi.spyOn(cards, "getBoundingClientRect").mockReturnValue(fakeRect(140));

    // Mobile cards never attach a scroll box, so the root is what gets measured.
    const ro = stubResizeObserver();
    const { result } = renderHook(() =>
      useMeasuredWindowScrollMargin(true, { current: root })
    );
    expect(result.current.scrollMargin).toBe(140);
    // The root is what the observer watches when there is no scroll box.
    expect(ro.observed).toContain(root);
  });
});
