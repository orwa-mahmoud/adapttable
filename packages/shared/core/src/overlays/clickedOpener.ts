/**
 * The button a click pressed, kept so an overlay can return there.
 *
 * Opening a dialog often leaves focus on the document, or moves it into the
 * panel before the host can read it. The click itself still names the
 * control that asked for the overlay.
 *
 * @public
 */
export interface ClickedOpener {
  /**
   * The focused control, or the button last clicked when focus is on the
   * document or inside `ignore`.
   */
  current(ignore?: HTMLElement | null): HTMLElement | null;
  /** Remove the click listener. */
  stop(): void;
}

/**
 * Listen for the button a click pressed.
 *
 * @param doc - The document the overlay lives in.
 * @returns The tracker. Call {@link ClickedOpener.stop} when the host is destroyed.
 *
 * @public
 */
export function watchClickedOpener(doc: Document): ClickedOpener {
  let pressed: HTMLElement | null = null;
  const onClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button");
    if (button instanceof HTMLElement) pressed = button;
  };
  doc.addEventListener("click", onClick, true);
  return {
    current(ignore) {
      const active = doc.activeElement;
      const inside =
        ignore != null && active instanceof Node && ignore.contains(active);
      const focused =
        active instanceof HTMLElement && active !== doc.body && !inside
          ? active
          : null;
      return focused ?? (pressed?.isConnected ? pressed : null);
    },
    stop() {
      doc.removeEventListener("click", onClick, true);
    },
  };
}
