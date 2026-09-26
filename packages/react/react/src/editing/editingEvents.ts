/**
 * Editing lifecycle events — observe a commit, never own it.
 *
 * Integrators hook these for analytics, toasts and side effects. A handler
 * that throws, returns a value, or tries to rewrite the payload must not be
 * able to change whether a commit lands: the table already decided, and the
 * events only report what happened.
 */
import {
  type EditEvent,
  type EditEventHandler,
  type EditLifecycle,
  observeEdit,
} from "@adapttable/core";
import { useMemo } from "react";

import { useEventCallback } from "../hooks/useEventCallback";

export type {
  EditEvent,
  EditEventHandler,
  EditLifecycle,
  EditUnit,
} from "@adapttable/core";
export { observeEdit } from "@adapttable/core";

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
