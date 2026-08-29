/**
 * Scroll-box wiring for a virtualized mobile card list.
 *
 * Desktop rows attach `virtualScrollRef` to the `maxHeight` box inside the
 * table assembly. Cards are a page-flow list, so the same ref has to land on
 * the list itself — otherwise element-mode virtualization has a null scroller
 * and, before this module existed, fell back to mounting every card.
 */
import type { CSSProperties, Ref, RefCallback } from "react";

/**
 * Clip the card list to `maxHeight` so it becomes the scroll element the
 * virtualizer tracks. Omit `maxHeight` and the page is the scroller.
 *
 * @public
 */
export function mobileCardListStyle(
  maxHeight: number | undefined
): CSSProperties | undefined {
  if (maxHeight == null) return undefined;
  return { maxHeight, overflowY: "auto" };
}

/**
 * Attach the virtualizer to the card list, composing an extra ref (Mantine
 * keeps the list node for its own layout) so both observers see the same
 * element.
 *
 * @public
 */
export function bindMobileCardList(
  virtualScrollRef: ((node: HTMLElement | null) => void) | undefined,
  extra?: Ref<HTMLElement | null>
): RefCallback<HTMLElement> {
  return (node) => {
    virtualScrollRef?.(node);
    if (extra == null) return;
    if (typeof extra === "function") {
      extra(node);
      return;
    }
    extra.current = node;
  };
}
