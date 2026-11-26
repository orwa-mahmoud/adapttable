import { resolveEditableCellDisplay } from "@adapttable/core/editing";
import { createElement, type ReactNode } from "react";

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
import {
  extendFeature,
  type FeatureRender,
  slotRender,
} from "../features/providers";
import {
  BATCH_EDIT_BAR,
  EDITABLE_CELL,
  type EditableCellSlotProps,
  ROW_EDIT_ACTIONS,
  TOOLBAR_EXTRAS,
  type ToolbarEntrySlotProps,
} from "../features/slotKeys";
import type {
  FeaturePatch,
  StaticTableFeature,
  TableFeature,
} from "../features/tableFeature";
import type { EditHistoryOptions } from "../props";
import type { AdapterFeatureComponent } from "./component";

/**
 * What a kit's editable cell is handed: the slot's props with the display
 * already resolved.
 *
 * The binding works the content out — the display the row precomputed, the
 * column's own `Cell`, or its accessor — so every kit draws the same thing
 * and none of them repeats the rule.
 *
 * @public
 */
export type EditableCellRenderProps<TRow = never> =
  EditableCellSlotProps<TRow> & {
    /** What the cell shows while nothing is being edited. */
    readonly display: ReactNode;
  };

/**
 * Kit renderers for the editing feature family.
 *
 * @public
 */
export interface AdapterEditingComponents {
  /** In-place cell editor. */
  readonly EditableCell: AdapterFeatureComponent<
    EditableCellRenderProps<unknown>
  >;
  /** Save/cancel actions for row editing. */
  readonly RowEditActions: AdapterFeatureComponent<
    RowEditActionsProps<unknown>
  >;
  /** Save/discard bar for batch editing. */
  readonly BatchEditBar: AdapterFeatureComponent<BatchEditBarProps<unknown>>;
  /** Undo and redo controls contributed to the toolbar. */
  readonly UndoRedoButtons: AdapterFeatureComponent<ToolbarEntrySlotProps>;
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
    options?: boolean | EditHistoryOptions
  ) => StaticTableFeature;
  /** Draw undo and redo controls. */
  readonly undoRedoButtons: () => StaticTableFeature;
  /** Hold edits until the batch is saved or discarded. */
  readonly batchEditing: <TRow>(
    onBatchEdit: (edits: readonly BatchRowEdit<TRow>[]) => unknown
  ) => TableFeature<TRow>;
}

/**
 * The kit's cell, with the content it shows when nothing is being edited
 * already worked out.
 *
 * Every kit resolved this the same way — the display the row precomputed, or
 * the column's own `Cell`, or its accessor — which is one rule in seven
 * places. It stays a component rather than a call inside the slot renderer so
 * the accessor keeps running in the cell's own memo scope: re-rendering a row
 * for selection or expansion must not re-run its data accessors.
 */
function withResolvedDisplay(
  Cell: AdapterFeatureComponent<EditableCellRenderProps<unknown>>
): AdapterFeatureComponent<EditableCellSlotProps<unknown>> {
  return function EditableCellWithDisplay(props) {
    const display = resolveEditableCellDisplay(
      props.display,
      props.column,
      (Cell) =>
        createElement(Cell, { row: props.row, rowIndex: props.rowIndex }),
      props.row
    );
    return createElement(Cell, { ...props, display });
  };
}

/** One resolved-display cell per kit cell, so every editing feature fills the
 * slot with the same component. */
const RESOLVED_CELLS = /* @__PURE__ */ new WeakMap<
  AdapterFeatureComponent<EditableCellRenderProps<unknown>>,
  readonly FeatureRender<never>[]
>();

function editableCellChrome(
  Cell: AdapterFeatureComponent<EditableCellRenderProps<unknown>>
): readonly FeatureRender<never>[] {
  let chrome = RESOLVED_CELLS.get(Cell);
  if (chrome === undefined) {
    const Resolved = withResolvedDisplay(Cell);
    chrome = [
      slotRender(EDITABLE_CELL, (props) => createElement(Resolved, props)),
    ];
    RESOLVED_CELLS.set(Cell, chrome);
  }
  return chrome;
}

