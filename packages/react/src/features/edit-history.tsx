/**
 * Edit history — `@adapttable/<kit>/editing`.
 *
 * The undo stack lives on this entry. A table that never imports it never
 * records gestures. The hook mounts in-tree through {@link EDIT_HISTORY_LIVE}.
 */
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { useTableEditHistory } from "../editing/editHistory";
import type { EditHistoryHandle, EditHistoryOptions } from "../props";
import { slotRender } from "./providers";
import { EDIT_HISTORY_LIVE, type EditHistoryLiveSlotProps } from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

function LiveEditHistory({
  children,
  editHistory,
  columns,
  onCellEdit,
}: EditHistoryLiveSlotProps<never>): ReactNode {
  const result = useTableEditHistory({
    editHistory,
    columns,
    onCellEdit,
  });
  useReportHistory(
    typeof editHistory === "object" ? editHistory.onChange : undefined,
    result.history
  );
  return children(result);
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
    id: "edit-history",
    apply: () => ({ editHistory: options }),
    renders: [
      slotRender(EDIT_HISTORY_LIVE, (props) => <LiveEditHistory {...props} />),
    ],
  };
}
