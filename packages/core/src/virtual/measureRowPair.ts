/**
 * Measuring a row that carries an expanded detail panel beneath it.
 *
 * A virtualizer sizes one item by measuring one element. A row with an open
 * detail panel is two elements — a table cannot nest the panel inside the row
 * it belongs to, because a `<tr>` may only contain cells — so measuring the row
 * alone reports 56px for something 300px tall. Scroll positions then drift as
 * soon as anything is expanded, which is the whole reason row detail carried a
 * "not recommended with virtualize" warning.
 *
 * So the pair is measured as a pair: both elements are observed, and their
 * combined height is handed to the virtualizer through `resizeItem`. The
 * virtualizer keeps owning the layout; it is simply told the truth about how
 * tall the item is.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * What a virtualizer must offer for a pair to be measurable.
 *
 * @internal
 */
export interface ResizableVirtualizer {
  /** Tell the virtualizer an item's real size. */
  resizeItem: (index: number, size: number) => void;
}

/**
 * Ref callbacks for the two halves of one row.
 *
 * @public
 */
export interface RowPairMeasurer {
  /** Ref for the row element itself. */
  row: (index: number) => (node: Element | null) => void;
  /** Ref for its detail element, when one is open. */
  detail: (index: number) => (node: Element | null) => void;
}

/** The two elements of one item, either of which may be absent. */
interface Pair {
  row: Element | null;
  detail: Element | null;
}

/**
 * Measure each row together with its open detail panel.
 *
 * Sizes are reported on every resize of either half, so a detail panel that
 * grows — an image loading, a nested table expanding — corrects the item's
 * height rather than leaving the scrollbar wrong until the next scroll.
 *
 * @param virtualizer - The virtualizer to report sizes to.
 * @param enabled - Off when nothing is virtualized or nothing can expand, in
 *   which case the returned refs do nothing at all.
 * @returns Ref callbacks for a row and its detail.
 *
 * @internal
 */
export function useRowPairMeasurer(
  virtualizer: ResizableVirtualizer | undefined,
  enabled: boolean
): RowPairMeasurer {
  const pairs = useRef(new Map<number, Pair>());
  const observer = useRef<ResizeObserver | null>(null);
  const owners = useRef(new Map<Element, number>());

  const report = useCallback(
    (index: number) => {
      if (!virtualizer) return;
      const pair = pairs.current.get(index);
      if (!pair?.row) return;
      const rowHeight = pair.row.getBoundingClientRect().height;
      const detailHeight = pair.detail?.getBoundingClientRect().height ?? 0;
      const total = rowHeight + detailHeight;
      if (total > 0) virtualizer.resizeItem(index, total);
    },
    [virtualizer]
  );

  useEffect(() => {
    if (!enabled || typeof ResizeObserver === "undefined") return undefined;
    const seen = owners.current;
    const instance = new ResizeObserver((entries) => {
      const touched = new Set<number>();
      for (const entry of entries) {
        const index = seen.get(entry.target);
        if (index !== undefined) touched.add(index);
      }
      for (const index of touched) report(index);
    });
    observer.current = instance;
    // Refs run during commit and effects after it, so by the time the observer
    // exists the first rows are already attached. Pick them up rather than
    // waiting for a re-render that may never come.
    for (const element of seen.keys()) instance.observe(element);
    return () => {
      instance.disconnect();
      observer.current = null;
    };
  }, [enabled, report]);

  const attach = useCallback(
    (index: number, half: keyof Pair) => (node: Element | null) => {
      if (!enabled) return;
      const pair = pairs.current.get(index) ?? { row: null, detail: null };
      const previous = pair[half];
      if (previous && previous !== node) {
        observer.current?.unobserve(previous);
        owners.current.delete(previous);
      }
      pair[half] = node;
      pairs.current.set(index, pair);
      if (node) {
        owners.current.set(node, index);
        observer.current?.observe(node);
      }
      // Report straight away: the first paint is when a wrong height is most
      // visible, and waiting for a resize would mean waiting for a change that
      // may never come.
      report(index);
    },
    [enabled, report]
  );

  return useMemo(
    () => ({
      row: (index: number) => attach(index, "row"),
      detail: (index: number) => attach(index, "detail"),
    }),
    [attach]
  );
}
