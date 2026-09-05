import {
  applyColumnNames,
  declaredColumnLayout,
  visibleColumns,
  type TableLayout,
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
  layout: TableLayout,
  mobileIdentityColumns = 3
): ColumnDef<TRow>[] {
  return visibleColumns<ColumnDef<TRow>>(
    columns,
    layout,
    mobileIdentityColumns
  );
}

/** Preserve {@link ColumnDef} through neutral {@link declaredColumnLayout}. */
export function declaredReactColumnLayout<TRow>(
  columns: readonly ColumnDef<TRow>[]
): ReactUseColumnLayoutResult<TRow> {
  return declaredColumnLayout<ColumnDef<TRow>>(columns);
}
