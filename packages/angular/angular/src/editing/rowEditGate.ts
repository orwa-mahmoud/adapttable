/**
 * A cell inside a row that is being edited as one unit, and the controls that
 * end that edit — plus the same for a batch of pending edits.
 *
 * Row and batch modes reuse the kit's cell editor, the same validation ARIA
 * and the same conflict notice as a single cell; only where the draft lives
 * and when it reaches the host differ.
 */
import {
  batchEditBarModel,
  batchEditErrorId,
  type CellConflictAsk,
  type EditableColumnLike,
  editorSelectOptions,
  handleRowEditorKey,
  resolveCellEditor,
  rowEditActionsLayout,
  rowEditControls,
  rowEditErrorId,
  rowEditSaveBlocked,
  type TableLabels,
} from "@adapttable/core";
import type {
  BatchEditButtonProps,
  RowEditButtonProps,
  RowEditIcons,
} from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Type,
} from "@angular/core";

import type { ColumnDef } from "../columnDef";
import { AdaptControl } from "../control";
import {
  type EditableCellEditing,
  focusEditorOnMount,
} from "./editableCellController";
import {
  AdaptCellConflictNotice,
  AdaptEditableCellDisplay,
  type EditableCellEditorCtrl,
  type EditableCellSlots,
} from "./editableCellShared";
import type { BatchEditingState, RowEditingState } from "./editing";

export type {
  BatchEditingState,
  EditableColumnLike,
  RowEditingState,
  TableLabels,
};
export type { EditableCellEditorCtrl } from "./editableCellShared";
export {
  type RowEditConflict,
  type RowEditControls,
  rowEditControls,
  type RowEditControlsOptions,
} from "@adapttable/core";
export type {
  BatchEditBarProps,
  BatchEditButtonProps,
  RowEditActionsProps,
  RowEditButtonProps,
  RowEditIcons,
} from "@adapttable/core/binding";

/**
 * Kit-supplied controls for {@link AdaptRowEditActionsChrome}.
 *
 * @public
 */
export interface RowEditActionsSlots {
  /** Renders a button. */
  readonly Button: Type<unknown>;
}

/**
 * Kit-supplied controls for {@link AdaptBatchEditBarChrome}.
 *
 * @public
 */
export interface BatchEditBarSlots {
  /** Renders a button. */
  readonly Button: Type<unknown>;
}

/**
 * The row's edit / save / cancel controls.
 *
 * @public
 */
@Component({
  selector: "adapt-row-edit-actions-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let layout = actionsLayout();
    @if (layout.kind === "begin") {
      <ng-container
        [adaptControl]="slots().Button"
        [adaptControlProps]="beginProps()"
      />
    } @else if (layout.kind === "open") {
      <span
        data-adapttable-part="row-edit-actions"
        [class]="className()"
        style="display: inline-flex; gap: 4px"
      >
        @if (layout.showSave) {
          <ng-container
            [adaptControl]="slots().Button"
            [adaptControlProps]="saveProps()"
          />
        }
        <ng-container
          [adaptControl]="slots().Button"
          [adaptControlProps]="cancelProps()"
        />
      </span>
    }
  `,
})
export class AdaptRowEditActionsChrome<TRow> {
  /** The row-editing state. */
  readonly rowEditing = input.required<RowEditingState<TRow>>();
  /** The row these controls belong to. */
  readonly row = input.required<TRow>();
  /** Its stable id. */
  readonly rowId = input.required<string>();
  /** Labels for the controls. */
  readonly labels = input<Partial<TableLabels>>();
  /** Class for the open-row group. */
  readonly className = input<string>();
  /** Class for each button. */
  readonly buttonClassName = input<string>();
  /** Optional glyphs for begin / save / cancel. */
  readonly icons = input<RowEditIcons>();
  /** Whether this row is waiting on a conflict answer. */
  readonly conflict = input<{ asking: boolean } | undefined>();
  /**
   * Whether to draw the begin control. False when a host action owns the
   * trigger and the row is closed.
   */
  readonly showBegin = input<boolean>(true);
  /** The kit's components for each part. */
  readonly slots = input.required<RowEditActionsSlots>();

  private readonly controls = computed(() =>
    rowEditControls({
      rowEditing: this.rowEditing(),
      row: this.row(),
      rowId: this.rowId(),
      labels: this.labels(),
    })
  );

  protected readonly actionsLayout = computed(() =>
    rowEditActionsLayout(this.controls(), this.conflict(), this.showBegin())
  );

  protected readonly beginProps = computed((): RowEditButtonProps => {
    const controls = this.controls();
    const icons = this.icons();
    return {
      label: controls.editLabel,
      part: "row-edit-begin",
      icon: icons?.begin,
      className: this.buttonClassName(),
      onClick: (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        controls.begin();
      },
    };
  });

  protected readonly saveProps = computed((): RowEditButtonProps => {
    const controls = this.controls();
    const icons = this.icons();
    return {
      label: controls.saveLabel,
      part: "row-edit-save",
      icon: icons?.save,
      className: this.buttonClassName(),
      onClick: (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        controls.save();
      },
    };
  });

  protected readonly cancelProps = computed((): RowEditButtonProps => {
    const controls = this.controls();
    const icons = this.icons();
    return {
      label: controls.cancelLabel,
      part: "row-edit-cancel",
      icon: icons?.cancel,
      className: this.buttonClassName(),
      onClick: (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        controls.cancel();
      },
    };
  });
}

/**
 * The bar that ends a batch: how many rows are waiting, save all, cancel all.
 *
 * @public
 */
@Component({
  selector: "adapt-batch-edit-bar-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (model(); as m) {
      <div
        data-adapttable-part="batch-edit-bar"
        [class]="className()"
        style="display: flex; align-items: center; gap: 0.5em"
      >
        <output data-adapttable-part="batch-edit-count">{{ m.count }}</output>
        @if (m.conflictMessage !== undefined) {
          <output data-adapttable-part="batch-edit-conflict">{{
            m.conflictMessage
          }}</output>
        } @else {
          <ng-container
            [adaptControl]="slots().Button"
            [adaptControlProps]="saveProps()"
          />
        }
        <ng-container
          [adaptControl]="slots().Button"
          [adaptControlProps]="cancelProps()"
        />
      </div>
    }
  `,
})
export class AdaptBatchEditBarChrome<TRow> {
  /** The batch state. */
  readonly batch = input.required<BatchEditingState<TRow>>();
  /** Whether any pending row is waiting on a conflict answer. */
  readonly contested = input(false);
  /** Labels for the bar. */
  readonly labels = input<Partial<TableLabels>>();
  /** Class for the bar. */
  readonly className = input<string>();
  /** Class for each button. */
  readonly buttonClassName = input<string>();
  /** The kit's components for each part. */
  readonly slots = input.required<BatchEditBarSlots>();

