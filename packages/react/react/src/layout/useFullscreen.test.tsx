/**
 * Fullscreen, and the portal problem that comes with it.
 *
 * The toggle is the easy half. The half that breaks tables is `container`:
 * once an element is promoted, every overlay portalled to `document.body`
 * is inside the part of the document the browser is hiding. It is still
 * mounted, still focused, still announced — and invisible. So the tests
 * care most about whether the hook tells kits where to portal, and about
 * reading the state from the document rather than remembering it, since
 * Escape leaves fullscreen without asking.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFullscreen } from "./useFullscreen";

let element: HTMLElement;

function setFullscreenElement(next: Element | null) {
  Object.defineProperty(document, "fullscreenElement", {
    value: next,
    configurable: true,
  });
  document.dispatchEvent(new Event("fullscreenchange"));
}

beforeEach(() => {
  element = document.createElement("div");
  document.body.append(element);
  Object.defineProperty(document, "fullscreenEnabled", {
    value: true,
    configurable: true,
  });
  Object.defineProperty(document, "fullscreenElement", {
    value: null,
    configurable: true,
  });
  element.requestFullscreen = vi.fn(() => {
    setFullscreenElement(element);
    return Promise.resolve();
  });
  document.exitFullscreen = vi.fn(() => {
    setFullscreenElement(null);
    return Promise.resolve();
  });
});

afterEach(() => {
  element.remove();
});

describe("useFullscreen", () => {
  it("starts inactive, with no portal container to offer", () => {
    const { result } = renderHook(() => useFullscreen(element));

    expect(result.current.active).toBe(false);
    expect(result.current.container).toBeUndefined();
  });

  it("promotes the element and names it as the portal target", () => {
    const { result } = renderHook(() => useFullscreen(element));
    act(() => {
      result.current.toggle();
    });

    expect(result.current.active).toBe(true);
    // Without this every menu the table opens is portalled into the part
    // of the document the browser is hiding.
    expect(result.current.container).toBe(element);
  });

  it("toggles back off", () => {
    const { result } = renderHook(() => useFullscreen(element));
    act(() => {
      result.current.toggle();
    });
    act(() => {
      result.current.toggle();
    });

    expect(result.current.active).toBe(false);
    expect(result.current.container).toBeUndefined();
  });

  it("notices fullscreen ending without it — Escape, or the browser's own control", () => {
    const { result } = renderHook(() => useFullscreen(element));
    act(() => {
      result.current.toggle();
    });
    act(() => {
      setFullscreenElement(null);
    });

    expect(result.current.active).toBe(false);
  });

  it("does not claim to be active when another element is promoted", () => {
    const other = document.createElement("div");
    const { result } = renderHook(() => useFullscreen(element));
    act(() => {
      setFullscreenElement(other);
    });

    expect(result.current.active).toBe(false);
    expect(result.current.container).toBeUndefined();
  });

  it("exits only when something is fullscreen", () => {
    const { result } = renderHook(() => useFullscreen(element));
    act(() => {
      result.current.exit();
    });

    expect(document.exitFullscreen).not.toHaveBeenCalled();

    act(() => {
      result.current.toggle();
    });
    act(() => {
      result.current.exit();
    });

    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it("does nothing without an element", () => {
    const { result } = renderHook(() => useFullscreen(null));
    act(() => {
      result.current.toggle();
    });

    expect(result.current.active).toBe(false);
  });

  it("reports when the browser will not allow it", () => {
    Object.defineProperty(document, "fullscreenEnabled", {
      value: false,
      configurable: true,
    });
    const { result } = renderHook(() => useFullscreen(element));
    act(() => {
      result.current.toggle();
    });

    expect(result.current.supported).toBe(false);
    expect(element.requestFullscreen).not.toHaveBeenCalled();
  });

  it("swallows a refusal rather than throwing at the host", async () => {
    element.requestFullscreen = vi.fn(() =>
      Promise.reject(new Error("gesture required"))
    );
    const { result } = renderHook(() => useFullscreen(element));

    // A browser refuses fullscreen that no real gesture asked for. That is
    // ordinary, not an error the host should have to catch.
    await act(async () => {
      result.current.toggle();
      await Promise.resolve();
    });

    expect(result.current.active).toBe(false);
  });
});
