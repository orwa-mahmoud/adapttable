/**
 * Measure an element's offset height — used for sticky header offset.
 *
 * Lives here so desktop assembly never imports pinned-row chrome.
 */
import { useCallback, useEffect, useState } from "react";

/**
 * Measure an element's offset height; used for the sticky header offset.
 *
 * @public
 */
export function useOffsetHeight(): [
  (node: HTMLElement | null) => void,
  number,
] {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(0);
  const ref = useCallback((next: HTMLElement | null) => {
    setNode(next);
    if (next) setHeight(next.getBoundingClientRect().height);
  }, []);
  useEffect(() => {
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      setHeight(node.getBoundingClientRect().height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [ref, height];
}
