import type { NestedTableDefaults } from "@adapttable/core";

import type { Renderer } from "../columnDef";

export type { NestedTableDefaults, NestedTableParent } from "@adapttable/core";

/**
 * What a row-detail renderer receives.
 *
 * @public
 */
export interface RowDetailContext<TRow> {
  /** The row, so `let-row` binds it. */
  readonly $implicit: TRow;
  /** The row. */
  readonly row: TRow;
}

/**
 * What a nested table's template or component receives: the defaults to
 * bind onto the kit's own table, and the row it sits under.
 *
 * @public
 */
export interface NestedTableContext<TRow = unknown> {
  /** The defaults, so `let-defaults` binds them. */
  readonly $implicit: NestedTableDefaults;
  /** The defaults. */
  readonly defaults: NestedTableDefaults;
  /** The row the nested table sits under — where its own rows come from. */
  readonly row: TRow;
}

/**
 * A row's nested table.
 *
 * @public
 */
export interface NestedTable<TRow = unknown> {
  /**
   * Accessible name for the nested table and its region — name it after the
   * row it belongs to ("Orders for Ada Lovelace"), not after the feature.
   */
  readonly label?: string;
  /**
   * Mounts the kit's own table with the defaults, over the row's own data:
   * `<ng-template let-d let-row="row"><adapt-data-table [data]="row.orders"
   * [urlSync]="d.urlSync" … /></ng-template>`, or a component with `defaults`
   * and `row` inputs.
   */
  readonly table: Renderer<NestedTableContext<TRow>>;
}

/**
 * A host's declaration: the nested table for a row, or nothing.
 *
 * @public
 */
export type NestedTableFor<TRow> = (row: TRow) => NestedTable<TRow> | undefined;
