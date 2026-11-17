import {
  measuredToolbarHeight,
  stickyHeaderOffset,
  stickyToolbarStyle,
} from "@adapttable/core/binding";
import {
  type CSSProperties,
  type RefCallback,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export { resolveStickyToolbar } from "@adapttable/core/binding";

/**
 * Measure the toolbar and return the styles that park it at `stickyTop`,
 * plus the header inset that keeps thead from sliding under it.
 *
 * @public
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
    const next = measuredToolbarHeight(node);
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

  const toolbarStyle: CSSProperties | undefined = stickyToolbarStyle(
    enabled,
    stickyTop
  );

  return {
    toolbarRef,
    toolbarStyle,
    headerOffset: stickyHeaderOffset(enabled, stickyTop, height),
  };
}
