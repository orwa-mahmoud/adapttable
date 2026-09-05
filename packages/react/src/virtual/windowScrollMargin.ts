import type { RefObject } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Document Y of an element — what TanStack's window virtualizer wants as
 * `scrollMargin` so a list that is not at y=0 does not treat the page chrome
 * above it as already-scrolled rows.
 */
export function documentOffsetTop(el: Element): number {
  return Math.max(
    0,
    Math.round(el.getBoundingClientRect().top + window.scrollY)
  );
}

const LIST_SELECTOR =
  '[data-adapttable-part="tbody"], [data-adapttable-part="cards"]';

/** The virtualized list node inside a table root, or the root itself. */
export function virtualListElement(root: Element | null): Element | null {
  if (!root) return null;
  return root.querySelector(LIST_SELECTOR) ?? root;
}

/** TanStack window `scrollMargin` for a mounted table root or scroll box. */
export function measureWindowScrollMargin(root: Element | null): number {
  const list = virtualListElement(root);
  return list === null ? 0 : documentOffsetTop(list);
}

/**
 * Keep the window virtualizer's scroll margin equal to the list's document
 * offset. Call {@link UseMeasuredWindowScrollMargin.observe} with the desktop
 * scroll-box (or any ancestor of `tbody` / `cards`); the table root is a
 * fallback so mobile cards, which never attach that box, still measure.
 */
export function useMeasuredWindowScrollMargin(
  enabled: boolean,
  fallbackRoot?: RefObject<Element | null>
): {
  scrollMargin: number;
  observe: (node: HTMLElement | null) => void;
} {
  const [scrollMargin, setScrollMargin] = useState(0);
  const nodeRef = useRef<HTMLElement | null>(null);

  const read = useCallback(() => {
    if (!enabled) return;
    const next = measureWindowScrollMargin(
      nodeRef.current ?? fallbackRoot?.current ?? null
    );
    setScrollMargin((prev) => (prev === next ? prev : next));
  }, [enabled, fallbackRoot]);

  const observe = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      if (!enabled) return;
      if (node === null) {
        setScrollMargin(0);
        return;
      }
      read();
    },
    [enabled, read]
  );

  useLayoutEffect(() => {
    if (!enabled) {
      setScrollMargin(0);
      return;
    }
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    const observed = nodeRef.current ?? fallbackRoot?.current;
    if (observed) ro.observe(observed);
    ro.observe(document.documentElement);
    window.addEventListener("resize", read);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [enabled, fallbackRoot, read]);

  return { scrollMargin, observe };
}
