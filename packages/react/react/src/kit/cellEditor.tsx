/**
 * The in-place cell editor and the editable cell, decided once for every kit.
 *
 * The binding picks the editor for the column (checkbox, multi-select,
 * select or text input), keeps Enter, Escape and Tab inside the editor,
 * commits a ticked box in one gesture, and decides whether a validation
 * message shows on the input. A kit hands over its four inputs.
 */
import {
  type EditableCellEditorCtrl,
  editorBusyProps,
  editorInputType,
  editorValidationProps,
  isBooleanEditor,
  isDraftChecked,
  isMultiSelectEditor,
  isSelectEditor,
  stopEditKeys,
} from "@adapttable/core/editing";
import type {
  ComponentType,
  KeyboardEvent,
  ReactElement,
  ReactNode,
} from "react";

import type { ColumnDef } from "../columnDef";
import type { EditableCellEditing } from "../editing/editableCellController";
import {
  commitBooleanDraft,
  EditableCellGate,
  type EditableCellSlots,
} from "../editing/EditableCellGate";

/**
 * What every kit editor receives.
 *
 * @public
 */
export interface KitCellEditorProps {
  /** The edit in progress: draft, focus, options and commit. */
  readonly ctrl: EditableCellEditorCtrl;
  /** The editor's accessible name. */
  readonly label: string;
  /** The host's class for the editor. */
  readonly className?: string;
  /** Keeps the edit keys inside the editor; spread on the input. */
  readonly onKeyDown: (event: KeyboardEvent) => void;
  /**
   * The validation message the kit's input shows, for a kit whose input
   * renders it; absent while the cell is in conflict.
   */
  readonly error: string | undefined;
  /**
   * The input's ARIA and conflict attributes: validation state for a kit
   * that draws no message of its own, busy and conflict state for one that
   * does.
   */
  readonly aria: Readonly<Record<string, string | true | undefined>>;
}

/**
 * The checkbox editor: `onCheckedChange` commits the tick at once.
 *
 * @public
 */
export interface KitCellCheckboxProps extends KitCellEditorProps {
  /** Whether the draft is ticked. */
  readonly checked: boolean;
  /** Tick or untick, and commit. */
  readonly onCheckedChange: (checked: boolean) => void;
}

/**
 * The text input editor.
 *
 * @public
 */
export interface KitCellInputProps extends KitCellEditorProps {
  /** The input type: text, number, date. */
  readonly type: string;
}

/**
 * What a kit hands {@link createCellEditor}.
 *
 * @public
 */
export interface KitCellEditors {
  /** A boolean column. */
  readonly Checkbox: ComponentType<KitCellCheckboxProps>;
  /** A column choosing several options. */
  readonly MultiSelect: ComponentType<KitCellEditorProps>;
  /** A column choosing one option. */
  readonly Select: ComponentType<KitCellEditorProps>;
  /** Any other column. */
  readonly Input: ComponentType<KitCellInputProps>;
  /** Whether the kit's inputs draw the validation message themselves. */
  readonly rendersError: boolean;
}

/**
 * The props of a kit's cell editor.
 *
 * @public
 */
export interface CellEditorProps {
  /** The edit in progress. */
  readonly ctrl: EditableCellEditorCtrl;
  /** The editor's accessible name. */
  readonly label: string;
  /** The host's class for the editor. */
  readonly className?: string;
}

/**
 * Build a kit's cell editor.
 *
 * @param kit - The kit's four inputs.
 * @returns The editor component.
 *
 * @public
 */
export function createCellEditor(
  kit: KitCellEditors
): ComponentType<CellEditorProps> {
  const { Checkbox, MultiSelect, Select, Input, rendersError } = kit;
  return function CellEditor({
    ctrl,
    label,
    className,
  }: Readonly<CellEditorProps>): ReactElement {
    const shared: KitCellEditorProps = {
      ctrl,
      label,
      className,
      onKeyDown: (event) => {
        ctrl.onEditorKeyDown(event);
        stopEditKeys(event);
      },
      // A conflict shows its own notice; the input does not also turn red.
      error: ctrl.conflict === true ? undefined : ctrl.error,
      aria: rendersError ? editorBusyProps(ctrl) : editorValidationProps(ctrl),
    };
    if (isBooleanEditor(ctrl.editor)) {
      return (
        <Checkbox
          {...shared}
          // A box shows no message, so it carries the validation state even
          // in a kit whose other inputs draw it.
          aria={editorValidationProps(ctrl)}
          checked={isDraftChecked(ctrl.draft)}
          onCheckedChange={(checked) => commitBooleanDraft(ctrl, checked)}
        />
      );
    }
    if (isMultiSelectEditor(ctrl.editor)) return <MultiSelect {...shared} />;
    if (isSelectEditor(ctrl.editor)) return <Select {...shared} />;
    return <Input {...shared} type={editorInputType(ctrl.editor)} />;
  };
}

/**
 * The props of an editable cell.
 *
 * @public
 */
export interface EditableDataCellProps<TRow> {
  /** Cell-editing state; the cell shows `display` when absent. */
  readonly editing: EditableCellEditing<TRow> | undefined;
  /** The row. */
  readonly row: TRow;
  /** The column. */
  readonly column: ColumnDef<TRow>;
  /** The row's identity. */
  readonly rowId: string;
  /** The rendered rows. */
  readonly rows: readonly TRow[];
  /** The visible columns, in order. */
  readonly columns: readonly ColumnDef<TRow>[];
  /** Row identity function. */
  readonly rowKey: (row: TRow) => string;
  /** The editor's accessible name. */
  readonly editLabel: string;
  /** The undo control a failed save offers. */
  readonly undoLabel?: string;
  /** What the cell shows when it is not being edited. */
  readonly display: ReactNode;
  /** Class for the invisible activate button. */
  readonly activateClassName?: string;
  /** Class for the validation message. */
  readonly errorClassName?: string;
  /** Class for a failed save's message. */
  readonly saveErrorClassName?: string;
  /** Class for the undo control beside it. */
  readonly rollbackClassName?: string;
  /** Class for the active editor. */
  readonly editorClassName?: string;
}

/**
 * Build a kit's editable cell from its editor and its activate, conflict
 * and undo controls.
 *
 * @param kit - The kit's editor, slots, and whether its inputs show the
 *   validation message.
 * @returns The editable cell component.
 *
 * @public
 */
export function createEditableCell(kit: {
  readonly Editor: ComponentType<CellEditorProps>;
  readonly slots: EditableCellSlots;
  readonly rendersError: boolean;
}): <TRow>(props: Readonly<EditableDataCellProps<TRow>>) => ReactElement {
  const { Editor, slots, rendersError } = kit;
  return function EditableDataCell<TRow>(
    props: Readonly<EditableDataCellProps<TRow>>
  ): ReactElement {
    const { editorClassName, ...gate } = props;
    return (
      <EditableCellGate
        {...gate}
        kitRendersError={rendersError}
        slots={slots}
        renderEditor={(ctrl) => (
          <Editor
            ctrl={ctrl}
            label={props.editLabel}
            className={editorClassName}
          />
        )}
      />
    );
  };
}
