/**
 * Browser measurement for a windowed body.
 *
 * Scroll position and element size stay here so viewport arithmetic does
 * not read the DOM, and a query or server entry never imports this module.
 */

import type { ColumnViewport } from "./viewportState";

/**
 * Read a scroll container's horizontal viewport. `scrollLeft` is negative
 * in RTL, so its magnitude is the distance scrolled either way.
 *
 * @public
 */
export function readColumnViewport(element: {
  readonly scrollLeft: number;
  readonly clientWidth: number;
}): ColumnViewport {
  return { start: Math.abs(element.scrollLeft), width: element.clientWidth };
}

/* ── Row-pair measurement ──────────────────────────────────────────── */

/**
 * Measures each windowed row together with its open detail panel.
 *
 * A `<tr>` cannot contain its detail panel, so one item is two elements;
 * measuring the row alone reports 56px for something 300px tall and scroll
 * positions drift. Both halves are observed and their combined height is
 * reported through `resizeItem`, on every resize of either half.
 *
 * @public
 */
export class RowPairMeasureController {
  readonly #pairs = new Map<
    number,
    { row: Element | null; detail: Element | null }
  >();
  readonly #owners = new Map<Element, number>();
  #observer: ResizeObserver | null = null;
  readonly #resizeItem: ((index: number, size: number) => void) | undefined;

  /**
   * @param resizeItem - Reports an item's real size to the virtualizer.
   */
  constructor(resizeItem: ((index: number, size: number) => void) | undefined) {
    this.#resizeItem = resizeItem;
  }

  /** Report one item's combined height. */
  report(index: number): void {
    if (!this.#resizeItem) return;
    const pair = this.#pairs.get(index);
    if (!pair?.row) return;
    const total =
      pair.row.getBoundingClientRect().height +
      (pair.detail?.getBoundingClientRect().height ?? 0);
    if (total > 0) this.#resizeItem(index, total);
  }

  /**
   * Start observing. Elements attached before this runs are picked up, since
   * refs attach before effects.
   *
   * @returns A function that stops observing.
   */
  connect(): () => void {
    if (typeof ResizeObserver === "undefined") return () => undefined;
    const instance = new ResizeObserver((entries) => {
      const touched = new Set<number>();
      for (const entry of entries) {
        const index = this.#owners.get(entry.target);
        if (index !== undefined) touched.add(index);
      }
      for (const index of touched) this.report(index);
    });
    this.#observer = instance;
    for (const element of this.#owners.keys()) instance.observe(element);
    return () => {
      instance.disconnect();
      this.#observer = null;
    };
  }

  /**
   * Attach one half of an item, or detach it with `null`.
   *
   * @param index - The item.
   * @param half - The row or its detail.
   * @param node - The element, or `null`.
   */
  attach(index: number, half: "row" | "detail", node: Element | null): void {
    const pair = this.#pairs.get(index) ?? { row: null, detail: null };
    const previous = pair[half];
    if (previous && previous !== node) {
      this.#observer?.unobserve(previous);
      this.#owners.delete(previous);
    }
    pair[half] = node;
    this.#pairs.set(index, pair);
    if (node) {
      this.#owners.set(node, index);
      this.#observer?.observe(node);
    }
    // Report straight away: the first paint is when a wrong height is most
    // visible, and a resize may never come.
    this.report(index);
  }
}
