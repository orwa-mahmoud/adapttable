/**
 * The height a panel under its trigger can take before it reaches the bottom
 * of the window.
 */

/** The smallest height kept below a trigger, so a panel never collapses. */
const MIN_PANEL_HEIGHT = 120;
/** The gap kept between a panel and the bottom of the window. */
const WINDOW_MARGIN = 8;

/**
 * The height a panel pinned under `anchor` can take, at least
 * {@link MIN_PANEL_HEIGHT} and at most `cap`; `cap` before the anchor is
 * measured. `inset` is what the kit's popover adds around the panel (its
 * padding, border and gap from the trigger), kept clear of the window too.
 *
 * @internal
 */
export function spaceBelow(
  anchor: Element | null,
  cap: number,
  inset = 0
): number {
  if (!anchor) return cap;
  return Math.max(
    MIN_PANEL_HEIGHT,
    Math.min(
      cap,
      window.innerHeight -
        anchor.getBoundingClientRect().bottom -
        WINDOW_MARGIN -
        inset
    )
  );
}
