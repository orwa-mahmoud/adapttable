/**
 * Headless editing state machine: one active cell, draft value, and the
 * Enter / Escape / Tab keyboard flow.
 *
 * Opt-in by design — calling this hook alone does nothing visible. Adapters
 * only surface editors when the table passes `onCellEdit` (see
 * {@link TableChrome.editing}) and a column sets `editable`.
 */
import { type CellEditingState } from "@adapttable/core";
import {
  cellEditingView,
  createCellEditSession,
} from "@adapttable/core/editing";
import { useMemo, useState, useSyncExternalStore } from "react";

import type { EditEventHandler } from "./editingEvents";

export type {
  CellEditingState,
  CellEditKeyAction,
  CellEditKeyOutcome,
  CellEditNavigation,
} from "@adapttable/core";
export { beginCellEdit } from "@adapttable/core/editing";

/**
 * What `useCellEditing` observes, when the host wired lifecycle events.
 *
 * @public
 */
export interface UseCellEditingOptions<TRow = unknown> {
  /** An editor opened. */
  onEditStart?: EditEventHandler<TRow>;
  /** The reader threw the draft away (Escape, or switching cells). */
  onEditCancel?: EditEventHandler<TRow>;
}

/**
 * Headless editing state machine: one active cell, draft value, and the
 * Enter / Escape / Tab keyboard flow.
 *
 * @typeParam TRow - The row type, when lifecycle observers are wired.
 * @param options - Optional start/cancel observers.
 * @returns The state machine.
 *
 * @public
 */
export function useCellEditing<TRow = unknown>(
  options: UseCellEditingOptions<TRow> = {}
): CellEditingState {
  const [session] = useState(() => createCellEditSession<TRow>(options));
  session.configure(options);
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  );
  return useMemo(() => cellEditingView(session, snapshot), [session, snapshot]);
}
