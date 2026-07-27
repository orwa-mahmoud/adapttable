import {
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";

import type { ColumnDef } from "../types";
import {
  editableCellController,
  type EditableCellEditing,
  stopCellEditKeyboard,
} from "./editableCellController";

/** Props for a kit-native editor while a cell is active. */
export interface EditableCellEditorCtrl {
  draft: string;
  setDraft: (value: string) => void;
  onEditorKeyDown: (event: {
    key: string;
    preventDefault: () => void;
    shiftKey?: boolean;
  }) => void;
  commitOnBlur: () => void;
  editor: NonNullable<ReturnType<typeof editableCellController>["editor"]>;
  selectOptions: ReturnType<typeof editableCellController>["selectOptions"];
}

/**
 * Opt-in cell wrapper: plain display when editing is off; double-click /
 * Enter / F2 to activate; kit supplies the editor via `renderEditor`.
 *
 * When `editing` is omitted this is a pure pass-through of `display` —
 * zero DOM / behavior change for tables that never opted into cell edit.
 */
export interface EditableCellGateProps<TRow> {
  readonly editing: EditableCellEditing<TRow> | undefined;
  readonly row: TRow;
  readonly column: ColumnDef<TRow>;
  readonly rowId: string;
  readonly rows: readonly TRow[];
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rowKey: (row: TRow) => string;
  /** Accessible name for the activate control. */
  readonly editLabel: string;
  /** Optional class for the activate button (adapters' styling hook). */
  readonly activateClassName?: string;
  readonly display: ReactNode;
  /**
   * Kit-native editor. Only called while this cell is the active edit.
   * Wire `value`/`onChange`/`onKeyDown`/`onBlur` from the controller.
   */
  readonly renderEditor: (ctrl: EditableCellEditorCtrl) => ReactElement;
}

export function EditableCellGate<TRow>(
  props: EditableCellGateProps<TRow>
): ReactElement {
  const activateRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  const ctrl = editableCellController({
    editing: props.editing,
    row: props.row,
    column: props.column,
    rowId: props.rowId,
    rows: props.rows,
    columns: props.columns,
    rowKey: props.rowKey,
  });

  useLayoutEffect(() => {
    if (!restoreFocusRef.current || ctrl.mode !== "activatable") return;
    restoreFocusRef.current = false;
    activateRef.current?.focus();
  });

  if (ctrl.mode === "display") {
    return <>{props.display}</>;
  }

  if (ctrl.mode === "editing" && ctrl.editor) {
    return props.renderEditor({
      draft: ctrl.draft,
      setDraft: ctrl.setDraft,
      onEditorKeyDown: (event) => {
        if (event.key === "Escape") {
          restoreFocusRef.current = true;
        }
        ctrl.onEditorKeyDown(event);
      },
      commitOnBlur: ctrl.commitOnBlur,
      editor: ctrl.editor,
      selectOptions: ctrl.selectOptions,
    });
  }

  return (
    <button
      ref={activateRef}
      type="button"
      aria-label={props.editLabel}
      className={props.activateClassName}
      data-adapttable-part="edit-cell-activate"
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        ctrl.begin();
      }}
      onClick={(event) => {
        // Keep row-click from firing when the user is aiming to edit.
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "F2") {
          event.preventDefault();
          stopCellEditKeyboard(event);
          ctrl.begin();
        }
      }}
      style={{
        all: "unset",
        boxSizing: "border-box",
        display: "block",
        width: "100%",
        cursor: "text",
        textAlign: "inherit",
      }}
    >
      {props.display}
    </button>
  );
}
