/** Keep the native popover's measured box within the viewport in either direction. */
export function fitBootstrapPopoverHorizontally(pane: HTMLElement): void {
  const viewport = pane.ownerDocument.defaultView;
  if (!viewport) return;
  const width =
    pane.ownerDocument.documentElement.clientWidth || viewport.innerWidth;
  const maximum = `${Math.max(0, width - 16)}px`;
  if (pane.style.maxWidth !== maximum) pane.style.maxWidth = maximum;
  const rect = pane.getBoundingClientRect();
  const currentShift = Number.parseFloat(pane.style.translate) || 0;
  const left = rect.left - currentShift;
  const right = rect.right - currentShift;
  let shift = 0;
  if (left < 8) shift = 8 - left;
  else if (right > width - 8) shift = width - 8 - right;
  const next = shift === 0 ? "" : `${shift}px`;
  if (pane.style.translate !== next) pane.style.translate = next;
}
