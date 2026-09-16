/**
 * The overlay transition's contract, which is mostly about the two edges no
 * boolean can express on its own: an overlay has to outlive `open` to animate
 * out, and it must not outlive it when the reader asked for less motion.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OVERLAY_MOTION, useOverlayTransition } from "./useOverlayTransition";

/** Stub `matchMedia` so the reduced-motion preference can be set per test. */
function stubMotion(prefersReduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: prefersReduced,
      media: "",
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useOverlayTransition", () => {
  it("arrives from the closed state, so there is something to transition from", async () => {
    stubMotion(false);
    const { result } = renderHook(() => useOverlayTransition(true));

    // Rendered immediately — but not yet at the open end, or the browser has
    // no start value and the overlay simply appears.
    expect(result.current.rendered).toBe(true);
    expect(result.current.state).toBe("closed");

    await waitFor(() => expect(result.current.state).toBe("open"));
  });

  it("stays rendered through the exit, then removes itself", async () => {
    stubMotion(false);
    const { result, rerender } = renderHook(
      ({ open }) => useOverlayTransition(open),
      { initialProps: { open: true } }
    );
    await waitFor(() => expect(result.current.state).toBe("open"));

    rerender({ open: false });
    // Closed end, still on screen: this is the frame the animation runs from.
    expect(result.current.state).toBe("closed");
    expect(result.current.rendered).toBe(true);

    await waitFor(() => expect(result.current.rendered).toBe(false));
  });

  it("honours a longer exit than the default", () => {
    stubMotion(false);
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ open }) => useOverlayTransition(open, 1000),
      { initialProps: { open: true } }
    );

    rerender({ open: false });
    act(() => {
      vi.advanceTimersByTime(OVERLAY_MOTION.exitMs + 50);
    });
    // The default window has passed and the caller's has not.
    expect(result.current.rendered).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.rendered).toBe(false);
  });

  it("under reduced motion skips both edges", () => {
    stubMotion(true);
    const { result, rerender } = renderHook(
      ({ open }) => useOverlayTransition(open),
      { initialProps: { open: true } }
    );

    // No frame delay arriving: the overlay is where it belongs at once.
    expect(result.current).toEqual({ rendered: true, state: "open" });

    rerender({ open: false });
    // And nothing is left in the tree waiting for an animation that will not
    // run.
    expect(result.current).toEqual({ rendered: false, state: "closed" });
  });

  it("starts closed and renders nothing while it stays closed", () => {
    stubMotion(false);
    const { result } = renderHook(() => useOverlayTransition(false));
    expect(result.current).toEqual({ rendered: false, state: "closed" });
  });

  it("reopening mid-exit keeps the overlay rendered", async () => {
    stubMotion(false);
    const { result, rerender } = renderHook(
      ({ open }) => useOverlayTransition(open),
      { initialProps: { open: true } }
    );
    await waitFor(() => expect(result.current.state).toBe("open"));

    rerender({ open: false });
    rerender({ open: true });

    // The pending removal was cancelled with the effect, not left to fire
    // behind the reopened overlay.
    await waitFor(() => expect(result.current.state).toBe("open"));
    expect(result.current.rendered).toBe(true);
  });

  it("leaves in less time than it arrives", () => {
    expect(OVERLAY_MOTION.exitMs).toBeLessThan(OVERLAY_MOTION.enterMs);
  });
});
