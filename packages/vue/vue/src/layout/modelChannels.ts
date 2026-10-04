import type {
  ConfirmHandler,
  Direction,
  EditHistoryState,
  EditingBundle,
  RowAction,
} from "@adapttable/core";
/** Typed channels owned by the binding; optional factories publish their models. */
import {
  BATCH_EDIT_BAR,
  type BatchEditBarProps,
  EDITABLE_CELL,
  type EditableCellSlotProps,
  type FeatureSlotKey,
  featureSlotKey,
  type FeatureStateKey,
  featureStateKey,
  FILTER_HEADER,
  type FilterHeaderControlProps,
  ROW_EDIT_ACTIONS,
  type RowEditActionsProps,
  type RowPinningState,
} from "@adapttable/core/binding";
import type { VNodeChild } from "vue";

import type { Attrs } from "../attrs";
import type { ColumnDef } from "../columnDef";
import type {
  TableGrouping,
  TableRowDetail,
  TableTree,
} from "../hierarchy/models";
import type { TableRowInventory } from "../hierarchy/rowInventory";
import type { RowSelection } from "../selection/selection";
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
  readonly rowInventory?: TableRowInventory<TRow>;
  readonly options: ResolvedTableOptions<TRow>;
  readonly desktop: DesktopTableModel<TRow>;
  readonly mobile: MobileCardsModel<TRow>;
  readonly pinning?: RowPinningState<TRow>;
  readonly grouping?: TableGrouping<TRow>;
  readonly tree?: TableTree<TRow>;
  readonly detail?: TableRowDetail<TRow>;
  readonly selection?: RowSelection;
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
  return featureStateKey<EditingBundle<TRow>>(EDITING_MODEL.id);
}
export function editableCellSlotKey<TRow>(): FeatureSlotKey<
  EditableCellSlotProps<TRow, EditingBundle<TRow>, ColumnDef<TRow>, VNodeChild>
> {
  return featureSlotKey<
    EditableCellSlotProps<
      TRow,
      EditingBundle<TRow>,
      ColumnDef<TRow>,
      VNodeChild
    >
  >(EDITABLE_CELL.id, { single: EDITABLE_CELL.single });
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
  return featureStateKey<HeaderFilterModel<TRow>>(HEADER_FILTER_MODEL.id);
}
export function headerFilterSlotKey<TRow>(): FeatureSlotKey<
  VueHeaderFilterControlProps<TRow>
> {
  return featureSlotKey<VueHeaderFilterControlProps<TRow>>(FILTER_HEADER.id, {
    single: FILTER_HEADER.single,
  });
}

export const EDIT_HISTORY_MODEL = featureStateKey<EditHistoryState<unknown>>(
  "vue-edit-history-model"
);
export function editHistoryModelKey<TRow>(): FeatureStateKey<
  EditHistoryState<TRow>
> {
  return EDIT_HISTORY_MODEL;
}

/** Optional editing structure; the model supplies only props and host actions. */
export interface EditingChromeModel<TRow> {
  readonly row?: (
    row: TRow,
    rowId: string,
    actions: readonly RowAction<TRow>[] | undefined
  ) => {
    readonly props: RowEditActionsProps<TRow>;
    readonly actions: readonly RowAction<TRow>[];
  };
  readonly batch?: BatchEditBarProps<TRow>;
}
export const EDITING_CHROME_MODEL = featureStateKey<
  EditingChromeModel<unknown>
>("vue-editing-chrome-model");
export function editingChromeModelKey<TRow>(): FeatureStateKey<
  EditingChromeModel<TRow>
> {
  return featureStateKey<EditingChromeModel<TRow>>(EDITING_CHROME_MODEL.id);
}
export function rowEditActionsSlotKey<TRow>(): FeatureSlotKey<
  RowEditActionsProps<TRow>
> {
  return featureSlotKey<RowEditActionsProps<TRow>>(ROW_EDIT_ACTIONS.id, {
    single: ROW_EDIT_ACTIONS.single,
  });
}
export function batchEditBarSlotKey<TRow>(): FeatureSlotKey<
  BatchEditBarProps<TRow>
> {
  return BATCH_EDIT_BAR;
}
