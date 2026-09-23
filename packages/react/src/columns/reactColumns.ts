import {
  applyColumnNames,
  declaredColumnLayout,
  type TableLayout,
  visibleColumns,
} from "@adapttable/core";

import type { ColumnDef } from "../columnDef";
import type { ReactUseColumnLayoutResult } from "./useColumnLayout";

/** Preserve {@link ColumnDef} through neutral {@link applyColumnNames}. */
export function applyReactColumnNames<TRow>(
  columns: readonly ColumnDef<TRow>[],
  names?: Readonly<Record<string, string>>
): ColumnDef<TRow>[] {
  return applyColumnNames<ColumnDef<TRow>>(columns, names);
}

/** Preserve {@link ColumnDef} through neutral {@link visibleColumns}. */
export function visibleReactColumns<TRow>(
  columns: readonly ColumnDef<TRow>[],
  layout: TableLayout
): ColumnDef<TRow>[] {
  return visibleColumns<ColumnDef<TRow>>(columns, layout);
}

/** Preserve {@link ColumnDef} through neutral {@link declaredColumnLayout}. */
export function declaredReactColumnLayout<TRow>(
  columns: readonly ColumnDef<TRow>[]
): ReactUseColumnLayoutResult<TRow> {
  return declaredColumnLayout<ColumnDef<TRow>>(columns);
}
