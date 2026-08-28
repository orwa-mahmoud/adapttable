/**
 * Editing lifecycle events — observe a commit, never own it.
 *
 * Integrators hook these for analytics, toasts and side effects. A handler
 * that throws, returns a value, or tries to rewrite the payload must not be
 * able to change whether a commit lands: the table already decided, and the
 * events only report what happened.
 */
import { useMemo } from "react";

import { useEventCallback } from "../hooks/useEventCallback";
import { devWarn } from "../utils/devWarn";

/**
 * Which commit unit produced an event.
 *
 * @public
 */
export type EditUnit = "cell" | "row" | "batch";

/**
 * One lifecycle event. `columnKey` is the edited field for a cell, and empty
 * for a row or batch whose payload is the whole patch (or list of patches).
 *
 * @public
 */
export interface EditEvent<TRow> {
  /** The row as it was when the gesture started. */
  row: TRow;
  /** Its stable id. */
  rowId: string;
  /** The column, or `""` when the unit is the whole row or a batch. */
  columnKey: string;
  /** What the reader arrived at — the parsed value, the patch, or the edits. */
  value: unknown;
  /** What was there before. */
  previousValue: unknown;
  /** Which commit unit fired this. */
  unit: EditUnit;
  /** Why a commit was refused, or why a save rejected. */
  error?: string;
}

/**
 * A host callback that observes one kind of event.
 *
 * @public
 */
export type EditEventHandler<TRow> = (event: EditEvent<TRow>) => void;

/**
 * The five observers a host may wire. All optional, all inert when omitted.
 *
 * @internal
 */
export interface EditLifecycle<TRow> {
  /** An editor opened. */
  onEditStart?: EditEventHandler<TRow>;
  /** The reader threw the draft away. */
  onEditCancel?: EditEventHandler<TRow>;
  /** The host received the value. */
  onEditCommit?: EditEventHandler<TRow>;
  /** A validator refused the value; the editor stayed open. */
  onValidationFail?: EditEventHandler<TRow>;
  /** A save promise rejected. */
  onEditError?: EditEventHandler<TRow>;
}

/**
 * Call an observer without letting it own the outcome. A throw is reported
 * and swallowed: the commit already happened, or the cancel already did, and
 * a side-effect that blows up must not rewind it.
 */
export function observeEdit<TRow>(
  handler: EditEventHandler<TRow> | undefined,
  event: EditEvent<TRow>
): void {
  if (!handler) return;
  try {
    handler(event);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    devWarn(
      `an onEdit* handler threw (${detail}) — the table ignored it so the commit could finish`
    );
  }
}

/**
 * Latch one observer: stable identity, missing stays missing. Calling through
 * a no-op would still look like "someone is listening".
 */
function useObservedEdit<TRow>(
  handler: EditEventHandler<TRow> | undefined
): EditEventHandler<TRow> | undefined {
  const stable = useEventCallback((event: EditEvent<TRow>) => {
    observeEdit(handler, event);
  });
  return handler ? stable : undefined;
}

/**
 * Stable identities for the five observers, so a host's inline arrows never
 * repaint rows. The returned object is itself stable while the set of wired
 * handlers does not change — `editing` memoizes on it.
 */
export function useEditLifecycle<TRow>(
  props: EditLifecycle<TRow>
): EditLifecycle<TRow> {
  const onEditStart = useObservedEdit(props.onEditStart);
  const onEditCancel = useObservedEdit(props.onEditCancel);
  const onEditCommit = useObservedEdit(props.onEditCommit);
  const onValidationFail = useObservedEdit(props.onValidationFail);
  const onEditError = useObservedEdit(props.onEditError);
  return useMemo(
    () => ({
      onEditStart,
      onEditCancel,
      onEditCommit,
      onValidationFail,
      onEditError,
    }),
    [onEditStart, onEditCancel, onEditCommit, onValidationFail, onEditError]
  );
}