function undoRedoChrome(
  UndoRedoButtons: AdapterFeatureComponent<ToolbarEntrySlotProps>
): readonly FeatureRender<never>[] {
  // Undo and redo sit where `undoRedoButtons` puts them in every kit, even in
  // a kit whose `editHistory` draws them.
  return [
    slotRender(
      TOOLBAR_EXTRAS,
      (props) => createElement(UndoRedoButtons, props),
      { orderAs: "undo-redo-buttons" }
    ),
  ];
}

/**
 * Cell editing drawn with a kit's editable cell.
 *
 * @param EditableCell - The kit's in-place cell editor.
 * @returns The kit's `editing` factory.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function createAdapterEditing(
  EditableCell: AdapterEditingComponents["EditableCell"]
): AdapterEditingFeatures["editing"] {
  const chrome = editableCellChrome(EditableCell);
  return (onCellEdit, extras) =>
    extendFeature(coreEditing(onCellEdit, extras), chrome);
}

/**
 * Row editing drawn with a kit's editable cell and row actions.
 *
 * @param EditableCell - The kit's in-place cell editor.
 * @param RowEditActions - The kit's save and cancel actions for a row.
 * @returns The kit's `rowEditing` factory.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function createAdapterRowEditing(
  EditableCell: AdapterEditingComponents["EditableCell"],
  RowEditActions: AdapterEditingComponents["RowEditActions"]
): AdapterEditingFeatures["rowEditing"] {
  const chrome = [
    ...editableCellChrome(EditableCell),
    slotRender(ROW_EDIT_ACTIONS, (props) =>
      createElement(RowEditActions, props)
    ),
  ];
  return (onRowEdit, extras) =>
    extendFeature(coreRowEditing(onRowEdit, extras), chrome);
}

/**
 * Batch editing drawn with a kit's editable cell and batch bar.
 *
 * @param EditableCell - The kit's in-place cell editor.
 * @param BatchEditBar - The kit's save and discard bar.
 * @returns The kit's `batchEditing` factory.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function createAdapterBatchEditing(
  EditableCell: AdapterEditingComponents["EditableCell"],
  BatchEditBar: AdapterEditingComponents["BatchEditBar"]
): AdapterEditingFeatures["batchEditing"] {
  const chrome = [
    ...editableCellChrome(EditableCell),
    slotRender(BATCH_EDIT_BAR, (props) => createElement(BatchEditBar, props)),
  ];
  return (onBatchEdit) => extendFeature(coreBatchEditing(onBatchEdit), chrome);
}

/**
 * Edit history, drawing the kit's undo and redo controls only when the kit's
 * contract couples them to history.
 *
 * @param UndoRedoButtons - The controls, for a kit whose history draws them.
 * @returns The kit's `editHistory` factory.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function createAdapterEditHistory(
  UndoRedoButtons?: AdapterEditingComponents["UndoRedoButtons"]
): AdapterEditingFeatures["editHistory"] {
  const chrome = UndoRedoButtons ? undoRedoChrome(UndoRedoButtons) : [];
  return (options = true) => extendFeature(coreEditHistory(options), chrome);
}

/**
 * Undo and redo controls drawn with the kit's buttons.
 *
 * @param UndoRedoButtons - The kit's controls; omitted when the kit's history
 *   already draws them.
 * @returns The kit's `undoRedoButtons` factory.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function createAdapterUndoRedoButtons(
  UndoRedoButtons?: AdapterEditingComponents["UndoRedoButtons"]
): AdapterEditingFeatures["undoRedoButtons"] {
  const chrome = UndoRedoButtons ? undoRedoChrome(UndoRedoButtons) : [];
  return () => extendFeature(coreUndoRedoButtons(), chrome);
}

/**
 * Bind core's editing lifecycle to one kit's editors and controls.
 *
 * @public
 */
export function createAdapterEditingFeatures(
  components: AdapterEditingComponents
): AdapterEditingFeatures {
  const historyDraws = components.historyIncludesControls === true;
  return {
    editing: createAdapterEditing(components.EditableCell),
    rowEditing: createAdapterRowEditing(
      components.EditableCell,
      components.RowEditActions
    ),
    dirtyIndicators: coreDirtyIndicators,
    editHistory: createAdapterEditHistory(
      historyDraws ? components.UndoRedoButtons : undefined
    ),
    undoRedoButtons: createAdapterUndoRedoButtons(
      historyDraws ? undefined : components.UndoRedoButtons
    ),
    batchEditing: createAdapterBatchEditing(
      components.EditableCell,
      components.BatchEditBar
    ),
  };
}
