/**
 * Editable-cell Chrome: activation, editor focus, validation and save
 * notices — structure and wiring only. Every visible control is the kit's.
 *
 * Commits go through core's {@link editableCellController} /
 * {@link resolveCommitValue} so `parseValue`, validators, async saves and
 * lifecycle observers all run.
 */
import {
  type ColumnDef,
  editableCellController,
  type EditableCellEditing,
} from "@adapttable/angular";
import {
  cellConflictAsk,
  controllerConflictAsk,
  editableCellErrorId,
  editableCellPresentation,
  editorKeyRestoresFocus,
  focusEditorOnMount,
  isEditActivateKey,
  isFirstEditableColumn,
  stopCellEditKeyboard,
} from "@adapttable/core";
import type {
  EditableCellActivateProps as NeutralEditableCellActivateProps,
  EditableCellButtonProps,
} from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  signal,
  type Type,
} from "@angular/core";

import { AdaptControl } from "../control";
import {
  AdaptCellConflictNotice,
  AdaptEditableCellDisplay,
  type EditableCellEditorCtrl,
  type EditableCellSlots,
} from "./editableCellShared";
import { AdaptBatchEditCell, AdaptRowEditCell } from "./rowEditGate";

export {
  AdaptCellConflictNotice,
  type CellConflictNoticeProps,
  commitBooleanDraft,
  type EditableCellEditorCtrl,
  type EditableCellSlots,
  multiDraftFromSelect,
} from "./editableCellShared";
export type { CellConflictAsk } from "@adapttable/core";
export {
  editorBusyProps,
  editorValidationProps,
  stopEditKeys,
} from "@adapttable/core";
export type { EditableCellButtonProps } from "@adapttable/core/binding";

/**
 * Kit activate control the gate calls while the cell is idle.
 *
 * @public
 */
export type EditableCellActivateProps =
  NeutralEditableCellActivateProps<unknown>;

/**
 * Opt-in cell wrapper: plain display when editing is off; double-click /
 * Enter / F2 to activate; kit supplies the editor via `editor`.
 *
 * Commits run through core's editableCellController so parseValue, validate,
 * async saves and lifecycle observers fire.
 *
 * @public
 */
