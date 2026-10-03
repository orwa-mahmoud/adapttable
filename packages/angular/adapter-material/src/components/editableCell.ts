/**
 * Native editable cell — the kit fill for {@link EDITABLE_CELL}.
 */
import {
  AdaptCell,
  AdaptEditableCellGate,
  AdaptMultiSelectEditorChrome,
  type ColumnDef,
  commitBooleanDraft,
  type EditableCellActivateProps,
  type EditableCellButtonProps,
  type EditableCellEditing,
  type EditableCellEditorCtrl,
  type EditableCellSlotProps,
  type EditableCellSlots,
  editorInputType,
  editorValidationProps,
  isBooleanEditor,
  isDraftChecked,
  isMultiSelectEditor,
  isSelectEditor,
  multiDraftFromSelect,
  type MultiSelectEditorCheckboxProps,
  type MultiSelectEditorSlots,
  readMultiDraft,
  stopCellEditKeyboard,
  stopEditKeys,
} from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

import { AdaptMaterialCheckboxAttrs } from "./materialCheckbox";

@Component({
  selector: "adapt-edit-cell-activate",
  imports: [MatButtonModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      mat-button
      #btn
      type="button"
      data-adapttable-part="edit-cell-activate"
      [attr.title]="p.title"
      [attr.data-dirty]="p.dirty ? '' : null"
      [attr.data-save]="p.saveStatus ?? null"
      [attr.aria-busy]="p.saveStatus === 'saving' ? true : null"
      [class]="p.className"
      style=" box-sizing: border-box; display: block; width: 100%; cursor: text; text-align: inherit"
      (dblclick)="p.onDoubleClick($event)"
      (click)="p.onClick($event)"
      (keydown)="p.onKeyDown($event)"
    >
      @if (displayTemplate(); as template) {
        <ng-container [ngTemplateOutlet]="template" />
      } @else {
        {{ p.display }}
      }
    </button>
  `,
})
class AdaptEditCellActivate implements AfterViewInit {
  readonly props = input.required<EditableCellActivateProps>();
  protected readonly displayTemplate = computed(() => {
    const content = this.props().display;
    return content instanceof TemplateRef ? content : null;
  });
  private readonly btn = viewChild<unknown, ElementRef<HTMLButtonElement>>(
    "btn",
    { read: ElementRef }
  );
  ngAfterViewInit(): void {
    this.props().activateRef(this.btn()?.nativeElement ?? null);
  }
}

@Component({
  imports: [MatButtonModule],
  selector: "adapt-edit-cell-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      mat-button
      type="button"
      [attr.data-adapttable-part]="p.part"
      [class]="p.className"
      (mousedown)="p.onMouseDown?.($event)"
      (click)="p.onClick($event)"
    >
      {{ p.label }}
    </button>
  `,
})
class AdaptEditCellButton {
  readonly props = input.required<EditableCellButtonProps>();
}

/**
 * The native editor a cell opens: a text, number or date input, a checkbox,
 * or a select, focused and committed as the editing controller says.
 *
 * @public
 */
@Component({
  imports: [
    AdaptMaterialCheckboxAttrs,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  selector: "adapt-material-cell-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @let v = editorValidationProps(p);
    @if (isBooleanEditor(p.editor)) {
      <mat-checkbox
        #el
        adaptCheckboxPart="edit-cell-editor"
        [aria-label]="p.label"
        [attr.aria-invalid]="v['aria-invalid'] ?? null"
        [attr.aria-describedby]="v['aria-describedby'] ?? null"
        [attr.aria-busy]="v['aria-busy'] ?? null"
        [attr.data-conflict]="v['data-conflict'] ?? null"
        [checked]="isDraftChecked(p.draft)"
        (change)="commitBoolean($event.checked)"
        (keydown)="onKeyDown($event)"
      ></mat-checkbox>
    } @else if (isMultiSelectEditor(p.editor)) {
      <mat-form-field appearance="outline" subscriptSizing="dynamic"
        ><select
          matNativeControl
          #el
          data-adapttable-part="edit-cell-editor"
          multiple
          [attr.aria-label]="p.label"
          [attr.aria-invalid]="v['aria-invalid'] ?? null"
          [attr.aria-describedby]="v['aria-describedby'] ?? null"
          [attr.aria-busy]="v['aria-busy'] ?? null"
          [attr.data-conflict]="v['data-conflict'] ?? null"
          (change)="p.setDraft(multiDraftFromSelect($any($event.target)))"
          (keydown)="onKeyDown($event)"
          (blur)="p.commitOnBlur()"
        >
          @for (option of p.selectOptions; track option.value) {
            <option
              [value]="option.value"
              [selected]="readMultiDraft(p.draft).includes(option.value)"
            >
              {{ option.label }}
            </option>
          }
        </select></mat-form-field
      >
    } @else if (isSelectEditor(p.editor)) {
      <mat-form-field appearance="outline" subscriptSizing="dynamic"
        ><select
          matNativeControl
          #el
          data-adapttable-part="edit-cell-editor"
          [attr.aria-label]="p.label"
          [attr.aria-invalid]="v['aria-invalid'] ?? null"
          [attr.aria-describedby]="v['aria-describedby'] ?? null"
          [attr.aria-busy]="v['aria-busy'] ?? null"
          [attr.data-conflict]="v['data-conflict'] ?? null"
          [value]="p.draft"
          (change)="p.setDraft($any($event.target).value)"
          (keydown)="onKeyDown($event)"
          (blur)="p.commitOnBlur()"
        >
          @for (option of p.selectOptions; track option.value) {
            <option
              [value]="option.value"
              [selected]="option.value === p.draft"
            >
              {{ option.label }}
            </option>
          }
        </select></mat-form-field
      >
    } @else {
      <mat-form-field appearance="outline" subscriptSizing="dynamic"
        ><input
          matInput
          #el
          data-adapttable-part="edit-cell-editor"
          [attr.aria-label]="p.label"
          [attr.aria-invalid]="v['aria-invalid'] ?? null"
          [attr.aria-describedby]="v['aria-describedby'] ?? null"
          [attr.aria-busy]="v['aria-busy'] ?? null"
          [attr.data-conflict]="v['data-conflict'] ?? null"
          [type]="editorInputType(p.editor)"
          [value]="p.draft"
          (input)="p.setDraft($any($event.target).value)"
          (keydown)="onKeyDown($event)"
          (blur)="p.commitOnBlur()"
      /></mat-form-field>
    }
  `,
})
export class AdaptMaterialCellEditor implements AfterViewInit {
  readonly props = input.required<EditableCellEditorCtrl>();
  private readonly el = viewChild<unknown, ElementRef<HTMLElement>>("el", {
    read: ElementRef,
  });

  protected readonly editorValidationProps = editorValidationProps;
  protected readonly isBooleanEditor = isBooleanEditor;
  protected readonly isDraftChecked = isDraftChecked;
  protected readonly isMultiSelectEditor = isMultiSelectEditor;
  protected readonly isSelectEditor = isSelectEditor;
  protected readonly editorInputType = editorInputType;
  protected readonly readMultiDraft = readMultiDraft;
  protected readonly multiDraftFromSelect = multiDraftFromSelect;

  ngAfterViewInit(): void {
    const el = this.el()?.nativeElement;
    this.props().focusRef(
      el?.matches("mat-checkbox")
        ? el.querySelector<HTMLInputElement>("input")
        : (el ?? null)
    );
  }

  protected commitBoolean(checked: boolean): void {
    commitBooleanDraft(this.props(), checked);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    this.props().onEditorKeyDown(event);
    // Stop at the editor so composed cellNavigation does not steal arrow
    // keys from the caret (core's stopCellEditKeyboard).
    stopCellEditKeyboard(event);
    stopEditKeys(event);
  }
}

@Component({
  imports: [MatCheckboxModule],
  selector: "adapt-edit-cell-option",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <div>
      <mat-checkbox
        #el
        [value]="p.value"
        [checked]="p.checked"
        (change)="p.onToggle()"
        (keydown)="p.onKeyDown($event)"
      >
        {{ p.label }}
      </mat-checkbox>
    </div>
  `,
})
class AdaptEditCellOption implements AfterViewInit {
  readonly props = input.required<MultiSelectEditorCheckboxProps>();
  private readonly el = viewChild.required<unknown, ElementRef<HTMLElement>>(
    "el",
    { read: ElementRef }
  );

  ngAfterViewInit(): void {
    this.props().focusRef?.(
      this.el().nativeElement.querySelector<HTMLInputElement>("input") ?? null
    );
  }
}

const MULTI_SELECT_SLOTS: MultiSelectEditorSlots = {
  Checkbox: AdaptEditCellOption,
};

/**
 * Opt-in checkbox-list editor for multi-select columns. Other editor kinds
 * keep their native controls. Pass it to {@link AdaptEditableCell}'s editor.
 *
 * @public
 */
@Component({
  selector: "adapt-checkbox-cell-editor",
  imports: [AdaptMultiSelectEditorChrome, AdaptMaterialCellEditor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (isMultiSelectEditor(p.editor)) {
      <adapt-multi-select-editor-chrome
        [ctrl]="p"
        [label]="p.label"
        [onKeyDown]="onKeyDown"
        [slots]="slots"
      />
    } @else {
      <adapt-material-cell-editor [props]="p" />
    }
  `,
})
export class AdaptCheckboxCellEditor {
  /** The active cell's controller, supplied by the editable-cell gate. */
  readonly props = input.required<EditableCellEditorCtrl>();
  protected readonly isMultiSelectEditor = isMultiSelectEditor;
  protected readonly slots = MULTI_SELECT_SLOTS;

  protected readonly onKeyDown = (event: KeyboardEvent): void => {
    this.props().onEditorKeyDown(event);
    stopCellEditKeyboard(event);
    stopEditKeys(event);
  };
}

const SLOTS: EditableCellSlots = {
  Activate: AdaptEditCellActivate,
  Button: AdaptEditCellButton,
};

/**
 * Opt-in editable cell — pass-through when `editing` is omitted. Fills
 * {@link EDITABLE_CELL}.
 *
 * @public
 */
@Component({
  selector: "adapt-editable-cell",
  imports: [AdaptCell, AdaptEditableCellGate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <ng-template #display>
      <span
        [adaptCell]="column()"
        [adaptCellRow]="p.row"
        [adaptCellIndex]="p.rowIndex"
      ></span>
    </ng-template>
    <adapt-editable-cell-gate
      [editing]="editing()"
      [row]="p.row"
      [column]="column()"
      [rowId]="p.rowId"
      [rows]="p.rows"
      [columns]="columns()"
      [rowKey]="p.rowKey"
      [editLabel]="p.editLabel"
      [undoLabel]="p.undoLabel"
      [display]="p.display ?? display"
      [editor]="editor()"
      [slots]="slots"
    />
  `,
})
export class AdaptEditableCell<TRow> {
  /** Slot props from the table's editable-cell fill. */
  readonly props = input.required<EditableCellSlotProps<TRow>>();

  /** Editor component override; native controls remain the default. */
  readonly editor = input<Type<unknown>>(AdaptMaterialCellEditor);
  protected readonly slots = SLOTS;

  /**
   * Editing bundle from the slot — typed for the gate.
   *
   * @internal
   */
  protected editing(): EditableCellEditing<TRow> | undefined {
    return this.props().editing as EditableCellEditing<TRow> | undefined;
  }

  /**
   * Column from the slot — typed for the gate.
   *
   * @internal
   */
  protected column(): ColumnDef<TRow> {
    return this.props().column;
  }

  /**
   * Columns from the slot — typed for the gate.
   *
   * @internal
   */
  protected columns(): readonly ColumnDef<TRow>[] {
    return this.props().columns;
  }
}

export type { EditableCellEditing };
