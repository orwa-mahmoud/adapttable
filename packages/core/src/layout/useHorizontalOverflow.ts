import { useCallback, useRef, useState } from "react";

/** Result of {@link useHorizontalOverflow}. */
export interface HorizontalOverflow<E extends HTMLElement> {
  /** Callback ref for the wrapper element to measure. */
  ref: (node: E | null) => void;
  /** True while the wrapper's content is wider than the wrapper. */
  overflowing: boolean;
}

/**
 * Whether an element's content overflows it horizontally, kept current via
 * `ResizeObserver`. Adapters use it to turn the table wrapper into a
 * horizontal scroller ONLY when the table is actually wider than its
 * container — an unconditional `overflow-x: auto` would make the wrapper a
 * scroll container and trap page-scroll sticky headers even when nothing
 * overflows. Under SSR (no `ResizeObserver`) it stays `false`.
 *
 * @internal
 */
export function useHorizontalOverflow<
  E extends HTMLElement,
>(): HorizontalOverflow<E> {
  const [overflowing, setOverflowing] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: E | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;
    const measure = (): void => {
      // +1 absorbs sub-pixel rounding so the scroller never flickers on.
      setOverflowing(node.scrollWidth > node.clientWidth + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    // The table's width changes (columns shown/hidden/resized) move
    // scrollWidth without resizing the wrapper itself — observe it too.
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    observerRef.current = observer;
    measure();
  }, []);
  return { ref, overflowing };
}