@Component({
  selector: "adapt-editable-cell-gate",
  imports: [
    AdaptControl,
    AdaptCellConflictNotice,
    AdaptEditableCellDisplay,
    AdaptBatchEditCell,
    AdaptRowEditCell,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = presentation();
    @if (p === "batch" && editing()?.batch; as batch) {
      <adapt-batch-edit-cell
        [batch]="batch"
        [row]="row()"
        [rowId]="rowId()"
        [column]="column()"
        [display]="display()"
        [editLabel]="editLabel()"
        [editor]="editor()"
        [ask]="bundleConflictAsk()"
        [conflictLabels]="editing()?.conflictLabels"
        [errorClassName]="errorClassName()"
        [slots]="slots()"
      />
    } @else if (p === "row" && editing()?.rowEditing; as rowEditing) {
      <adapt-row-edit-cell
        [rowEditing]="rowEditing"
        [column]="column()"
        [display]="display()"
        [editLabel]="editLabel()"
        [takesFocus]="takesRowFocus()"
        [editor]="editor()"
        [ask]="bundleConflictAsk()"
        [rowAsking]="rowAsking()"
        [conflictLabels]="editing()?.conflictLabels"
        [errorClassName]="errorClassName()"
        [slots]="slots()"
      />
    } @else if (p === "display") {
      <adapt-editable-cell-display [props]="display()" />
    } @else if (p === "editor" || p === "custom-editor") {
      <ng-container
        [adaptControl]="editor()"
        [adaptControlProps]="editorCtrl()"
      />
      @if (conflictAsk(); as ask) {
        @if (editing()?.conflictLabels; as conflictLabels) {
          <adapt-cell-conflict-notice
            [ask]="ask"
            [labels]="conflictLabels"
            [errorId]="errorId()"
            [errorClassName]="errorClassName()"
            [slots]="slots()"
          />
        }
      }
      @if (
        conflictAsk() === undefined &&
        ctrl().error !== undefined &&
        kitRendersError() !== true
      ) {
        <span
          [attr.id]="errorId()"
          role="alert"
          data-adapttable-part="edit-cell-error"
          [class]="errorClassName()"
        >
          {{ ctrl().error }}
        </span>
      }
    } @else {
      <ng-container
        [adaptControl]="slots().Activate"
        [adaptControlProps]="activateProps()"
      />
      @if (ctrl().saveFailure; as failure) {
        <span
          role="alert"
          data-adapttable-part="edit-cell-save-error"
          [class]="saveErrorClassName()"
        >
          {{ failure.message }}
          @if (ctrl().canRollback && undoLabel() !== undefined) {
            <ng-container
              [adaptControl]="slots().Button"
              [adaptControlProps]="rollbackProps()"
            />
          }
        </span>
      }
    }
  `,
})
export class AdaptEditableCellGate<TRow> {
  /** Cell-editing state; the gate is a pass-through when absent. */
  readonly editing = input<EditableCellEditing<TRow>>();
  /** The row being rendered. */
  readonly row = input.required<TRow>();
  /** The column being rendered. */
  readonly column = input.required<ColumnDef<TRow>>();
  /** Identity of the row being edited. */
  readonly rowId = input.required<string>();
  /** The rendered rows. */
  readonly rows = input.required<readonly TRow[]>();
  /** Visible columns, in order. */
  readonly columns = input.required<readonly ColumnDef<TRow>[]>();
  /** Row identity function. */
  readonly rowKey = input.required<(row: TRow) => string>();
  /** Accessible name for the activate control. */
  readonly editLabel = input.required<string>();
  /** Optional class for the activate button. */
  readonly activateClassName = input<string>();
  /** Optional class for the validation message. */
  readonly errorClassName = input<string>();
  /** Optional class for a failed save's message. */
  readonly saveErrorClassName = input<string>();
  /** Optional class for the undo control beside it. */
  readonly rollbackClassName = input<string>();
  /** Label for the undo control a failed save offers. */
  readonly undoLabel = input<string>();
  /** Set when the kit's own input renders the message. */
  readonly kitRendersError = input<boolean>();
  /** What the cell shows when it is not being edited. */
  readonly display = input.required<unknown>();
  /** Kit editor component — receives {@link EditableCellEditorCtrl} as props. */
  readonly editor = input.required<Type<unknown>>();
  /** Kit activate control and conflict / undo buttons. */
  readonly slots = input.required<EditableCellSlots>();

  private readonly injector = inject(Injector);
  private readonly restoreFocus = signal(false);
  private activateEl: HTMLButtonElement | null = null;

  protected readonly ctrl = computed(() =>
    editableCellController({
      editing: this.editing(),
      row: this.row(),
      column: this.column(),
      rowId: this.rowId(),
      rows: this.rows(),
      columns: this.columns(),
      rowKey: this.rowKey(),
    })
  );

  protected readonly presentation = computed(() =>
    editableCellPresentation(this.editing(), this.rowId(), this.ctrl())
  );

  protected readonly errorId = computed(() =>
    editableCellErrorId(this.rowId(), this.column().key)
  );

  protected readonly conflictAsk = computed(() =>
    controllerConflictAsk(this.ctrl())
  );

  protected readonly bundleConflictAsk = computed(() =>
    cellConflictAsk(this.editing(), this.rowId(), this.column().key)
  );

  protected readonly takesRowFocus = computed(() =>
    isFirstEditableColumn(this.columns(), this.column().key)
  );

  protected readonly rowAsking = computed(
    () => this.editing()?.conflict?.isRowContested(this.rowId()) === true
  );

  protected readonly activateProps = computed((): EditableCellActivateProps => {
    const ctrl = this.ctrl();
    return {
      title: this.editLabel(),
      className: this.activateClassName(),
      saveStatus: ctrl.saveStatus,
      dirty: ctrl.isDirty,
      activateRef: (node: HTMLButtonElement | null) => {
        this.activateEl = node;
      },
      display: this.display(),
      onDoubleClick: (event: {
        preventDefault: () => void;
        stopPropagation: () => void;
      }) => {
        event.preventDefault();
        event.stopPropagation();
        ctrl.begin();
      },
      onClick: (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
      },
      onKeyDown: (event: {
        key: string;
        preventDefault: () => void;
        stopPropagation: () => void;
      }) => {
        if (isEditActivateKey(event.key)) {
          event.preventDefault();
          stopCellEditKeyboard(event);
          ctrl.begin();
        }
      },
    };
  });

  protected readonly editorCtrl = computed((): EditableCellEditorCtrl => {
    const ctrl = this.ctrl();
    const errorId = this.errorId();
    return {
      draft: ctrl.draft,
      setDraft: ctrl.setDraft,
      onEditorKeyDown: (event: {
        key: string;
        preventDefault: () => void;
        shiftKey?: boolean;
      }) => {
        if (editorKeyRestoresFocus(event.key)) {
          this.restoreFocus.set(true);
        }
        ctrl.onEditorKeyDown(event);
      },
      commitOnBlur: ctrl.commitOnBlur,
      editor: ctrl.editor!,
      selectOptions: ctrl.selectOptions,
      label: this.editLabel(),
      error: ctrl.error,
      validating: ctrl.validating,
      errorId,
      conflict: ctrl.conflict !== undefined,
      focusRef: focusEditorOnMount,
    };
  });

  protected readonly rollbackProps = computed((): EditableCellButtonProps => {
    const ctrl = this.ctrl();
    return {
      label: this.undoLabel() ?? "",
      part: "edit-cell-rollback",
      className: this.rollbackClassName(),
      onClick: (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        ctrl.rollback();
      },
    };
  });

  constructor() {
    effect(
      () => {
        const shouldRestore = this.restoreFocus();
        const mode = this.ctrl().mode;
        if (!shouldRestore || mode !== "activatable") return;
        this.restoreFocus.set(false);
        queueMicrotask(() => this.activateEl?.focus());
      },
      { injector: this.injector }
    );
  }
}
