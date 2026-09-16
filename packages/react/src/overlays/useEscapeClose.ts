/**
 * Close an overlay on Escape, from wherever focus happens to be.
 *
 * Kits disagree about this. Most close on their own. Mantine's `Popover`
 * reacts only once focus is inside the dropdown, so a menu left with focus
 * on its trigger never closes. MUI's Modal is the same after a cancelled
 * rename: focus is back on the action, and the next Escape is swallowed.
 * Mantine and Chakra also close too eagerly, dismissing the whole menu when
 * the column rename editor was the one answering. Those kits hand the key
 * to this hook instead, so one rule covers every kit.
 *
 * **One key, one layer.** The listener runs in the capture phase, ahead of
 * every library handler, which is the only way to be reliable across kits.
 * That also means an inner control cannot stop it by the usual route — a
 * bubble-phase `stopPropagation` happens far too late — so controls that own
 * Escape are named explicitly by `ignoreWithin`. Cancelling a column rename
 * closes the editor; the Escape after it closes the menu.
 */
import { useEffect, useRef } from "react";

/**
 * Whether an element is on screen, without needing layout.
 *
 * Deliberately not `getClientRects()`: that answers "no" for everything in a
 * test environment with no layout engine, which would make every inner
 * control stop owning the key there. This asks a question the DOM can always
 * answer, and asks it once rather than once per ancestor — a key handler is
 * not the place for a walk to the root.
 */
function showing(element: Element): boolean {
  if (!element.isConnected) return false;
  // Ancestors count: a kit hides its editor by hiding the surface AROUND it,
  // so asking the element alone answers "visible" for something nobody can
  // see. The walk runs only on Escape, and only when a control claimed the
  // key in the first place.
  let node: Element | null = element;
  while (node) {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    node = node.parentElement;
  }
  return true;
}

/** Tuning for {@link useEscapeClose}. @public */
export interface EscapeCloseOptions {
  /**
   * CSS selector for controls inside the overlay that answer Escape
   * themselves. A key pressed inside one of these is left alone.
   */
  readonly ignoreWithin?: string;
}

/**
 * Close an open overlay when Escape is pressed and nothing inside owns it.
 *
 * @param open - Whether the overlay is showing. Nothing is bound while it is
 *   closed.
 * @param close - Called once, on an Escape the overlay should answer.
 * @param options - See {@link EscapeCloseOptions}.
 *
 * @public
 */
export function useEscapeClose(
  open: boolean,
  close: () => void,
  options: EscapeCloseOptions = {}
): void {
  // Held in refs so an inline arrow or object at the call site does not
  // resubscribe the listener on every render.
  const closeRef = useRef(close);
  closeRef.current = close;
  const ignoreWithin = options.ignoreWithin;
  const ignoreRef = useRef(ignoreWithin);
  ignoreRef.current = ignoreWithin;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      const owner = ignoreRef.current;
      const target = event.target;
      if (owner && target instanceof Element) {
        const inner = target.closest(owner);
        // A control only owns Escape while it is actually showing. A kit that
        // keeps its editor mounted after closing it would otherwise go on
        // swallowing the key — with focus still inside the hidden thing, the
        // NEXT Escape is eaten by a control the reader already dismissed, and
        // the overlay around it never closes.
        if (inner && showing(inner)) return;
      }
      closeRef.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
}
