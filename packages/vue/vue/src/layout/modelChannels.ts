import type {
  ConfirmHandler,
  Direction,
  EditHistoryState,
  EditingBundle,
  RowAction,
} from "@adapttable/core";
/** Typed channels owned by the binding; optional factories publish their models. */
import {
  EDITABLE_CELL,
  type EditableCellSlotProps,
  type FeatureSlotKey,
  type FeatureStateKey,
  featureStateKey,
  FILTER_HEADER,
  type FilterHeaderControlProps,
  type RowPinningState,
} from "@adapttable/core/binding";
import type { VNodeChild } from "vue";

import type { Attrs } from "../attrs";
import type { ColumnDef } from "../columnDef";
import type { UseDataTableResult } from "../useDataTable";
import type { ResolvedTableOptions } from "../useDataTableShell";
import type { DesktopTableModel, MobileCardsModel } from "./tableModels";
export const ROW_PINNING_MODEL = featureStateKey<RowPinningState<unknown>>(
  "vue-row-pinning-model"
);
/** The same stable channel, specialized to the current table's row type. */
export function rowPinningModelKey<TRow>(): FeatureStateKey<
  RowPinningState<TRow>
> {
  return ROW_PINNING_MODEL;
}
export interface TableBodyProjectionInput<TRow> {
  readonly table: UseDataTableResult<TRow>;
  readonly options: ResolvedTableOptions<TRow>;
  readonly desktop: DesktopTableModel<TRow>;
  readonly mobile: MobileCardsModel<TRow>;
  readonly pinning?: RowPinningState<TRow>;
}
export interface TableBodyProjection<TRow> {
  readonly desktop: DesktopTableModel<TRow>;
  readonly mobile: MobileCardsModel<TRow>;
}
export type TableBodyProjector<TRow> = (
  input: TableBodyProjectionInput<TRow>
) => TableBodyProjection<TRow>;

export const EDITING_MODEL =
  featureStateKey<EditingBundle<unknown>>("vue-editing-model");
export function editingModelKey<TRow>(): FeatureStateKey<EditingBundle<TRow>> {
  return EDITING_MODEL as unknown as FeatureStateKey<EditingBundle<TRow>>;
}
export function editableCellSlotKey<TRow>(): FeatureSlotKey<
  EditableCellSlotProps<TRow, EditingBundle<TRow>, ColumnDef<TRow>, VNodeChild>
> {
  return EDITABLE_CELL as unknown as FeatureSlotKey<
    EditableCellSlotProps<
      TRow,
      EditingBundle<TRow>,
      ColumnDef<TRow>,
      VNodeChild
    >
  >;
}
export interface RowActionsModel<TRow> {
  readonly canAdd: boolean;
  readonly addRow: () => unknown;
  readonly actions: readonly RowAction<TRow>[];
  readonly rowActions: RowAction<TRow>[] | undefined;
  readonly hasRowActions: boolean;
  readonly hostActions?: readonly RowAction<TRow>[];
}
export const ROW_ACTIONS_MODEL = featureStateKey<RowActionsModel<unknown>>(
  "vue-row-actions-model"
);
export function rowActionsModelKey<TRow>(): FeatureStateKey<
  RowActionsModel<TRow>
> {
  return ROW_ACTIONS_MODEL;
}
export interface ColumnResizeModel {
  readonly attrs: (key: string, label: string) => Attrs | undefined;
}
export const COLUMN_RESIZE_MODEL = featureStateKey<ColumnResizeModel>(
  "vue-column-resize-model"
);

export interface RowActionControl<TRow> {
  readonly key: string;
  readonly label: string;
  readonly action: RowAction<TRow>;
  readonly attrs: Attrs;
}
export interface RowActionControlsInput<TRow> {
  readonly row: TRow;
  readonly actions: readonly RowAction<TRow>[];
  readonly confirm: ConfirmHandler;
  readonly cancelLabel: string;
  readonly enabled: () => boolean;
}
export type RowActionControlsProjector<TRow> = (
  input: RowActionControlsInput<TRow>
) => readonly RowActionControl<TRow>[];

export interface VueHeaderFilterControlProps<
  TRow,
> extends FilterHeaderControlProps<TRow> {
  readonly dir?: Direction;
}
export interface HeaderFilterModel<TRow> {
  readonly controls: ReadonlyMap<string, VueHeaderFilterControlProps<TRow>>;
}
export const HEADER_FILTER_MODEL = featureStateKey<HeaderFilterModel<unknown>>(
  "vue-header-filter-model"
);
export function headerFilterModelKey<TRow>(): FeatureStateKey<
  HeaderFilterModel<TRow>
> {
  return HEADER_FILTER_MODEL as unknown as FeatureStateKey<
    HeaderFilterModel<TRow>
  >;
}
export function headerFilterSlotKey<TRow>(): FeatureSlotKey<
  VueHeaderFilterControlProps<TRow>
> {
  return FILTER_HEADER as unknown as FeatureSlotKey<
    VueHeaderFilterControlProps<TRow>
  >;
}

export const EDIT_HISTORY_MODEL = featureStateKey<EditHistoryState<unknown>>(
  "vue-edit-history-model"
);
export function editHistoryModelKey<TRow>(): FeatureStateKey<
  EditHistoryState<TRow>
> {
  return EDIT_HISTORY_MODEL;
}
