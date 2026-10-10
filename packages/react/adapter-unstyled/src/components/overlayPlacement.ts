/** Above sticky thead (`PIN_Z.header = 4`) and the showcase nav (`z-index: 40`). */
export const OVERLAY_Z = 10050;

/** Breathing room kept between an overlay and the viewport edge, in px. */
export const VIEWPORT_GUTTER = 8;

/**
 * Pin a `position: fixed` overlay under `trigger`, aligned to the inline-end
 * edge. Prefer the room below, flip above when it fits better, and constrain
 * a tall panel to the viewport so all its controls remain reachable.
 */
export function placeOverlayBelowTrigger(
  overlay: HTMLElement,
  trigger: HTMLElement,
  dir: "ltr" | "rtl" = "ltr"
): void {
  overlay.style.transform = "";
  const triggerRect = trigger.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  overlay.style.boxSizing = "border-box";
  overlay.style.maxWidth = `calc(100vw - ${VIEWPORT_GUTTER * 2}px)`;
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
  overlay.style.maxHeight = `${Math.min(560, placeBelow ? below : above)}px`;
  const height = overlay.getBoundingClientRect().height || 0;
  const proposedTop = placeBelow
    ? triggerRect.bottom + 4
    : triggerRect.top - 4 - height;
  const top = Math.max(
    VIEWPORT_GUTTER,
    Math.min(proposedTop, viewportHeight - VIEWPORT_GUTTER - height)
  );
  overlay.style.top = `${Math.round(top)}px`;
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
