import { useEffect, useRef } from "react";

/**
 * Close an open toolbar menu on Escape, from wherever focus happens to be.
 *
 * Mantine's `Popover` dismiss reacts to Escape only once focus sits inside
 * the dropdown. The filter popover moves focus in, so it is covered; the
 * Columns and Saved-views menus leave focus on their trigger, where the key
 * would otherwise do nothing — every other adapter's kit closes both.
 *
 * Only the innermost thing answers Escape. A control inside the menu that
 * has already handled the key — the column rename editor cancelling an edit
 * — marks the event handled, and this listener leaves it alone. Without
 * that, one Escape closed the editor, the submenu and the whole menu at
 * once, and the reader lost the row they were working on.
 */
export function useEscapeClose(open: boolean, close: () => void): void {
  // Held in a ref so an inline arrow at the call site does not resubscribe
  // the listener on every render.
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
}
