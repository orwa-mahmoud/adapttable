/**
 * Hand focus back to the control an overlay was opened from.
 *
 * Two things make this harder than `element.focus()`. The element is often
 * still mounted when the caller asks, so the focus has to wait a frame for
 * the commit that removes it; and several kits run their own focus handling
 * as a panel closes, landing focus on an overlay root or dropping it to the
 * document a step later — undoing the restore without anyone asking.
 *
 * So it restores, then checks again. It reclaims only from the states that
 * mean *nobody chose this*: the document body, or a container that still
 * holds the trigger. Focus sitting on some other control is a decision — a
 * Tab, a click, an overlay that opened — and is left alone. An overlay can
 * finish leaving after the first two frames and drop focus then, so the
 * same check runs again until that teardown has had time to finish.
 */

/**
 * Whether focus ended up somewhere that means nobody claimed it: the document
 * body, or a container that still holds the trigger.
 *
 * @param trigger - The control focus should be on.
 * @returns Whether focus was dropped rather than moved on purpose.
 *
 * @public
 */
export function focusWasDropped(trigger: HTMLElement): boolean {
  const active = document.activeElement;
  if (active === null || active === document.body) return true;
  // An ancestor of the trigger is a container holding it, not a peer chosen
  // over it.
  return active !== trigger && active.contains(trigger);
}

/**
 * Focus `element` on the next frame, and reclaim it if something dropped it.
 *
 * The later checks cover an overlay that removes itself after those two
 * frames. Each one still refuses to take focus off a control someone chose.
 *
 * @param element - The control to focus. A detached one is never focused:
 *   that silently sends focus to the document, which is worse than nothing.
 * @returns A cancel function for the pending restore.
 *
 * @public
 */
export function restoreFocusSoon(element: HTMLElement | null): () => void {
  if (!element) return () => undefined;

  const focusIfPresent = (): void => {
    if (element.isConnected) element.focus();
  };
  const reclaimIfDropped = (): void => {
    if (document.activeElement === element) return;
    if (!focusWasDropped(element)) return;
    focusIfPresent();
  };

  const cancelLate = [100, 350, 700].map((delay) =>
    later(reclaimIfDropped, delay)
  );
  let cancelSecond: (() => void) | undefined;
  const cancelFirst = onNextFrame(() => {
    focusIfPresent();
    cancelSecond = onNextFrame(reclaimIfDropped);
  });
  return () => {
    cancelFirst();
    cancelSecond?.();
    for (const cancel of cancelLate) cancel();
  };
}

/** Run `fn` after `ms`, and allow the caller to cancel it. */
function later(fn: () => void, ms: number): () => void {
  const id = setTimeout(fn, ms);
  return () => {
    clearTimeout(id);
  };
}

/** Run `fn` on the next animation frame, or a zero timeout without one. */
function onNextFrame(fn: () => void): () => void {
  if (
    typeof requestAnimationFrame === "function" &&
    typeof cancelAnimationFrame === "function"
  ) {
    const id = requestAnimationFrame(fn);
    return () => {
      cancelAnimationFrame(id);
    };
  }
  const id = setTimeout(fn, 0);
  return () => {
    clearTimeout(id);
  };
}
