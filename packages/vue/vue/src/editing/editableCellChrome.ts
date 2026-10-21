import {
  type CellConflictAsk,
  controllerConflictAsk,
  type CustomCellEditorCtrl,
  type EditableCellController,
  editableCellErrorId,
  type EditingBundle,
  editorKeyRestoresFocus,
  editorValidationProps,
  focusEditorOnMount,
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
  type VNode,
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
  readonly changed?: boolean;
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
      focusEditorOnMount(editorNode);
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
      changed: props.editing?.batch?.isChanged(props.rowId, props.column.key),
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
        onClick: (event) => {
          event.stopPropagation();
          if (allowed() && props.editing?.activation === "click")
            controller.begin();
        },
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
          "data-adapttable-part": "edit-cell-editor",
        },
        editorRef: (node) => {
          // Refs arrive before mount; only focus itself requires activity.
          if (!disposed && ticket === revision.value) editorRef(node);
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
// The idle cell keeps its size while the editor is open: it is still laid out,
// so the column and the row measure the same content they did a moment ago,
// and it is neither seen, heard nor reachable. A block container, as the table
// cell is, holding a copy of the cell's root, so the idle control sits in the
// same boxes it does in the cell.
const EDITING_HOLD =
  "display: flow-root; grid-row: 1; grid-column: 1; visibility: hidden; opacity: 0; pointer-events: none";
// The editor fills the space the idle cell holds and adds no width of its own,
// so opening it never reflows the column. An object, so re-renders patch these
// keys and keep the margins `mountLayer` sets.
const EDITING_LAYER = {
  gridRow: "1",
  gridColumn: "1",
  alignSelf: "center",
  minWidth: 0,
  contain: "inline-size",
} as const;

/** How long a second press still belongs to the gesture that opened the editor. */
const OPENING_GESTURE_MS = 500;

const openedAt = new WeakMap<Element, number>();

/**
 * Mount the editor's layer: note when it opened, listen for the rest of the
 * opening double-click, and let it reach into its table cell's block padding,
 * so an editor taller than one line of text still fits the row it opened in.
 * The row grows only when the editor is taller than the whole cell.
 *
 * The listeners are the DOM's own, not Vue's: a Vue listener that saw the click
 * first would stamp it, and Vue then skips the click on a control rendered in
 * the same millisecond, such as a conflict notice's button.
 */
function mountLayer(vnode: VNode): void {
  const layer = vnode.el;
  if (!(layer instanceof HTMLElement)) return;
  openedAt.set(layer, performance.now());
  layer.addEventListener("mousedown", holdOpeningPress, true);
  layer.addEventListener("click", holdOpeningPress, true);
  const cell = layer.closest("td, th");
  if (!cell) return;
  const padding = getComputedStyle(cell);
  layer.style.marginTop = `-${padding.paddingTop}`;
  layer.style.marginBottom = `-${padding.paddingBottom}`;
}

function unmountLayer(vnode: VNode): void {
  const layer = vnode.el;
  if (!(layer instanceof HTMLElement)) return;
  layer.removeEventListener("mousedown", holdOpeningPress, true);
  layer.removeEventListener("click", holdOpeningPress, true);
}

/**
 * The rest of a double-click whose first press opened the editor does not
 * reach it: a second press would tick the checkbox or toggle the list the
 * reader only meant to open.
 */
function holdOpeningPress(event: MouseEvent): void {
  const layer = event.currentTarget;
  const opened = layer instanceof Element ? openedAt.get(layer) : undefined;
  if (
    opened !== undefined &&
    performance.now() - opened < OPENING_GESTURE_MS &&
    event.detail > 1
  ) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/** Receives a gesture or a ref and does nothing with it. */
function ignore(): void {
  // The held idle control answers nothing; the editor above it does.
}

/** The root's styling attributes: its class and the kit-facing state. */
function rootStyling<TRow>(
  model: EditableCellModel<TRow>,
  classNames: EditableCellClassNames | undefined
): Readonly<Record<string, unknown>> {
  const ctrl = model.controller;
  return {
    class: classNames?.editableCell,
    "data-save-status": ctrl.saveStatus,
    "data-edit-unit": model.unit,
    "data-dirty": ctrl.isDirty ? "" : undefined,
  };
}

/**
 * The idle cell as the kit draws it, inside a copy of the cell's root with the
 * root's class and kit attributes, held under the editor for its size alone:
 * no ref, and no gesture reaches it. A row editor opens over plain display, so
 * that is what it holds.
 */
function idleCell<TRow>(
  model: EditableCellModel<TRow>,
  controls: EditableCellChromeSlots<TRow>,
  classNames: EditableCellClassNames | undefined
): VNodeChild {
  return h("span", rootStyling(model, classNames), [
    model.unit === "row"
      ? model.display
      : controls.Activate({
          ...model.activate,
          activateRef: ignore,
          onClick: ignore,
          onDoubleClick: ignore,
          onKeyDown: ignore,
        }),
  ]);
}
function editingFrame(display: VNodeChild, editor: VNodeChild[]): VNodeChild {
  return h("span", { style: "display: grid; min-width: 0" }, [
    h("span", { "aria-hidden": "true", style: EDITING_HOLD }, [display]),
    h(
      "span",
      {
        style: EDITING_LAYER,
        onVnodeMounted: mountLayer,
        onVnodeBeforeUnmount: unmountLayer,
      },
      editor
    ),
  ]);
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
  if (ctrl.error && !ask)
    children.push(
      h(
        "span",
        {
          id: model.errorId,
          class: props.classNames?.editCellError,
          role: "alert",
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
      h(
        "span",
        {
          id: model.errorId,
          role: "alert",
          "data-adapttable-part": "edit-cell-conflict",
          "data-conflict": "",
          class: props.classNames?.editCellError,
        },
        [
          h(
            "span",
            { "data-adapttable-part": "edit-cell-conflict-message" },
            ctrl.conflictLabels.message
          ),
          h(
            "span",
            {
              "data-adapttable-part": "edit-cell-incoming",
              style: { display: "block" },
            },
            ctrl.conflictLabels.theirsValue(ask.incomingValue)
          ),
          button(ctrl.conflictLabels.keepMine, "edit-cell-keep-mine", ask.keep),
          button(
            ctrl.conflictLabels.takeTheirs,
            "edit-cell-take-theirs",
            ask.take
          ),
        ]
      )
    );
  }
  // A batch keeps every cell a field, so only a cell or row editor that
  // replaces its display holds that display's geometry.
  if (ctrl.mode === "editing" && model.unit !== "batch")
    children.push(
      editingFrame(
        idleCell(model, controls, props.classNames),
        children.splice(0)
      )
    );
  const saveFailure = (): VNodeChild => {
    if (!ctrl.saveFailure) return null;
    return h(
      "span",
      {
        role: "alert",
        class: props.classNames?.editCellSaveError,
        "data-adapttable-part": "edit-cell-save-error",
      },
      [
        ctrl.saveFailure.message,
        ctrl.canRollback && model.undoLabel
          ? controls.Button({
              label: model.undoLabel,
              part: "edit-cell-rollback",
              onClick: (event) => {
                event.stopPropagation();
                ctrl.rollback();
              },
            })
          : null,
      ]
    );
  };
  children.push(saveFailure());
  return h(
    "span",
    {
      "data-adapttable-part":
        model.unit === "batch" ? "batch-edit-cell" : undefined,
      "data-changed": model.unit === "batch" && model.changed ? "" : undefined,
      ...rootStyling(model, props.classNames),
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
