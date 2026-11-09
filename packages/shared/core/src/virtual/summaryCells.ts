/**
 * Summary-row cells.
 *
 * An incremental view that already carries aggregates wins. Otherwise the
 * host's builder runs. This module reads the lightweight view accessor and
 * does not import the incremental engine.
 */

import { incrementalViewOf } from "../rows/incrementalView";

/* ── Summary cells ─────────────────────────────────────────────────── */

/**
 * Summary-row cells, recomputed only when the rendered rows change.
 *
 * An incremental view that already carries aggregates wins. Otherwise the
 * host's builder runs — read at call time, since hosts pass it inline and
 * a fresh identity every render must not re-run an aggregate that walks the
 * whole filtered set.
 *
 * @public
 */
export class SummaryCellsCache<TCells> {
  #rows: readonly unknown[] | undefined;
  #enabled = false;
  #fromView: TCells | undefined;
  #cells: TCells | undefined;

  /**
   * The summary cells for these rows.
   *
   * @param summaryRow - The host's builder, or `undefined` when off.
   * @param rows - The rows the summary describes.
   * @returns The cells, or `undefined` with no builder and no view aggregates.
   */
  read<TRow>(
    summaryRow: ((rows: readonly TRow[]) => TCells) | undefined,
    rows: readonly TRow[]
  ): TCells | undefined {
    const fromView = incrementalViewOf<{
      readonly aggregates?: TCells;
    }>(rows)?.aggregates;
    const enabled = summaryRow !== undefined && fromView === undefined;
    if (
      rows === this.#rows &&
      enabled === this.#enabled &&
      fromView === this.#fromView
    ) {
      return this.#cells;
    }
    this.#rows = rows;
    this.#enabled = enabled;
    this.#fromView = fromView;
    this.#cells = enabled ? summaryRow?.(rows) : fromView;
    return this.#cells;
  }
}
