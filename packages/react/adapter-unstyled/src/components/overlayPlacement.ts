/** Above sticky thead (`PIN_Z.header = 4`) and the showcase nav (`z-index: 40`). */
export const OVERLAY_Z = 10050;

/** Breathing room kept between an overlay and the viewport edge, in px. */
export const VIEWPORT_GUTTER = 8;

/**
 * Pin a `position: fixed` overlay under `trigger`, aligned to the inline-end
 * edge, never flipped above it. Caps height to the room actually below the
 * button so a tall panel scrolls inside instead of covering the page.
 */
export function placeOverlayBelowTrigger(
  overlay: HTMLElement,
  trigger: HTMLElement,
  dir: "ltr" | "rtl" = "ltr"
): void {
  overlay.style.transform = "";
  const triggerRect = trigger.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const top = triggerRect.bottom + 4;
  overlay.style.top = `${Math.round(top)}px`;
  overlay.style.maxHeight = `${Math.max(
    120,
    Math.min(560, window.innerHeight - top - VIEWPORT_GUTTER)
  )}px`;
  const measured = overlay.offsetWidth;
  const styled = Number.parseFloat(overlay.style.width);
  let raw = 380;
  if (measured > 0) {
    raw = measured;
  } else if (Number.isFinite(styled) && styled > 0) {
    raw = styled;
  }
  const width = Math.min(raw, viewportWidth - VIEWPORT_GUTTER * 2);
  if (dir === "rtl") {
    overlay.style.left = `${Math.round(triggerRect.left)}px`;
  } else {
    overlay.style.left = `${Math.round(triggerRect.right - width)}px`;
  }
  overlay.style.right = "auto";
  const rect = overlay.getBoundingClientRect();
  let shift = 0;
  if (rect.left < VIEWPORT_GUTTER) {
    shift = VIEWPORT_GUTTER - rect.left;
  } else if (rect.right > viewportWidth - VIEWPORT_GUTTER) {
    shift = viewportWidth - VIEWPORT_GUTTER - rect.right;
  }
  if (shift !== 0) {
    overlay.style.transform = `translateX(${Math.round(shift)}px)`;
  }
}
