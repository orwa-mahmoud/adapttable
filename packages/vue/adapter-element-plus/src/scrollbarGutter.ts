/**
 * Distance a fixed overlay is placed left of its trigger when the page
 * reserves a scrollbar gutter and the scrollbar itself is not taking that
 * space. Overlay math uses the wider viewport; the layout box does not.
 */
export function rtlScrollbarGutter(
  dir: string | undefined,
  view: Window | null | undefined
): string {
  if (dir !== "rtl" || !view) return "0px";
  const layout = view.document.documentElement.getBoundingClientRect().width;
  const gutter = view.innerWidth - layout;
  return `${gutter > 0 ? gutter : 0}px`;
}
