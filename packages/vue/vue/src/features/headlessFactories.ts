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
} from "@adapttable/core/binding";

import { mountColumnResize } from "../columns/columnResize";
import type { ExtraRow } from "../rows/extraRows";
import { projectHeadlessRows } from "../rows/headlessRowsModel";
import type { StaticTableFeature, TableFeature } from "./tableFeature";

export type { ExtraEntry, ExtraRow, ExtraRowKind } from "../rows/extraRows";
export type {
  BodyCell,
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
    apply: (input) => feature.apply?.(input) ?? {},
    setup: feature.setup ? (host) => feature.setup?.(host) : undefined,
  };
}

/** Add Shift-click multi-column sorting. @public */
export function multiSort(): StaticTableFeature {
  return coreMultiSort();
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
