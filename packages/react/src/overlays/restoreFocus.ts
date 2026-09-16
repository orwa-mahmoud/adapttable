/**
 * Hand focus back to the control an overlay was opened from.
 *
 * Two things make this harder than `element.focus()`. The element is often
 * still mounted when the caller asks, so the focus has to wait a frame for
 * the commit that removes it; and several kits run their own focus handling
 * as a panel closes, landing focus on an overlay root or dropping it to the
 * document a step later — undoing the restore without anyone asking.
 *
 * So it restores, then checks once. It reclaims only from the states that
 * mean *nobody chose this*: the document body, or a container that still
 * holds the trigger. Focus sitting on some other control is a decision — a
 * Tab, a click, an overlay that opened — and is left alone.
 */

/** Whether focus ended up somewhere that means nobody claimed it. @internal */
export function focusWasDropped(trigger: HTMLElement): boolean {
  const active = document.activeElement;
  if (active === null || active === document.body) return true;
  // An ancestor of the trigger is a container holding it, not a peer chosen
  // over it.
  return active !== trigger && active.contains(trigger);
}

/**
 * Focus `element` on the next frame, and reclaim it once if something
 * dropped it.
 *
 * @param element - The control to focus. A detached one is never focused:
 *   that silently sends focus to the document, which is worse than nothing.
 * @returns A cancel function for the pending restore.
 *
 * @public
 */
export function restoreFocusSoon(element: HTMLElement | null): () => void {
  if (!element) return () => undefined;
  const frame =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (fn: () => void) => setTimeout(fn, 0) as unknown as number;
  const cancel =
    typeof cancelAnimationFrame === "function"
      ? cancelAnimationFrame
      : (id: number) => {
          clearTimeout(id);
        };

  const focusIfPresent = (): void => {
    if (element.isConnected) element.focus();
  };

  let second: number | undefined;
  const first = frame(() => {
    focusIfPresent();
    second = frame(() => {
      if (document.activeElement === element) return;
      if (!focusWasDropped(element)) return;
      focusIfPresent();
    });
  });
  return () => {
    cancel(first);
    if (second !== undefined) cancel(second);
  };
}
