/**
 * Fullscreen, and the thing that breaks when you add it.
 *
 * The Fullscreen API promotes one element and hides everything else in the
 * document. That is exactly what a table wants — and it is why every
 * overlay the table owns stops working the moment it is used, because a
 * menu, a popover or a dialog is portalled to `document.body`, and
 * `document.body` is now one of the things being hidden. The overlay is
 * still in the DOM, still focused, still announced, and completely
 * invisible.
 *
 * There is no way to fix that from inside the overlay. The only fix is for
 * the portal to land INSIDE the promoted element, so this hook's real job
 * is not toggling fullscreen — it is telling every kit where to portal
 * while fullscreen is on. `container` is that answer: the fullscreen
 * element, or `undefined` for "wherever you normally would".
 *
 * The state is read from the document rather than remembered, because
 * fullscreen can end without going through this hook at all: Escape, the
 * browser's own control, another element being promoted. A remembered flag
 * would say "on" while the page had already left.
 */
import { useCallback, useEffect, useState } from "react";

/**
 * What {@link useFullscreen} returns.
 *
 * @public
 */
export interface FullscreenState {
  /** Whether the table is the fullscreen element right now. */
  active: boolean;
  /** Whether the browser will allow it at all. */
  supported: boolean;
  /** Go fullscreen, or leave. */
  toggle: () => void;
  /** Leave, if it is on. */
  exit: () => void;
  /**
   * Where overlays must portal while fullscreen is on, and `undefined`
   * otherwise. Hand this to each kit's portal target — Mantine's
   * `portalProps`, MUI's `container`, antd's `getPopupContainer` — or the
   * kit's menus will render into a document nobody can see.
   */
  container: HTMLElement | undefined;
}

/** Whether this document can do fullscreen at all. */
function canFullscreen(): boolean {
  return typeof document !== "undefined" && document.fullscreenEnabled;
}

/**
 * Promote a table to fullscreen, and say where overlays should go.
 *
 * @param element - The table's root. Nothing happens without one.
 * @returns The state, the toggle, and the portal container.
 *
 * @public
 */
export function useFullscreen(element: HTMLElement | null): FullscreenState {
  const [active, setActive] = useState(false);
  const supported = canFullscreen();

  useEffect(() => {
    if (!supported) return;
    // The document is the source of truth. Escape and the browser's own
    // control both leave fullscreen without telling this hook, and a
    // remembered flag would go on claiming the table was promoted.
    const sync = () => {
      setActive(element !== null && document.fullscreenElement === element);
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
    };
  }, [element, supported]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
  }, []);

  const toggle = useCallback(() => {
    if (!supported || !element) return;
    if (document.fullscreenElement === element) {
      void document.exitFullscreen();
      return;
    }
    // A rejection here is ordinary: a browser refuses fullscreen that was
    // not asked for by a real gesture, and that is not an error worth
    // throwing at the host.
    void element.requestFullscreen().catch(() => undefined);
  }, [element, supported]);

  return {
    active,
    supported,
    toggle,
    exit,
    container: active && element ? element : undefined,
  };
}
