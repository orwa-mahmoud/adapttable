import { createElement } from "react";

import type { BatchRowEdit } from "../editing/batchEditing";
import type {
  BatchEditBarProps,
  RowEditActionsProps,
} from "../editing/RowEditGate";
import { editHistory as coreEditHistory } from "../features/edit-history";
import {
  batchEditing as coreBatchEditing,
  dirtyIndicators as coreDirtyIndicators,
  editing as coreEditing,
  rowEditing as coreRowEditing,
} from "../features/editing";
import { undoRedoButtons as coreUndoRedoButtons } from "../features/factories";
import { extendFeature, slotRender } from "../features/providers";
import {
  BATCH_EDIT_BAR,
  EDITABLE_CELL,
  type EditableCellSlotProps,
  ROW_EDIT_ACTIONS,
  TOOLBAR_EXTRAS,
  type ToolbarExtrasSlotProps,
} from "../features/slotKeys";
import type {
  FeaturePatch,
  StaticTableFeature,
  TableFeature,
} from "../features/tableFeature";
import type { AdapterFeatureComponent } from "./component";

/**
 * Kit renderers for the editing feature family.
 *
 * @public
 */
export interface AdapterEditingComponents {
  /** In-place cell editor. */
  readonly EditableCell: AdapterFeatureComponent<EditableCellSlotProps<never>>;
  /** Save/cancel actions for row editing. */
  readonly RowEditActions: AdapterFeatureComponent<RowEditActionsProps<never>>;
  /** Save/discard bar for batch editing. */
  readonly BatchEditBar: AdapterFeatureComponent<BatchEditBarProps<never>>;
  /** Undo and redo controls contributed to the toolbar. */
  readonly UndoRedoButtons: AdapterFeatureComponent<ToolbarExtrasSlotProps>;
  /**
   * Whether composing edit history also draws undo/redo controls.
   *
   * Most kits keep history state and controls as separate features; set this
   * only when the kit's established contract couples them.
   */
  readonly historyIncludesControls?: boolean;
}

/**
 * Editing factories bound to one kit's visible components.
 *
 * @public
 */
export interface AdapterEditingFeatures {
  /** Edit a single cell. */
  readonly editing: <TRow>(
    onCellEdit: (row: TRow, key: string, nextValue: unknown) => unknown,
    extras?: FeaturePatch<TRow>
  ) => TableFeature<TRow>;
  /** Edit a whole row. */
  readonly rowEditing: <TRow>(
    onRowEdit: (row: TRow, patch: Readonly<Record<string, unknown>>) => unknown,
    extras?: FeaturePatch<TRow>
  ) => TableFeature<TRow>;
  /** Mark unsaved rows and cells. */
  readonly dirtyIndicators: () => StaticTableFeature;
  /** Track edit history. */
  readonly editHistory: (
    options?: boolean | { depth?: number }
  ) => StaticTableFeature;
  /** Draw undo and redo controls. */
  readonly undoRedoButtons: () => StaticTableFeature;
  /** Hold edits until the batch is saved or discarded. */
  readonly batchEditing: <TRow>(
    onBatchEdit: (edits: readonly BatchRowEdit<TRow>[]) => unknown
  ) => TableFeature<TRow>;
}

/**
 * Bind core's editing lifecycle to one kit's editors and controls.
 *
 * @public
 */
export function createAdapterEditingFeatures(
  components: AdapterEditingComponents
): AdapterEditingFeatures {
  const cellChrome = [
    slotRender(EDITABLE_CELL, (props) =>
      createElement(components.EditableCell, props)
    ),
    slotRender(ROW_EDIT_ACTIONS, (props) =>
      createElement(components.RowEditActions, props)
    ),
  ];
  const undoChrome = [
    slotRender(TOOLBAR_EXTRAS, (props) =>
      createElement(components.UndoRedoButtons, props)
    ),
  ];

  function editing<TRow>(
    onCellEdit: (row: TRow, key: string, nextValue: unknown) => unknown,
    extras?: FeaturePatch<TRow>
  ): TableFeature<TRow> {
    return extendFeature(coreEditing(onCellEdit, extras), cellChrome);
  }

  function rowEditing<TRow>(
    onRowEdit: (row: TRow, patch: Readonly<Record<string, unknown>>) => unknown,
    extras?: FeaturePatch<TRow>
  ): TableFeature<TRow> {
    return extendFeature(coreRowEditing(onRowEdit, extras), cellChrome);
  }

  function editHistory(
    options: boolean | { depth?: number } = true
  ): StaticTableFeature {
    return extendFeature(
      coreEditHistory(options),
      components.historyIncludesControls === true ? undoChrome : []
    );
  }

  function undoRedoButtons(): StaticTableFeature {
    return extendFeature(coreUndoRedoButtons(), undoChrome);
  }

  function batchEditing<TRow>(
    onBatchEdit: (edits: readonly BatchRowEdit<TRow>[]) => unknown
  ): TableFeature<TRow> {
    return extendFeature(coreBatchEditing(onBatchEdit), [
      ...cellChrome,
      slotRender(BATCH_EDIT_BAR, (props) =>
        createElement(components.BatchEditBar, props)
      ),
    ]);
  }

  return {
    editing,
    rowEditing,
    dirtyIndicators: coreDirtyIndicators,
    editHistory,
    undoRedoButtons,
    batchEditing,
  };
}
