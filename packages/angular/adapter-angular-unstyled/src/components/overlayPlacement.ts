/**
 * Pin a fixed-position overlay under its trigger inside the viewport.
 */

/** Above sticky headers and pinned cells, so nothing bleeds through. */
export const OVERLAY_Z = 10050;

/** The gap kept between an overlay and the viewport's edge. */
const VIEWPORT_GUTTER = 8;

/**
 * End-align in LTR and start-align in RTL. Prefer the space below the
 * trigger, flip above when it fits better, and keep the scrollable panel
 * within the viewport gutters.
 */
export function placeOverlayBelowTrigger(
  overlay: HTMLElement,
  trigger: HTMLElement,
  dir: "ltr" | "rtl"
): void {
  overlay.style.transform = "";
  const triggerRect = trigger.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  overlay.style.boxSizing = "border-box";
  overlay.style.maxWidth = `${String(
    Math.max(0, viewportWidth - VIEWPORT_GUTTER * 2)
  )}px`;
  overlay.style.maxHeight = `${String(
    Math.max(0, Math.min(560, viewportHeight - VIEWPORT_GUTTER * 2))
  )}px`;
  const desiredHeight = Math.min(
    560,
    Math.max(overlay.scrollHeight, overlay.getBoundingClientRect().height || 0)
  );
  const below = Math.max(
    0,
    viewportHeight - triggerRect.bottom - 4 - VIEWPORT_GUTTER
  );
  const above = Math.max(0, triggerRect.top - 4 - VIEWPORT_GUTTER);
  const placeBelow = below >= desiredHeight || below >= above;
  overlay.style.maxHeight = `${String(Math.min(560, placeBelow ? below : above))}px`;
  const height = overlay.getBoundingClientRect().height || 0;
  const proposedTop = placeBelow
    ? triggerRect.bottom + 4
    : triggerRect.top - 4 - height;
  const top = Math.max(
    VIEWPORT_GUTTER,
    Math.min(proposedTop, viewportHeight - VIEWPORT_GUTTER - height)
  );
  overlay.style.top = `${String(Math.round(top))}px`;
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
