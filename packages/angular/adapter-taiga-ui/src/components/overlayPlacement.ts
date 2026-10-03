/**
 * Pin a fixed-position overlay under its trigger inside the viewport.
 */

/** Above sticky headers and pinned cells, so nothing bleeds through. */
export const OVERLAY_Z = 10050;

/** The gap kept between an overlay and the viewport's edge. */
const VIEWPORT_GUTTER = 8;

/**
 * Put a fixed-position overlay under its trigger: end-aligned in LTR,
 * start-aligned in RTL, height capped to the room below, and shifted back
 * inside the viewport.
 */
export function placeOverlayBelowTrigger(
  overlay: HTMLElement,
  trigger: HTMLElement,
  dir: "ltr" | "rtl"
): void {
  overlay.style.transform = "";
  const triggerRect = trigger.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const top = triggerRect.bottom + 4;
  overlay.style.top = `${String(Math.round(top))}px`;
  overlay.style.maxHeight = `${String(
    Math.max(120, Math.min(560, window.innerHeight - top - VIEWPORT_GUTTER))
  )}px`;
  const measured = overlay.offsetWidth;
  const width = Math.min(
    measured > 0 ? measured : 380,
    viewportWidth - VIEWPORT_GUTTER * 2
  );
  overlay.style.left = `${String(
    Math.round(dir === "rtl" ? triggerRect.left : triggerRect.right - width)
  )}px`;
  overlay.style.right = "auto";
  const rect = overlay.getBoundingClientRect();
  let shift = 0;
  if (rect.left < VIEWPORT_GUTTER) shift = VIEWPORT_GUTTER - rect.left;
  else if (rect.right > viewportWidth - VIEWPORT_GUTTER) {
    shift = viewportWidth - VIEWPORT_GUTTER - rect.right;
  }
  if (shift !== 0) {
    overlay.style.transform = `translateX(${String(Math.round(shift))}px)`;
  }
}
