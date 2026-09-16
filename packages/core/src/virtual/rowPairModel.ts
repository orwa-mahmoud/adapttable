/**
 * What a virtualizer must offer for a pair to be measurable.
 *
 * @public
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
