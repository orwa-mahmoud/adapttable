/** Edit history adapts core's gesture stack to Angular signals and host callbacks. */
import {
  createEditHistory,
  type EditHistoryState,
  editHistoryView,
  recordingCellEdit,
  resolveEditHistory,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import type { ColumnDef } from "../columnDef";
import { fromStore, type MaybeSignal, readMaybe } from "../store";

/** Host controls for the current edit history. @public */
export interface EditHistoryHandle {
  /** Restore the previous gesture through the host. */
  readonly undo: () => number;
  /** Replay the last undone gesture through the host. */
  readonly redo: () => number;
  /** Forget the recorded gestures. */
  readonly clear: () => void;
  /** Whether undo is available. */
  readonly canUndo: boolean;
  /** Whether redo is available. */
  readonly canRedo: boolean;
}

/** History depth and host observation. @public */
export interface EditHistoryOptions {
  /** Maximum number of gestures, default 50. */
  readonly depth?: number;
  /** Receives stable controls when availability changes. */
  readonly onChange?: (history: EditHistoryHandle) => void;
}

/** The table's history configuration and original commit channel. @public */
export interface TableEditHistoryProps<TRow> {
  /** History is opt-in. */
  readonly editHistory?: boolean | EditHistoryOptions;
  /** Every column, including hidden ones, for reading original values. */
  readonly columns: readonly ColumnDef<TRow>[];
  /** The original host write, used by every replay. */
  readonly onCellEdit?: (row: TRow, key: string, value: unknown) => unknown;
}

/** Signals over core history, plus the recording inline commit channel. @public */
export function injectTableEditHistory<TRow>(
  options: MaybeSignal<TableEditHistoryProps<TRow>>,
  injector?: Injector
): Signal<{
  readonly history: EditHistoryState<TRow>;
  readonly onCellEdit: TableEditHistoryProps<TRow>["onCellEdit"];
}> {
  if (!injector) assertInInjectionContext(injectTableEditHistory);
  const context = injector ?? inject(Injector);
  const configuration = computed(() => {
    const current = readMaybe(options);
    return {
      ...resolveEditHistory(current.editHistory),
      columns: current.columns,
      onCellEdit: current.onCellEdit,
    };
  });
  const controller = createEditHistory(untracked(configuration));
  effect(
    () => {
      controller.configure(configuration());
    },
    { injector: context }
  );
  const counts = fromStore(controller, { injector: context });
  const history = computed(() =>
    editHistoryView(controller, counts(), configuration().enabled)
  );
  const onCellEdit = computed(() =>
    recordingCellEdit(readMaybe(options).onCellEdit, controller.record)
  );
  const availability = computed(
    () => ({ canUndo: history().canUndo, canRedo: history().canRedo }),
    {
      equal: (left, right) =>
        left.canUndo === right.canUndo && left.canRedo === right.canRedo,
    }
  );
  const observer = computed(() => {
    const value = readMaybe(options).editHistory;
    return typeof value === "object" ? value.onChange : undefined;
  });
  effect(
    () => {
      const notify = observer();
      const flags = availability();
      if (notify)
        untracked(() => {
          notify({
            undo: controller.undo,
            redo: controller.redo,
            clear: controller.clear,
            ...flags,
          });
        });
    },
    { injector: context }
  );
  return computed(() => ({ history: history(), onCellEdit: onCellEdit() }));
}
