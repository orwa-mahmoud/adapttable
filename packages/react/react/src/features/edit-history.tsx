/**
 * Edit history — `@adapttable/<kit>/editing`.
 *
 * The undo stack lives on this entry. A table that never imports it never
 * records gestures. The hook mounts in-tree as the `EDIT_HISTORY_STAGE`
 * chrome stage, before the stages that edit.
 */
import { type BatchEditHandler, type EditHistoryState } from "@adapttable/core";
import { coreEditHistory } from "@adapttable/core/binding";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import type { ColumnDef } from "../columnDef";
import { asBatchGesture, useTableEditHistory } from "../editing/editHistory";
import type { EditHistoryHandle, EditHistoryOptions } from "../props";
import { FeatureStateScope } from "./featureState";
import { slotRender } from "./providers";
import {
  type ChromeExtraDraw,
  type ChromeExtraSlotProps,
  EDIT_HISTORY_STAGE,
} from "./slotKeys";
import { EDIT_HISTORY_STATE } from "./stateKeys";
import type { StaticTableFeature } from "./tableFeature";

/** What the recorder reads, and what it hands the table. */
interface EditHistoryRecorderProps<TRow> {
  /** History options from the composed feature or the prop. */
  readonly editHistory: boolean | EditHistoryOptions | undefined;
  /** Columns, for reading a cell's value before it changes. */
  readonly columns: readonly ColumnDef<TRow>[];
  /** The host's commit channel. */
  readonly onCellEdit:
    ((row: TRow, key: string, nextValue: unknown) => unknown) | undefined;
  /** The host's batch channel, recorded as one gesture per batch. */
  readonly onBatchEdit: BatchEditHandler<TRow> | undefined;
  /** The table; receives history and the recording commit channels. */
  readonly children: (result: {
    history: EditHistoryState<TRow>;
    onCellEdit:
      ((row: TRow, key: string, nextValue: unknown) => unknown) | undefined;
    onBatchEdit?: BatchEditHandler<TRow>;
  }) => ReactNode;
}

function LiveEditHistory<TRow>({
  children,
  editHistory,
  columns,
  onCellEdit,
  onBatchEdit,
}: EditHistoryRecorderProps<TRow>): ReactNode {
  const result = useTableEditHistory({
    editHistory,
    columns,
    onCellEdit,
  });
  useReportHistory(
    typeof editHistory === "object" ? editHistory.onChange : undefined,
    result.history
  );
  // The host's batch callback is recorded here, inside the editing entry, so
  // a table that never imports editing does not carry the gesture wrapper.
  return children({
    ...result,
    onBatchEdit: asBatchGesture(onBatchEdit, result.history.record),
  });
}

/**
 * The history as a chrome stage: records edits, and hands the stages after it
 * and the table the recording commit channels and the undo state.
 */
function EditHistoryStage<TRow>({
  chrome,
  props,
  children,
}: Readonly<ChromeExtraSlotProps<TRow>>): ReactNode {
  return (
    <LiveEditHistory
      editHistory={props.editHistory}
      columns={chrome.allColumns}
      onCellEdit={props.onCellEdit}
      onBatchEdit={props.onBatchEdit}
    >
      {(result) => (
        <FeatureStateScope
          stateKey={EDIT_HISTORY_STATE}
          value={result.history as EditHistoryState<unknown>}
        >
          {children(chrome, {
            ...props,
            onCellEdit: result.onCellEdit,
            onBatchEdit: result.onBatchEdit ?? props.onBatchEdit,
          })}
        </FeatureStateScope>
      )}
    </LiveEditHistory>
  );
}

/**
 * Hand the host its history, and hand it again whenever what it can do moves.
 *
 * The functions in the handle are stable and always act on the latest
 * history, so a host that keeps the handle in state is re-told only when
 * `canUndo` or `canRedo` changes — never on every render.
 */
function useReportHistory(
  onChange: ((history: EditHistoryHandle) => void) | undefined,
  history: {
    readonly undo: () => number;
    readonly redo: () => number;
    readonly clear: () => void;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
  }
): void {
  const latest = useRef(history);
  latest.current = history;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const actions = useMemo(
    () => ({
      undo: () => latest.current.undo(),
      redo: () => latest.current.redo(),
      clear: () => {
        latest.current.clear();
      },
    }),
    []
  );
  const { canUndo, canRedo } = history;
  const wired = onChange !== undefined;
  useEffect(() => {
    if (!wired) return;
    onChangeRef.current?.({ ...actions, canUndo, canRedo });
  }, [actions, canUndo, canRedo, wired]);
}

/**
 * Track edits so they can be undone and redone.
 *
 * `editHistory({ onChange })` hands a host the history — undo, redo, whether
 * each can run, and a reset — for a control of its own.
 *
 * @public
 */
export function editHistory(
  options: boolean | EditHistoryOptions = true
): StaticTableFeature {
  return {
    ...coreEditHistory(options),
    renders: [
      slotRender<ChromeExtraDraw>(EDIT_HISTORY_STAGE, (props) => (
        <EditHistoryStage {...props} />
      )),
    ],
  };
}
