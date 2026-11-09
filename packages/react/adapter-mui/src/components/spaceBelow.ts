/** The smallest panel height kept below a trigger, so it never collapses. */
const MIN_PANEL_HEIGHT = 120;
/** The gap kept between a panel and the bottom of the window. */
const WINDOW_MARGIN = 8;

/**
 * The height a panel pinned under `anchor` can take before it reaches the
 * bottom of the window, at least {@link MIN_PANEL_HEIGHT} and at most `cap`.
 */
export function spaceBelow(
  anchor: Readonly<{ getBoundingClientRect(): DOMRect }>,
  cap: number
): number {
  return Math.max(
    MIN_PANEL_HEIGHT,
    Math.min(
      cap,
      window.innerHeight - anchor.getBoundingClientRect().bottom - WINDOW_MARGIN
    )
  );
}
