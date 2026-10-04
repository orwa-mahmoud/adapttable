/** Keep either framework's navigation panel inside the viewport gutter. */
export function navigationMenuShift(
  box: Pick<DOMRect, "left" | "right">,
  viewport: number,
  margin = 16
): number {
  const overRight = box.right - (viewport - margin);
  if (overRight > 0) return -overRight;
  const overLeft = margin - box.left;
  return overLeft > 0 ? overLeft : 0;
}
