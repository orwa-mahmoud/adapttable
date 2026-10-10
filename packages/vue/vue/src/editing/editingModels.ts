/** Thin, scope-owned projections of the shared editing stores. */
import {
  asBatchGesture,
  batchEditingView,
  type BatchEditStoreOptions,
  type BatchRowEdit,
  type CellEditHandler,
  type CellEditingState,
  cellEditingView,
  type CellEditSessionOptions,
  type CellSaveStoreOptions,
  cellSaveView,
  createBatchEditStore,
  createCellEditSession,
  createCellSaveStore,
  createDirtyCellStore,
  createEditConflictStore,
  createEditHistory,
  createEditValidationStore,
  createRowEditStore,
  type DirtyCellState,
  type DirtyCellStoreOptions,
  dirtyCellView,
  dirtyMarkerView,
  type EditableCellController,
  editableCellController,
  type EditableColumnLike,
  type EditConflictHandler,
  type EditConflictPolicy,
  editConflictView,
  type EditHistoryControllerOptions,
  type EditHistoryState,
  editHistoryView,
  type EditingBundle,
  type EditLifecycle,
  type EditValidationStoreOptions,
  editValidationView,
  type FeatureHostState,
  readCellValue,
  recordingCellEdit,
  resolveEditHistory,
  rowEditingView,
  type RowEditStoreOptions,
} from "@adapttable/core";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
} from "vue";

import {
  type ExternalStoreOptions,
  requireScope,
  useExternalStore,
  useScopeActivity,
} from "../store";

export function useCellEditing<TRow>(
  input: MaybeRefOrGetter<CellEditSessionOptions<TRow>> = {},
  activity: ExternalStoreOptions = {}
) {
  requireScope("useCellEditing");
  const session = createCellEditSession(toValue(input));
  watch(
    () => toValue(input),
    (options) => session.configure(options),
    { flush: "sync" }
  );
  const snapshot = useExternalStore(session, activity);
  onScopeDispose(() => {
    session.configure({});
    session.close();
  });
  return computed(() => cellEditingView(session, snapshot.value));
}
export function useCellSaveState<TRow>(
  input: MaybeRefOrGetter<CellSaveStoreOptions<TRow>> = {},
  activity: ExternalStoreOptions = {}
) {
  requireScope("useCellSaveState");
  const store = createCellSaveStore(toValue(input));
  watch(
    () => toValue(input),
    (options) => store.configure(options),
    { flush: "sync" }
  );
  const snapshot = useExternalStore(store, activity);
  onScopeDispose(() => store.configure({}));
  return computed(() =>
    cellSaveView(store, snapshot.value, toValue(input).onRollback !== undefined)
  );
}
export function useEditValidation<TRow>(
  input: MaybeRefOrGetter<EditValidationStoreOptions<TRow>> = {},
  activity: ExternalStoreOptions = {}
) {
  requireScope("useEditValidation");
  const store = createEditValidationStore(toValue(input));
  const pending = new Map<
    string,
    { rowId: string; columnKey: string; count: number }
  >();
  watch(
    [() => toValue(input).validateRow, () => toValue(input).applyEdit],
    () => {
      for (const target of pending.values())
        store.clear(target.rowId, target.columnKey);
      store.configure(toValue(input));
    },
    { flush: "sync" }
  );
  const snapshot = useExternalStore(store, activity);
  let disposed = false;
  const check: typeof store.check = async (value) => {
    if (disposed) return { allowed: false };
    const key = `${value.target.rowId}\u0000${value.target.columnKey}`;
    const target = pending.get(key) ?? { ...value.target, count: 0 };
    target.count += 1;
    pending.set(key, target);
    try {
      return await store.check(value);
    } finally {
      target.count -= 1;
      if (target.count === 0) pending.delete(key);
    }
  };
  onScopeDispose(() => {
    disposed = true;
    store.clearAll();
    store.configure({});
    pending.clear();
  });
  return computed(() => ({
    ...editValidationView(
      store,
      snapshot.value,
      toValue(input).validateRow !== undefined
    ),
    check,
  }));
}
export type DirtyEdits = Readonly<
  Pick<DirtyCellState, "count" | "confirm" | "confirmRow" | "confirmAll">
