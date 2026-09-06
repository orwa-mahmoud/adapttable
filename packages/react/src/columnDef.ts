/**
 * React column and header/footer render contracts.
 */
import {
  type CellEditor,
  type ColumnFilter,
  type ColumnGroupDef,
  type ColumnMetadata,
} from "@adapttable/core";
import type { ComponentType, ReactNode } from "react";

/**
 * Props every `ColumnDef.Cell` component receives.
 *
 * @public
 */
export interface CellProps<TRow> {
  /** The row being rendered. */
  readonly row: TRow;
  /** Zero-based index of the row within the current materialised slice. */
  readonly rowIndex: number;
}

/**
 * Sort/resize state a custom header caption can read.
 *
 * @public
 */
export interface ColumnHeaderController {
  /** Default caption (`header`, else the humanized key). */
  label: ReactNode;
  /** This column's sort direction, absent when it is not sorted. */
  sortDir?: "asc" | "desc";
  /** 1-based position in a multi-column sort, absent when unsorted. */
  sortIndex?: number;
  /** Cycle this column's sort. No-op when the column is not sortable. */
  toggleSort: (event?: { shiftKey?: boolean }) => void;
}

/**
 * Arguments for `ColumnDef.renderHeader`.
 *
 * @public
 */
export interface ColumnHeaderContext<TRow> {
  /** The column being rendered. */
  column: ColumnDef<TRow>;
  /** Caption and sort state for this header. */
  controller: ColumnHeaderController;
}

/**
 * Arguments for `ColumnDef.renderFooter`.
 *
 * @public
 */
export interface ColumnFooterContext<TRow> {
  /** The column being rendered. */
  column: ColumnDef<TRow>;
  /** The aggregate this column resolved to, already formatted. */
  value: ReactNode;
}

/**
 * React column. Renderers stay React nodes — the engine never stringifies
 * them into labels.
 *
 * @public
 */
export interface ColumnDef<TRow> extends ColumnMetadata<TRow> {
  /** Declarative filter — narrowed from neutral metadata. */
  filter?: ColumnFilter<TRow>;
  /** Editor widget — narrowed from neutral metadata. */
  editor?: CellEditor;
  /** Header content. Omit and the header is auto-derived from `key`. */
  header?: ReactNode;
  /** Host-provided controls after the caption, before the resize handle. */
  headerActions?: ReactNode;
  /** Replace the header caption. */
  renderHeader?: (ctx: ColumnHeaderContext<TRow>) => ReactNode;
  /** Replace one summary-row cell. */
  renderFooter?: (ctx: ColumnFooterContext<TRow>) => ReactNode;
  /**
   * Component rendered per row. Define at module level (or memoise) so
   * its identity is stable across renders.
   */
  Cell?: ComponentType<CellProps<TRow>>;
  /** Lightweight alternative to `ColumnDef.Cell`; returns cell content. */
  accessor?: (row: TRow) => ReactNode;
}

/**
 * Parent header whose children are React {@link ColumnDef}s.
 *
 * @public
 */
export interface ReactColumnGroupDef<TRow> extends Omit<
  ColumnGroupDef<TRow>,
  "children"
> {
  readonly children: readonly ColumnInput<TRow>[];
}

/**
 * A leaf {@link ColumnDef} or a {@link ReactColumnGroupDef} parent.
 *
 * @public
 */
export type ColumnInput<TRow> = ColumnDef<TRow> | ReactColumnGroupDef<TRow>;
