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

import { shouldEscapeClose } from "@adapttable/core/binding";
import { useEffect, useRef } from "react";

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
      if (shouldEscapeClose(event, ignoreRef.current)) closeRef.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
}
