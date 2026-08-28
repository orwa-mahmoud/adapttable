import type { CSSProperties, RefCallback } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Whether the toolbar should pin with the sticky header.
 *
 * Inside a table that already scrolls in a box (`maxHeight`, or antd's
 * native virtual scroller) the toolbar sits *outside* that box — it stays
 * on screen without `position: sticky`. Pinning it to the page anyway
 * detaches search from the card while the rows still scroll inside, which
 * is the ugly double-scroller.
 *
 * @internal
 */
export function resolveStickyToolbar(
  stickyHeader?: boolean,
  stickyToolbar?: boolean,
  inScrollBox = false
): boolean {
  if (inScrollBox) return false;
  return stickyToolbar ?? Boolean(stickyHeader);
}

/**
 * Measure the toolbar and return the styles that park it at `stickyTop`,
 * plus the header inset that keeps thead from sliding under it.
 *
 * @internal
 */
export function useStickyToolbarLayout(
  enabled: boolean,
  stickyTop = 0
): {
  toolbarRef: RefCallback<HTMLElement | null>;
  toolbarStyle: CSSProperties | undefined;
  headerOffset: number;
} {
  const nodeRef = useRef<HTMLElement | null>(null);
  const [height, setHeight] = useState(0);

  const read = useCallback(() => {
    const node = nodeRef.current;
    if (!enabled || !node) {
      setHeight(0);
      return;
    }
    const next = Math.ceil(node.getBoundingClientRect().height);
    setHeight((prev) => (prev === next ? prev : next));
  }, [enabled]);

  const toolbarRef = useCallback(
    (node: HTMLElement | null) => {
      nodeRef.current = node;
      read();
    },
    [read]
  );

  useLayoutEffect(() => {
    if (!enabled) {
      setHeight(0);
      return;
    }
    read();
    const node = nodeRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(node);
    return () => {
      ro.disconnect();
    };
  }, [enabled, read]);

  const toolbarStyle: CSSProperties | undefined = enabled
    ? {
        position: "sticky",
        top: stickyTop,
        zIndex: 3,
        background: "var(--adapttable-surface, Canvas)",
      }
    : undefined;

  return {
    toolbarRef,
    toolbarStyle,
    headerOffset: enabled ? stickyTop + height : stickyTop,
  };
}
