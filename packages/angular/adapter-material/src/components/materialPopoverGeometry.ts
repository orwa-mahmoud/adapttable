/** Keep native filter positioning inside the overlay container's usable width. */
export function fitFilterOverlayHorizontally(
  pane: HTMLElement,
  container: HTMLElement
): void {
  // The document width can include a reserved scrollbar gutter that the CDK
  // container does not. Measure its real bounds instead of guessing that gap.
  // Translate is independent of CDK's transform, including its vertical offset.
  pane.style.translate = "";
  const bounds = container.getBoundingClientRect();
  const viewportWidth = pane.ownerDocument.documentElement.clientWidth;
  if (bounds.width === 0 || viewportWidth === 0) return;
  const left = Math.max(0, bounds.left) + 8;
  const right = Math.min(viewportWidth, bounds.right) - 8;
  const card = pane.getBoundingClientRect();
  const shift = Math.max(left - card.left, Math.min(0, right - card.right));
  if (shift !== 0) pane.style.translate = `${shift}px`;
}
