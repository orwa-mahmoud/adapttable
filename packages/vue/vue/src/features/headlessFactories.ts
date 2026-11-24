/** Optional, UI-free feature declarations over the shared neutral patches. */
import type {
  CellSpanAppearance,
  GetCellSpan,
  PinnedRows,
  RowHeight,
  RowStyle,
} from "@adapttable/core";
import {
  coreCellSpan,
  coreCollapsibleColumnGroups,
  coreExtraRows,
  type CoreFeature,
  coreFitColumns,
  coreMultiSort,
  corePinnedSummaryRows,
  coreResizableColumns,
  coreRowAppearance,
  coreSelection,
  type SelectionFeatureOptions,
} from "@adapttable/core/binding";

import { mountColumnResize } from "../columns/columnResize";
import type { ExtraRow } from "../rows/extraRows";
import { projectHeadlessRows } from "../rows/headlessRowsModel";
import type { MaybeRefOrGetterOptional } from "../store";
import type { StaticTableFeature, TableFeature } from "./tableFeature";

export type { ExtraEntry, ExtraRow, ExtraRowKind } from "../rows/extraRows";
export type {
  CellSpanAppearance,
  CellSpanRequest,
  GetCellSpan,
  GetCellSpanArgs,
  PinnedRows,
  PinnedSummaryEntry,
  RowHeight,
  RowPinSide,
  RowStyle,
} from "@adapttable/core";

/** Per-row presentation callbacks receive dataset-relative row indexes. @public */
export interface RowAppearanceOptions<TRow> {
  readonly rowClassName?: (row: TRow, index: number) => string | undefined;
  readonly rowStyle?: RowStyle<TRow>;
  readonly rowHeight?: RowHeight<TRow>;
}

function rowAware<TRow>(feature: CoreFeature<TRow>): TableFeature<TRow> {
  return {
    id: feature.id,
    labels: feature.labels,
    apply: (input) => feature.apply?.(input) ?? {},
    setup: feature.setup ? (host) => feature.setup?.(host) : undefined,
    mount: feature.mount?.bind(feature),
  };
}

/** Add Shift-click multi-column sorting. @public */
export function multiSort(): StaticTableFeature {
  return coreMultiSort();
}
/**
 * What Vue's `selection()` takes; the host's ids may be a ref or a getter.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export type VueSelectionOptions<TRow = unknown> = SelectionFeatureOptions<
  TRow,
  MaybeRefOrGetterOptional<readonly string[]>
>;
/**
 * Let rows be selected. Bulk actions, column selection and selection stats
 * select rows too; this carries the selection's options to all of them.
 *
 * @public
 */
export function selection(
  options?: Omit<VueSelectionOptions, "getId">
): StaticTableFeature;
/**
 * Let rows be selected by an id other than the row key.
 *
 * @public
 */
export function selection<TRow>(
  options: VueSelectionOptions<TRow> & {
    readonly getId: (row: TRow) => string;
  }
): TableFeature<TRow>;
export function selection<TRow>(
  options: VueSelectionOptions<TRow> = {}
): TableFeature<TRow> | StaticTableFeature {
  if (options.getId) return rowAware(coreSelection(options));
  const { selectedIds, defaultSelectedIds, onSelectionChange } = options;
  return coreSelection<unknown, MaybeRefOrGetterOptional<readonly string[]>>({
    selectedIds,
    defaultSelectedIds,
    onSelectionChange,
  });
}
/** Let columns share the table width. @public */
export function fitColumns(): StaticTableFeature {
  return coreFitColumns();
}
/** Enable adapter-owned resize handles. @public */
export function resizableColumns(): StaticTableFeature {
  return { ...coreResizableColumns(), mount: mountColumnResize };
}
/** Enable collapsible grouped headers. @public */
export function collapsibleColumnGroups(): StaticTableFeature {
  return coreCollapsibleColumnGroups();
}
/** Merge the cells selected by the host's span callback. @public */
export function cellSpan<TRow>(
  getCellSpan: GetCellSpan<TRow>,
  cellSpanAppearance?: CellSpanAppearance
): TableFeature<TRow> {
  const base = rowAware(coreCellSpan<TRow>(getCellSpan, cellSpanAppearance));
  return {
    ...base,
    apply: (input) => ({
      ...base.apply?.(input),
      bodyModel: projectHeadlessRows,
    }),
  };
}
/** Insert native-to-Vue content between data rows. @public */
export function extraRows(rows: readonly ExtraRow[]): StaticTableFeature {
  const base = coreExtraRows(rows);
  return {
    ...base,
    apply: (input) => ({
      ...base.apply?.(input),
      bodyModel: projectHeadlessRows,
    }),
  };
}
/** Pin independent summary objects outside sorting, filtering and selection. @public */
export function pinnedSummaryRows<TRow>(
  pinnedRows: PinnedRows<TRow>
): TableFeature<TRow> {
  const base = rowAware(corePinnedSummaryRows<TRow>(pinnedRows));
  return {
    ...base,
    apply: (input) => ({
      ...base.apply?.(input),
      bodyModel: projectHeadlessRows,
    }),
  };
}
/** Apply host-owned row class, style and height. @public */
export function rowAppearance<TRow>(
  options: RowAppearanceOptions<TRow>
): TableFeature<TRow> {
  const base = rowAware(coreRowAppearance<TRow>({ ...options }));
  return {
    ...base,
    apply: (input) => ({
      ...base.apply?.(input),
      bodyModel: projectHeadlessRows,
    }),
  };
}
export type { ColumnMetadata, CssProperties } from "@adapttable/core";
export type { BodyCell } from "@adapttable/core/binding";
