/**
 * NG-ZORRO editable cell — the kit fill for {@link EDITABLE_CELL}.
 */
import {
  AdaptAttrs,
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
  formatMultiDraft,
  isBooleanEditor,
  isDraftChecked,
  isMultiSelectEditor,
  isSelectEditor,
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
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCheckboxComponent, NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectComponent, NzSelectModule } from "ng-zorro-antd/select";

import { AdaptOverlayOrigin } from "./overlayPlacement";

@Component({
  selector: "adapt-edit-cell-activate",
  imports: [NgTemplateOutlet, NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      nz-button
      nzSize="small"
      nzType="text"
      #btn
      type="button"
      data-adapttable-part="edit-cell-activate"
      [attr.title]="p.title"
      [attr.data-dirty]="p.dirty ? '' : null"
      [attr.data-save]="p.saveStatus ?? null"
      [attr.aria-busy]="p.saveStatus === 'saving' ? true : null"
      [class]="p.className"
      style="display: block; width: 100%; height: auto; min-height: 1.25em; padding: 0; cursor: text; text-align: inherit; white-space: normal"
      (dblclick)="p.onDoubleClick($event)"
      (click)="p.onClick($event)"
      (keydown)="p.onKeyDown($event)"
    >
      @if (displayTemplate(); as template) {
        <ng-container [ngTemplateOutlet]="template" />
      } @else {
        <span>{{ p.display }} </span>
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
  private readonly btn = viewChild<
    ElementRef<HTMLButtonElement>,
    ElementRef<HTMLButtonElement>
  >("btn", { read: ElementRef });
  ngAfterViewInit(): void {
    this.props().activateRef(this.btn()?.nativeElement ?? null);
  }
}

@Component({
  selector: "adapt-edit-cell-button",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      nz-button
      nzSize="small"
      type="button"
      [attr.data-adapttable-part]="p.part"
      [class]="p.className"
      (mousedown)="p.onMouseDown?.($event)"
      (click)="p.onClick($event)"
    >
      <span>{{ p.label }} </span>
    </button>
  `,
})
class AdaptEditCellButton {
  readonly props = input.required<EditableCellButtonProps>();
}

/**
 * The NG-ZORRO editor a cell opens, with form values, validation and focus
 * bridged to the actual checkbox/input rather than a component host.
 *
 * @public
 */
@Component({
  selector: "adapt-native-cell-editor",
  imports: [
    AdaptAttrs,
    AdaptOverlayOrigin,
    FormsModule,
    NzCheckboxModule,
    NzInputModule,
    NzSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (isBooleanEditor(p.editor)) {
      <label
        nz-checkbox
        [nzChecked]="isDraftChecked(p.draft)"
        [adaptAttrs]="validationAttrs()"
        [adaptAttrsTarget]="controlTarget"
        (nzCheckedChange)="commitBoolean($event)"
        (keydown)="onKeyDown($event)"
      ></label>
    } @else if (isMultiSelectEditor(p.editor)) {
      <nz-select
        adaptOverlayOrigin
        nzMode="multiple"
        nzSize="small"
        [nzStatus]="p.error === undefined ? '' : 'error'"
        [ngModel]="multiDraft()"
        [ngModelOptions]="{ standalone: true }"
        [adaptAttrs]="validationAttrs()"
        [adaptAttrsTarget]="controlTarget"
        style="width: 100%"
        (ngModelChange)="setMultiDraft($event)"
        (keydown)="onKeyDown($event)"
        (nzBlur)="p.commitOnBlur()"
      >
        @for (option of p.selectOptions; track option.value) {
          <nz-option [nzValue]="option.value" [nzLabel]="option.label" />
        }
      </nz-select>
    } @else if (isSelectEditor(p.editor)) {
      <nz-select
        adaptOverlayOrigin
        nzSize="small"
        [nzStatus]="p.error === undefined ? '' : 'error'"
        [ngModel]="p.draft"
        [ngModelOptions]="{ standalone: true }"
        [adaptAttrs]="validationAttrs()"
        [adaptAttrsTarget]="controlTarget"
        style="width: 100%"
        (ngModelChange)="p.setDraft($event ?? '')"
        (keydown)="onKeyDown($event)"
        (nzBlur)="p.commitOnBlur()"
      >
        @for (option of p.selectOptions; track option.value) {
          <nz-option [nzValue]="option.value" [nzLabel]="option.label" />
        }
      </nz-select>
    } @else {
      <input
        nz-input
        nzSize="small"
        [nzStatus]="p.error === undefined ? '' : 'error'"
        [adaptAttrs]="validationAttrs()"
        [type]="editorInputType(p.editor)"
        [value]="p.draft"
        (input)="p.setDraft($any($event.target).value)"
        (keydown)="onKeyDown($event)"
        (blur)="p.commitOnBlur()"
      />
    }
  `,
})
export class AdaptNativeCellEditor {
  readonly props = input.required<EditableCellEditorCtrl>();
  private readonly checkbox = viewChild(NzCheckboxComponent);
  private readonly select = viewChild(NzSelectComponent);
  protected readonly controlTarget = (): HTMLElement | null =>
    (this.select()?.nzSelectTopControlComponent?.nzSelectSearchComponent
      ?.inputElement.nativeElement as HTMLInputElement | undefined) ??
    this.checkbox()?.inputElement.nativeElement ??
    null;

  protected readonly isBooleanEditor = isBooleanEditor;
  protected readonly isDraftChecked = isDraftChecked;
  protected readonly isMultiSelectEditor = isMultiSelectEditor;
  protected readonly isSelectEditor = isSelectEditor;
  protected readonly editorInputType = editorInputType;
  protected readonly multiDraft = computed(() =>
    readMultiDraft(this.props().draft)
  );
  protected readonly validationAttrs = computed(() => ({
    "data-adapttable-part": "edit-cell-editor",
    "aria-label": this.props().label,
    ...editorValidationProps(this.props()),
    ref: this.props().focusRef,
  }));

  protected setMultiDraft(values: string[] | null): void {
    this.props().setDraft(formatMultiDraft(values ?? []));
  }

  protected commitBoolean(checked: boolean): void {
    commitBooleanDraft(this.props(), checked);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    this.props().onEditorKeyDown(event);
    // Keep editing keys away from the composed grid navigation controller.
    stopCellEditKeyboard(event);
    stopEditKeys(event);
  }
}

@Component({
  selector: "adapt-edit-cell-option",
  imports: [AdaptAttrs, NzCheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <label
      #box="nzCheckbox"
      nz-checkbox
      [nzChecked]="p.checked"
      [adaptAttrs]="{ value: p.value, ref: p.focusRef }"
      [adaptAttrsTarget]="box.inputElement.nativeElement"
      (nzCheckedChange)="p.onToggle()"
      (keydown)="p.onKeyDown($event)"
    >
      {{ p.label }}
    </label>
  `,
})
class AdaptEditCellOption {
  readonly props = input.required<MultiSelectEditorCheckboxProps>();
}

const MULTI_SELECT_SLOTS: MultiSelectEditorSlots = {
  Checkbox: AdaptEditCellOption,
};

/**
 * Opt-in checkbox-list editor for multi-select columns. Other editor kinds
 * keep their NG-ZORRO controls. Pass it to {@link AdaptEditableCell}'s editor.
 *
 * @public
 */
@Component({
  selector: "adapt-checkbox-cell-editor",
  imports: [AdaptMultiSelectEditorChrome, AdaptNativeCellEditor],
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
      <adapt-native-cell-editor [props]="p" />
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

  /** Editor component override; NG-ZORRO controls remain the default. */
  readonly editor = input<Type<unknown>>(AdaptNativeCellEditor);
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
