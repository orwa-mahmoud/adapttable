import {
  type CellConflictAsk,
  controllerConflictAsk,
  type CustomCellEditorCtrl,
  type EditableCellController,
  editableCellErrorId,
  type EditingBundle,
  editorKeyRestoresFocus,
  editorValidationProps,
  isEditActivateKey,
  stopEditKeys,
} from "@adapttable/core";
import type {
  EditableCellActivateProps,
  EditableCellButtonProps,
  EditableCellSlotProps,
} from "@adapttable/core/binding";
import {
  computed,
  Fragment,
  getCurrentInstance,
  h,
  type MaybeRefOrGetter,
  nextTick,
  onScopeDispose,
  shallowRef,
  toValue,
  useId,
  type VNodeChild,
  watch,
} from "vue";

import type { ColumnDef } from "../columnDef";
import { useScopeActivity } from "../store";
import { editableUnitModel } from "./editableUnitModel";
import { useEditableCell } from "./editingModels";
export type VueEditableCellProps<TRow> = EditableCellSlotProps<
  TRow,
  EditingBundle<TRow>,
  ColumnDef<TRow>,
  VNodeChild
>;
export interface EditableCellEditorProps<TRow> {
  readonly controller: EditableCellController<TRow>;
  readonly label: string;
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly editorRef: (node: { focus(): void } | null) => void;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly onKeyDown: (
    event: Parameters<CustomCellEditorCtrl["onKeyDown"]>[0] & {
      readonly stopPropagation?: () => void;
    }
  ) => void;
}
export interface EditableCellChromeSlots<TRow> {
  readonly Activate: (
    props: EditableCellActivateProps<VNodeChild>
  ) => VNodeChild;
  readonly Editor: (props: EditableCellEditorProps<TRow>) => VNodeChild;
  readonly Button: (props: EditableCellButtonProps) => VNodeChild;
}
export interface EditableCellModel<TRow> {
  readonly unit?: "cell" | "row" | "batch";
  readonly ask?: CellConflictAsk;
  readonly controller: EditableCellController<TRow>;
  readonly display: VNodeChild;
  readonly activate: EditableCellActivateProps<VNodeChild>;
  readonly editor: EditableCellEditorProps<TRow>;
  readonly errorId: string;
  readonly undoLabel?: string;
}
/** Persistent focus bookkeeping belongs to the binding, not each kit. */
export function useEditableCellModel<TRow>(
  input: MaybeRefOrGetter<VueEditableCellProps<TRow>>
) {
  const active = useScopeActivity();
  const cell = useEditableCell(input);
  const unit = computed(() =>
    editableUnitModel({ ...toValue(input), controller: cell.value })
  );
  const ctrl = computed(() => unit.value.controller);
  const revision = shallowRef(0);
  // A target returning A → B → A is a new session, even when the row id matches.
  watch(
    () => {
      const props = toValue(input);
      const editing = props.editing;
      return [
        props.rowId,
        props.column.key,
        unit.value.unit,
        editing?.state.close,
        unit.value.unit === "cell"
          ? editing?.state.active
          : editing?.rowEditing?.activeRowId,
        editing?.rowEditing?.setDraft,
        editing?.batch?.setDraft,
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
  const prefix = getCurrentInstance() ? useId() : "";
  let activate: HTMLButtonElement | null = null;
  let restore = false;
  let disposed = false;
  let editorNode: { focus(): void } | null = null;
  let focusMode = ctrl.value.mode;
  let focusPending = focusMode === "editing" && unit.value.takesFocus;
  const updateFocusRequest = () => {
    const mode = ctrl.value.mode;
    if (mode !== focusMode)
      focusPending = mode === "editing" && unit.value.takesFocus;
    focusMode = mode;
  };
  const focusEditor = () => {
    if (
      !disposed &&
      active.value &&
      focusPending &&
      editorNode &&
      ctrl.value.mode === "editing"
    ) {
      if ("isConnected" in editorNode && editorNode.isConnected === false)
        return;
      focusPending = false;
      editorNode.focus();
    }
  };
  const editorRef = (node: { focus(): void } | null) => {
    if (disposed) return;
    editorNode = node;
    updateFocusRequest();
    focusEditor();
    if (focusPending) void nextTick(focusEditor);
  };
  const restoreFocus = () => {
    if (
      !disposed &&
      active.value &&
      restore &&
      activate?.isConnected &&
      ctrl.value.mode === "activatable"
    ) {
      restore = false;
      activate?.focus();
    }
  };
  watch(
    () => ctrl.value.mode,
    () => {
      updateFocusRequest();
      focusEditor();
      void nextTick(restoreFocus);
    },
    { flush: "post" }
  );
  onScopeDispose(() => {
    disposed = true;
    clearValidation();
    activate = null;
    editorNode = null;
  });
  return computed<EditableCellModel<TRow>>(() => {
    const props = toValue(input);
    const ticket = revision.value;
    const original = ctrl.value;
    const allowed = () =>
      !disposed && active.value && ticket === revision.value;
    const editingAllowed = () => allowed() && ctrl.value.mode === "editing";
    // Invoke the current controller after checking ownership, so a harmless
    // draft or host callback update cannot leave a captured snapshot in charge.
    const controller: EditableCellController<TRow> = {
      ...original,
      begin: () => {
        if (allowed()) ctrl.value.begin();
      },
      setDraft: (value) => {
        if (editingAllowed()) ctrl.value.setDraft(value);
      },
      commit: () => {
        if (editingAllowed()) ctrl.value.commit();
      },
      cancel: () => {
        if (editingAllowed()) ctrl.value.cancel();
      },
      commitOnBlur: () => {
        if (editingAllowed()) ctrl.value.commitOnBlur();
      },
      onEditorKeyDown: (event) => {
        if (editingAllowed()) ctrl.value.onEditorKeyDown(event);
      },
      rollback: () => {
        if (allowed()) ctrl.value.rollback();
      },
      dismissFailure: () => {
        if (allowed()) ctrl.value.dismissFailure();
      },
      keepConflict: () => {
        if (editingAllowed()) ctrl.value.keepConflict();
      },
      takeConflict: () => {
        if (editingAllowed()) ctrl.value.takeConflict();
      },
    };
    const ask = unit.value.ask;
    const guardedAsk = ask
      ? {
          ...ask,
          keep: () => {
            if (editingAllowed()) unit.value.ask?.keep();
          },
          take: () => {
            if (editingAllowed()) unit.value.ask?.take();
          },
        }
      : undefined;
    const errorId = `${prefix}-${editableCellErrorId(props.rowId, props.column.key)}`;
    return {
      controller,
      unit: unit.value.unit,
      ask: guardedAsk,
      display: props.display,
      errorId,
      undoLabel: props.undoLabel,
      activate: {
        title: props.editLabel,
        saveStatus: controller.saveStatus,
        dirty: controller.isDirty,
        display: props.display,
        activateRef: (node) => {
          if (disposed) return;
          activate = node;
          void nextTick(restoreFocus);
        },
        onClick: (event) => event.stopPropagation(),
        onDoubleClick: (event) => {
          if (!allowed()) return;
          event.preventDefault();
          event.stopPropagation();
          controller.begin();
        },
        onKeyDown: (event) => {
          if (!allowed()) return;
          if (isEditActivateKey(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            controller.begin();
          }
        },
      },
      editor: {
        controller,
        label: props.editLabel,
        attrs: {
          ...editorValidationProps({
            ...controller,
            errorId,
            conflict: unit.value.ask !== undefined,
          }),
          "aria-label": props.editLabel,
          "data-adapttable-part": "edit-cell-input",
        },
        editorRef: (node) => {
          if (allowed()) editorRef(node);
        },
        onChange: controller.setDraft,
        onBlur: controller.commitOnBlur,
        onKeyDown: (event) => {
          if (!editingAllowed()) return;
          stopEditKeys({
            key: event.key,
            stopPropagation: () => event.stopPropagation?.(),
          });
          if (unit.value.unit === "cell" && editorKeyRestoresFocus(event.key))
            restore = true;
          controller.onEditorKeyDown(event);
          void nextTick(restoreFocus);
        },
      },
    };
  });
}
/** Structure only: every editor, activation target and button is mandatory kit UI. */
export interface EditableCellClassNames {
  readonly editableCell?: string;
  readonly editCellError?: string;
  readonly editCellSaveError?: string;
}
export function EditableCellChrome<TRow>(props: {
  readonly classNames?: EditableCellClassNames;
  readonly model: EditableCellModel<TRow>;
  readonly controls: EditableCellChromeSlots<TRow>;
}): VNodeChild {
  const { model, controls } = props;
  const ctrl = model.controller;
  const ask = model.ask ?? controllerConflictAsk(ctrl);
  if (ctrl.mode === "display") return h(Fragment, null, [model.display]);
  for (const key of ["Activate", "Editor", "Button"] as const)
    if (typeof controls[key] !== "function")
      throw new Error(
        `AdaptTable: EditableCellChrome requires the ${key} control slot.`
      );
  const children: VNodeChild[] = [
    ctrl.mode === "editing"
      ? controls.Editor(model.editor)
      : controls.Activate(model.activate),
  ];
  if (ctrl.error)
    children.push(
      h(
        "span",
        {
          id: model.errorId,
          class: props.classNames?.editCellError,
          role: "status",
          "data-adapttable-part": "edit-cell-error",
        },
        ctrl.error
      )
    );
  if (ask && ctrl.conflictLabels) {
    const button = (label: string, part: string, run: () => void) =>
      controls.Button({
        label,
        part,
        onMouseDown: (event) => event.preventDefault(),
        onClick: (event) => {
          event.stopPropagation();
          run();
        },
      });
    children.push(
      button(ctrl.conflictLabels.keepMine, "edit-cell-keep-mine", ask.keep)
    );
    children.push(
      button(ctrl.conflictLabels.takeTheirs, "edit-cell-take-theirs", ask.take)
    );
  }
  if (ctrl.saveFailure) {
    children.push(
      h(
        "span",
        {
          role: "status",
          class: props.classNames?.editCellSaveError,
          "data-adapttable-part": "edit-cell-save-error",
        },
        ctrl.saveFailure.message
      )
    );
    if (ctrl.canRollback && model.undoLabel)
      children.push(
        controls.Button({
          label: model.undoLabel,
          part: "edit-cell-undo",
          onClick: (event) => {
            event.stopPropagation();
            ctrl.rollback();
          },
        })
      );
  }
  return h(
    "span",
    {
      "data-adapttable-part": "editable-cell",
      class: props.classNames?.editableCell,
      "data-save-status": ctrl.saveStatus,
      "data-edit-unit": model.unit,
      "data-dirty": ctrl.isDirty ? "" : undefined,
    },
    children
  );
}

/** Adapt one existing edit model to the neutral custom-editor callback contract. */
export function editableCustomControl<TRow>(
  model: EditableCellModel<TRow>
): CustomCellEditorCtrl {
  const controller = model.controller;
  return {
    draft: controller.draft,
    setDraft: model.editor.onChange,
    commit: controller.commit,
    cancel: controller.cancel,
    onKeyDown: model.editor.onKeyDown,
    onBlur: model.editor.onBlur,
    focusRef: model.editor.editorRef,
    label: model.editor.label,
    error: controller.error,
    validating: controller.validating,
    errorId: model.errorId,
    conflict: model.ask,
  };
}