>;
export interface DirtyCellsOptions extends DirtyCellStoreOptions {
  readonly onDirtyChange?: (dirty: DirtyEdits) => void;
}
export function useDirtyCells(
  input: MaybeRefOrGetter<DirtyCellsOptions> = {},
  activity: ExternalStoreOptions = {}
) {
  requireScope("useDirtyCells");
  const store = createDirtyCellStore(toValue(input));
  watch(
    () => toValue(input).enabled,
    (enabled) => {
      if (!enabled) store.confirmAll();
    },
    { flush: "sync" }
  );
  watch(
    () => toValue(input),
    (options) => store.configure(options),
    { flush: "sync" }
  );
  const snapshot = useExternalStore(store, activity);
  const view = computed(() => dirtyCellView(store, snapshot.value));
  watch(
    [view, () => toValue(input).onDirtyChange],
    ([value, notify]) => {
      const { count, confirm, confirmRow, confirmAll } = value;
      notify?.({ count, confirm, confirmRow, confirmAll });
    },
    { immediate: true, flush: "sync" }
  );
  onScopeDispose(() => store.configure({ enabled: false }));
  return view;
}
export function useRowEditing<TRow>(
  input: MaybeRefOrGetter<RowEditStoreOptions<TRow>>,
  activity: ExternalStoreOptions = {}
) {
  requireScope("useRowEditing");
  const localActive = useScopeActivity();
  const active = computed(
    () => localActive.value && (toValue(activity.active) ?? true)
  );
  const options = computed(() => ({
    ...toValue(input),
    enabled: active.value && toValue(input).enabled === true,
  }));
  const store = shallowRef(createRowEditStore(options.value));
  watch(
    () => toValue(input).enabled === true,
    (enabled, previous) => {
      if (previous && !enabled) {
        store.value.dispose?.();
        store.value = createRowEditStore(options.value);
      }
    },
    { flush: "sync" }
  );
  watch(options, (options) => store.value.configure(options), {
    flush: "sync",
  });
  const snapshot = useExternalStore(store, activity);
  onScopeDispose(() => {
    store.value.configure({ enabled: false, columns: [] });
    store.value.cancel();
    store.value.dispose?.();
  });
  return computed(() =>
    rowEditingView(store.value, snapshot.value, toValue(input).featureHost)
  );
}
export function useBatchEditing<TRow>(
  input: MaybeRefOrGetter<BatchEditStoreOptions<TRow>>,
  activity: ExternalStoreOptions = {}
) {
  requireScope("useBatchEditing");
  const localActive = useScopeActivity();
  const active = computed(
    () => localActive.value && (toValue(activity.active) ?? true)
  );
  const options = computed(() => ({
    ...toValue(input),
    enabled: active.value && toValue(input).enabled === true,
  }));
  const store = shallowRef(createBatchEditStore(options.value));
  watch(
    () => toValue(input).enabled === true,
    (enabled, previous) => {
      if (previous && !enabled) {
        store.value.dispose?.();
        store.value = createBatchEditStore(options.value);
      }
    },
    { flush: "sync" }
  );
  watch(options, (options) => store.value.configure(options), {
    flush: "sync",
  });
  const snapshot = useExternalStore(store, activity);
  onScopeDispose(() => {
    store.value.configure({ enabled: false, columns: [] });
    store.value.cancelAll();
    store.value.dispose?.();
  });
  return computed(() =>
    batchEditingView(store.value, snapshot.value, toValue(input))
  );
}
export function useEditHistory<TRow>(
  input: MaybeRefOrGetter<EditHistoryControllerOptions<TRow>>,
  activity: ExternalStoreOptions = {}
) {
  requireScope("useEditHistory");
  const store = createEditHistory(toValue(input));
  const ownerActive = useScopeActivity();
  const active = computed(
    () => ownerActive.value && (toValue(activity.active) ?? true)
  );
  let disposed = false;
  watch(
    () => toValue(input).enabled,
    (enabled) => {
      if (!enabled) store.clear();
    },
    { flush: "sync" }
  );
  const undo = () =>
    !disposed && active.value && toValue(input).enabled ? store.undo() : 0;
  const redo = () =>
    !disposed && active.value && toValue(input).enabled ? store.redo() : 0;
  watch(
    () => toValue(input),
    (options) => store.configure(options),
    { flush: "sync" }
  );
  const snapshot = useExternalStore(store, activity);
  onScopeDispose(() => {
    disposed = true;
    store.configure({ enabled: false, columns: [] });
    store.clear();
  });
  return computed(() => ({
    ...editHistoryView(
      store,
      snapshot.value,
      toValue(input).enabled && active.value
    ),
    undo,
    redo,
  }));
}
export interface TableEditingOptions<TRow>
  extends EditLifecycle<TRow>, EditValidationStoreOptions<TRow> {
  readonly rows: readonly TRow[];
  readonly columns: readonly EditableColumnLike<TRow>[];
  readonly rowKey: (row: TRow) => string;
  readonly onCellEdit?: CellEditHandler<TRow>;
  readonly rowEditing?: boolean;
  readonly onRowEdit?: NonNullable<RowEditStoreOptions<TRow>["onRowEdit"]>;
  readonly batchEditing?: boolean;
  readonly onBatchEdit?: NonNullable<
    BatchEditStoreOptions<TRow>["onBatchEdit"]
  >;
  readonly onEditRollback?: NonNullable<
    CellSaveStoreOptions<TRow>["onRollback"]
  >;
  readonly formatEditError?: NonNullable<
    CellSaveStoreOptions<TRow>["formatError"]
  >;
  readonly dirtyIndicators?: boolean;
  readonly onDirtyChange?: (dirty: DirtyEdits) => void;
  readonly editHistory?: boolean | { readonly depth?: number };
  readonly rowVersion?: (row: TRow) => string | number;
  readonly editConflictPolicy?: EditConflictPolicy;
  readonly onEditConflict?: EditConflictHandler<TRow>;
  readonly featureHost?: FeatureHostState;
  readonly conflictLabels?: NonNullable<EditingBundle<TRow>["conflictLabels"]>;
}
export interface TableEditingModel<TRow> {
  readonly bundle: ComputedRef<EditingBundle<TRow>>;
  readonly history: ComputedRef<EditHistoryState<TRow>>;
}
/** One cell edit lifecycle, with every write sent to the latest host callback. */
export function useTableEditing<TRow>(
  input: MaybeRefOrGetter<TableEditingOptions<TRow>>,
  activity: ExternalStoreOptions = {}
): TableEditingModel<TRow> {
  requireScope("useTableEditing");
  const options = computed(() => toValue(input));
  const localActive = useScopeActivity();
  const active = computed(
    () => localActive.value && (toValue(activity.active) ?? true)
  );
  const lifecycle = { active };
  let disposed = false;
  const cell = useCellEditing(
    () => ({
      onEditStart: options.value.onEditStart,
      onEditCancel: options.value.onEditCancel,
    }),
    lifecycle
  );
  // Stable configuration projections avoid aborting a check for unrelated row renders.
  const validationConfig = computed(() => ({
    validateRow: options.value.validateRow,
    applyEdit: options.value.applyEdit,
  }));
  const validation = useEditValidation(validationConfig, lifecycle);
  const saving = useCellSaveState(
    () => ({
      onRollback: options.value.onEditRollback,
      formatError: options.value.formatEditError,
      onEditError: options.value.onEditError,
    }),
    lifecycle
  );
  const dirty = useDirtyCells(
    () => ({
      enabled:
        options.value.dirtyIndicators === true ||
        options.value.onDirtyChange !== undefined,
      onDirtyChange: options.value.onDirtyChange,
    }),
    lifecycle
  );
  const commit: CellEditHandler<TRow> = (row, key, value) =>
    disposed || !active.value
      ? undefined
      : options.value.onCellEdit?.(row, key, value);
  const history = useEditHistory(
    () => ({
      ...resolveEditHistory(options.value.editHistory),
      enabled:
        resolveEditHistory(options.value.editHistory).enabled &&
        options.value.onCellEdit !== undefined,
      columns: options.value.columns,
      onCellEdit: commit,
    }),
    lifecycle
  );
  const record = (edits: Parameters<EditHistoryState<TRow>["record"]>[0]) => {
    if (!disposed && active.value) history.value.record(edits);
  };
  const onCellEdit = recordingCellEdit(commit, record);
  const unitSaves = createCellSaveStore<TRow>();
  const trackUnit = (edits: readonly BatchRowEdit<TRow>[], result: unknown) => {
    for (const edit of edits)
      for (const [columnKey, value] of Object.entries(edit.patch)) {
        const column = options.value.columns.find(
          (item) => item.key === columnKey
        );
        dirty.value.mark(edit.rowId, columnKey);
        void unitSaves
          .track({
            rowId: edit.rowId,
            columnKey,
            previous: edit.row,
            attempted: value,
            previousValue: column ? readCellValue(edit.row, column) : undefined,
            result,
          })
          .then((saved) => {
            if (saved && !disposed) dirty.value.confirm(edit.rowId, columnKey);
          });
      }
    return result;
  };
  const rowHandler = computed(() => options.value.onRowEdit);
  const onRowEdit = computed<
    NonNullable<RowEditStoreOptions<TRow>["onRowEdit"]>
  >(() => {
    const handler = rowHandler.value;
    const commit = asBatchGesture<TRow>((edits) => {
      if (disposed || !active.value) return;
      const edit = edits[0];
      return edit
        ? trackUnit(edits, handler?.(edit.row, edit.patch))
        : undefined;
    }, record)!;
    return (row, patch) =>
      commit([{ row, rowId: options.value.rowKey(row), patch }]);
  });
  const batchHandler = computed(() => options.value.onBatchEdit);
  const batchCommit = computed(() => {
    const handler = batchHandler.value;
    return asBatchGesture<TRow>((edits) => {
      if (disposed || !active.value) return;
      return trackUnit(edits, handler?.(edits));
    }, record)!;
  });
  const batchMode = computed(
    () =>
      options.value.batchEditing === true &&
      options.value.onBatchEdit !== undefined
  );
  const rowMode = computed(
    () =>
      !batchMode.value &&
      options.value.rowEditing === true &&
      options.value.onRowEdit !== undefined
  );
  const rowEditing = useRowEditing<TRow>(
    () => ({
      ...options.value,
      enabled: rowMode.value,
      onRowEdit: onRowEdit.value,
    }),
    lifecycle
  );
  const batchEditing = useBatchEditing<TRow>(
    () => ({
      ...options.value,
      enabled: batchMode.value,
      onBatchEdit: batchCommit.value,
    }),
    lifecycle
  );
  watch(
    () => options.value.editHistory,
    (value) => {
      if (
        value &&
        !options.value.onCellEdit &&
        (rowMode.value || batchMode.value)
      )
        throw new Error(
          "AdaptTable: editHistory requires an onCellEdit replay callback; compose editing() alongside row or batch editing."
        );
    },
    { immediate: true, flush: "sync" }
  );
  const conflicts = createEditConflictStore<TRow>();
  const conflictSnapshot = useExternalStore(conflicts, lifecycle);
  const conflict = computed(() =>
    editConflictView(conflicts, conflictSnapshot.value)
  );
  const clearActiveValidation = () => {
    const target = cell.value.active;
    if (target) validation.value.clear(target.rowId, target.columnKey);
  };
  const state = computed<CellEditingState>(() => ({
    ...cell.value,
    begin: (...args) => {
      if (disposed || !active.value) return;
      clearActiveValidation();
      cell.value.begin(...args);
    },
    setDraft: (value) => {
      if (disposed || !active.value) return;
      clearActiveValidation();
      cell.value.setDraft(value);
    },
    cancel: () => {
      clearActiveValidation();
      cell.value.cancel();
    },
  }));
  watch(
    [() => options.value.rows, () => options.value.columns, cell],
    () => {
      const current = options.value;
      const editing = cell.value;
      editing.discardIfRowMissing(current.rows, (row) =>
        current.rowKey(row as TRow)
      );
      conflict.value.reconcile({
        rows: current.rows,
        columns: current.columns,
        rowKey: current.rowKey,
        rowVersion: current.rowVersion,
        policy: current.editConflictPolicy ?? "ask",
        onEditConflict: current.onEditConflict,
        active: cell.value.active,
        openedRow: cell.value.openedRow() as TRow | undefined,
        draft: cell.value.draft,
        keep: cell.value.keepLive,
        take: cell.value.takeLive,
      });
    },
    { immediate: true, flush: "sync" }
  );
  watch(
    [() => options.value.onCellEdit, active],
    ([callback, enabled]) => {
      if (!callback || !enabled) clearActiveValidation();
      if (!callback) cell.value.close();
    },
    { flush: "sync" }
  );
  watch(
    [
      () => options.value.rows,
      () => options.value.columns,
      rowEditing,
      rowMode,
      batchEditing,
      batchMode,
    ],
    () => {
      const current = options.value;
      const shared = {
        rows: current.rows,
        columns: current.columns,
        rowKey: current.rowKey,
        policy: current.editConflictPolicy ?? "ask",
        onEditConflict: current.onEditConflict,
      };
      if (batchMode.value) {
        const state = batchEditing.value;
        conflict.value.reconcileBatch({
          ...shared,
          entries: state.entries,
          accept: state.acceptSeeds,
          take: state.takeSeeds,
        });
      } else {
        const state = rowEditing.value;
        conflict.value.reconcileRow({
          ...shared,
          activeRowId: rowMode.value ? state.activeRowId : null,
          openedRow: state.openedRow(),
          seeds: state.seeds(),
          drafts: state.drafts,
          accept: state.acceptSeeds,
          take: state.takeSeeds,
        });
      }
    },
    { immediate: true, flush: "sync" }
  );
  watch(
    [() => rowEditing.value.activeRowId, batchMode],
    ([rowId, batch]) => {
      if (rowId !== null || batch) {
        clearActiveValidation();
        cell.value.close();
      }
    },
    { flush: "sync" }
  );
  onScopeDispose(() => {
    disposed = true;
    validation.value.clearAll();
  });
  const bundle = computed<EditingBundle<TRow>>(() => {
    const row = rowEditing.value;
    const batch = batchEditing.value;
    return {
      onCellEdit: options.value.onCellEdit ? onCellEdit : undefined,
      state: state.value,
      validation: validation.value,
      saving: saving.value,
      rowEditing: rowMode.value
        ? {
            ...row,
            save: () => {
              const id = rowEditing.value.activeRowId;
              if (
                id !== null &&
                rowEditing.value.save === row.save &&
                !conflict.value.isRowContested(id)
              )
                row.save();
            },
          }
        : undefined,
      batch: batchMode.value
        ? {
            ...batch,
            saveAll: () => {
              if (
                batchEditing.value.saveAll === batch.saveAll &&
                !conflict.value.anyContested
              )
                batch.saveAll();
            },
          }
        : undefined,
      dirty: dirtyMarkerView(
        dirty.value,
        options.value.dirtyIndicators === true
      ),
      lifecycle: options.value,
      conflict: conflict.value,
      conflictLabels: options.value.conflictLabels,
      featureHost: options.value.featureHost,
    };
  });
  return { bundle, history };
}
export function useEditableCell<TRow>(
  input: MaybeRefOrGetter<Parameters<typeof editableCellController<TRow>>[0]>
) {
  const active = useScopeActivity();
  const raw = computed(() => editableCellController(toValue(input)));
  const revision = shallowRef(0);
  watch(
    () => {
      const props = toValue(input);
      return [
        props.rowId,
        props.column.key,
        props.editing?.state.close,
        props.editing?.state.active,
      ];
    },
    (next, previous) => {
      if (next.some((value, index) => !Object.is(value, previous[index])))
        revision.value++;
    },
    { flush: "sync" }
  );
  const clearValidation = () => {
    const props = toValue(input);
    props.editing?.validation?.clear(props.rowId, props.column.key);
  };
  watch(
    active,
    (enabled) => {
      if (!enabled) clearValidation();
    },
    { flush: "sync" }
  );
  onScopeDispose(clearValidation);
  return computed(() => {
    const ticket = revision.value;
    const allowed = () => active.value && ticket === revision.value;
    const editing = () => allowed() && raw.value.mode === "editing";
    return {
      ...raw.value,
      begin: () => {
        if (allowed()) raw.value.begin();
      },
      setDraft: (value: string) => {
        if (editing()) raw.value.setDraft(value);
      },
      commit: () => {
        if (editing()) raw.value.commit();
      },
      cancel: () => {
        if (editing()) raw.value.cancel();
      },
      commitOnBlur: () => {
        if (editing()) raw.value.commitOnBlur();
      },
      onEditorKeyDown: (
        event: Parameters<EditableCellController<TRow>["onEditorKeyDown"]>[0]
      ) => {
        if (editing()) raw.value.onEditorKeyDown(event);
      },
      rollback: () => {
        if (allowed()) raw.value.rollback();
      },
      dismissFailure: () => {
        if (allowed()) raw.value.dismissFailure();
      },
      keepConflict: () => {
        if (editing()) raw.value.keepConflict();
      },
      takeConflict: () => {
        if (editing()) raw.value.takeConflict();
      },
    };
  });
}
