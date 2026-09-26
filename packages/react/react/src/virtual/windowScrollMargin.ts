import { measureWindowScrollMargin } from "@adapttable/core/binding";
import {
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export {
  documentOffsetTop,
  measureWindowScrollMargin,
  virtualListElement,
} from "@adapttable/core/binding";

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