  protected readonly model = computed(() =>
    batchEditBarModel(this.batch(), this.contested(), this.labels())
  );

  protected readonly saveProps = computed((): BatchEditButtonProps => {
    const model = this.model()!;
    return {
      label: model.saveLabel,
      part: "batch-edit-save",
      className: this.buttonClassName(),
      onClick: () => {
        this.batch().saveAll();
      },
    };
  });

  protected readonly cancelProps = computed((): BatchEditButtonProps => {
    const model = this.model()!;
    return {
      label: model.cancelLabel,
      part: "batch-edit-cancel",
      className: this.buttonClassName(),
      onClick: () => {
        this.batch().cancelAll();
      },
    };
  });
}

/**
 * One cell of a row being edited: the kit's editor bound to the row's draft,
 * or the plain display when the column is not editable.
 *
 * @public
 */
@Component({
  selector: "adapt-row-edit-cell",
  imports: [AdaptControl, AdaptCellConflictNotice, AdaptEditableCellDisplay],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (hasEditor()) {
      <ng-container
        [adaptControl]="editor()"
        [adaptControlProps]="editorCtrl()"
      />
      @if (ask(); as currentAsk) {
        @if (conflictLabels(); as labels) {
          @if (slots(); as cellSlots) {
            <adapt-cell-conflict-notice
              [ask]="currentAsk"
              [labels]="labels"
              [errorId]="errorId()"
              [errorClassName]="errorClassName()"
              [slots]="cellSlots"
            />
          }
        }
      }
    } @else {
      <adapt-editable-cell-display [props]="display()" />
    }
  `,
})
export class AdaptRowEditCell<TRow> {
  /** The row-editing state from the chrome. */
  readonly rowEditing = input.required<RowEditingState<TRow>>();
  /** The column this cell belongs to. */
  readonly column = input.required<ColumnDef<TRow>>();
  /** The cell's display content, for a column that is not editable. */
  readonly display = input.required<unknown>();
  /** Accessible name for the editor. */
  readonly editLabel = input.required<string>();
  /**
   * Whether this is the first editable column — the field that takes focus
   * when the row opens.
   */
  readonly takesFocus = input.required<boolean>();
  /** Kit editor component — receives {@link EditableCellEditorCtrl}. */
  readonly editor = input.required<Type<unknown>>();
  /** The incoming value waiting on this field, when one is asking. */
  readonly ask = input<CellConflictAsk>();
  /** Whether any field of this row is waiting on an answer. */
  readonly rowAsking = input<boolean>();
  /** Labels for the notice — already resolved. */
  readonly conflictLabels =
    input<NonNullable<EditableCellEditing<never>["conflictLabels"]>>();
  /** Class for the notice. */
  readonly errorClassName = input<string>();
  /** The kit's components, for the notice's buttons. */
  readonly slots = input<EditableCellSlots>();

  protected readonly resolved = computed(() =>
    resolveCellEditor(this.column(), this.rowEditing().featureHost)
  );

  protected readonly hasEditor = computed(() => Boolean(this.resolved()));

  protected readonly errorId = computed(() =>
    rowEditErrorId(this.column().key)
  );

  protected readonly editorCtrl = computed((): EditableCellEditorCtrl => {
    const rowEditing = this.rowEditing();
    const column = this.column();
    const editor = this.resolved()!;
    const ask = this.ask();
    const saveBlocked = rowEditSaveBlocked(ask, this.rowAsking());
    return {
      draft: rowEditing.draftFor(column.key),
      setDraft: (value) => {
        rowEditing.setDraft(column.key, value);
      },
      onEditorKeyDown: (event) => {
        handleRowEditorKey(event, rowEditing, saveBlocked);
      },
      commitOnBlur: () => undefined,
      editor,
      selectOptions: editorSelectOptions(editor),
      label: this.editLabel(),
      validating: false,
      conflict: ask !== undefined,
      errorId: this.errorId(),
      focusRef: this.takesFocus() ? focusEditorOnMount : () => undefined,
    };
  });
}

/**
 * One cell while a batch is being edited: always a field, never an activate
 * control.
 *
 * @public
 */
@Component({
  selector: "adapt-batch-edit-cell",
  imports: [AdaptControl, AdaptCellConflictNotice, AdaptEditableCellDisplay],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (hasEditor()) {
      <span
        data-adapttable-part="batch-edit-cell"
        [attr.data-changed]="changed() ? '' : null"
      >
        <ng-container
          [adaptControl]="editor()"
          [adaptControlProps]="editorCtrl()"
        />
        @if (ask(); as currentAsk) {
          @if (conflictLabels(); as labels) {
            @if (slots(); as cellSlots) {
              <adapt-cell-conflict-notice
                [ask]="currentAsk"
                [labels]="labels"
                [errorId]="errorId()"
                [errorClassName]="errorClassName()"
                [slots]="cellSlots"
              />
            }
          }
        }
      </span>
    } @else {
      <adapt-editable-cell-display [props]="display()" />
    }
  `,
})
export class AdaptBatchEditCell<TRow> {
  /** The batch state from the chrome. */
  readonly batch = input.required<BatchEditingState<TRow>>();
  /** The row this cell belongs to. */
  readonly row = input.required<TRow>();
  /** Its stable id. */
  readonly rowId = input.required<string>();
  /** The column this cell belongs to. */
  readonly column = input.required<ColumnDef<TRow>>();
  /** The cell's display content, for a column that is not editable. */
  readonly display = input.required<unknown>();
  /** Accessible name for the editor. */
  readonly editLabel = input.required<string>();
  /** Kit editor component — receives {@link EditableCellEditorCtrl}. */
  readonly editor = input.required<Type<unknown>>();
  /** The incoming value waiting on this cell. */
  readonly ask = input<CellConflictAsk>();
  /** Labels for the notice — already resolved. */
  readonly conflictLabels =
    input<NonNullable<EditableCellEditing<never>["conflictLabels"]>>();
  /** Class for the notice. */
  readonly errorClassName = input<string>();
  /** The kit's components, for the notice's buttons. */
  readonly slots = input<EditableCellSlots>();

  protected readonly resolved = computed(() =>
    resolveCellEditor(this.column(), this.batch().featureHost)
  );

  protected readonly hasEditor = computed(() => Boolean(this.resolved()));

  protected readonly errorId = computed(() =>
    batchEditErrorId(this.rowId(), this.column().key)
  );

  protected readonly changed = computed(() =>
    this.batch().isChanged(this.rowId(), this.column().key)
  );

  protected readonly editorCtrl = computed((): EditableCellEditorCtrl => {
    const batch = this.batch();
    const column = this.column();
    const row = this.row();
    const rowId = this.rowId();
    const editor = this.resolved()!;
    const ask = this.ask();
    return {
      draft: batch.draftFor(row, rowId, column.key),
      setDraft: (value) => {
        batch.setDraft(row, rowId, column.key, value);
      },
      onEditorKeyDown: () => undefined,
      commitOnBlur: () => undefined,
      editor,
      selectOptions: editorSelectOptions(editor),
      label: this.editLabel(),
      validating: false,
      conflict: ask !== undefined,
      errorId: this.errorId(),
      focusRef: () => undefined,
    };
  });
}
