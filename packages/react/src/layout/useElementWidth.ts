/**
 * An element's width, kept current.
 *
 * `undefined` until the first measurement — which matters, because "not
 * measured yet" and "measured as narrow" call for opposite behaviour. A
 * table that treated the first as the second would render its narrow layout
 * for one frame on every load, and under SSR (no `ResizeObserver`) it would
 * stay there.
 */
import type { RefObject } from "react";
import { useEffect, useState } from "react";

/**
 * Track the content width of an element.
 *
 * @param ref - The element to measure.
 * @returns Its width in pixels, or `undefined` before the first measure.
 */
export function useElementWidth(
  ref: RefObject<HTMLElement | null>
): number | undefined {
  const [width, setWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => {
      setWidth(node.clientWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return width;
}
