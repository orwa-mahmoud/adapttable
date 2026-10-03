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
import { BrnCheckbox } from "@spartan-ng/brain/checkbox";

import {
  HlmButton,
  HlmCheckbox,
  HlmInput,
  HlmNativeOption,
  HlmNativeSelect,
} from "../helm/controls";

@Component({
  selector: "adapt-edit-cell-activate",
  imports: [HlmButton, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      adaptHlmButton
      #btn
      type="button"
      data-adapttable-part="edit-cell-activate"
      [attr.title]="p.title"
      [attr.data-dirty]="p.dirty ? '' : null"
      [attr.data-save]="p.saveStatus ?? null"
      [attr.aria-busy]="p.saveStatus === 'saving' ? true : null"
      [class]="p.className"
      style="all: unset; box-sizing: border-box; display: block; width: 100%; cursor: text; text-align: inherit"
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
  private readonly btn = viewChild<ElementRef<HTMLButtonElement>>("btn");
  ngAfterViewInit(): void {
    this.props().activateRef(this.btn()?.nativeElement ?? null);
  }
}

@Component({
  imports: [HlmButton],
  selector: "adapt-edit-cell-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      adaptHlmButton
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
    HlmInput,
    HlmNativeSelect,
    HlmNativeOption,
    HlmCheckbox,
    BrnCheckbox,
  ],
  selector: "adapt-native-cell-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @let v = editorValidationProps(p);
    @if (isBooleanEditor(p.editor)) {
      <brn-checkbox
        adaptHlmCheckbox
        #el
        data-adapttable-part="edit-cell-editor"
        [aria-label]="p.label"
        [attr.aria-invalid]="v['aria-invalid'] ?? null"
        [aria-describedby]="v['aria-describedby'] ?? null"
        [attr.aria-busy]="v['aria-busy'] ?? null"
        [attr.data-conflict]="v['data-conflict'] ?? null"
        [checked]="isDraftChecked(p.draft)"
        (checkedChange)="commitBoolean($event)"
        (keydown)="onKeyDown($event)"
      />
    } @else if (isMultiSelectEditor(p.editor)) {
      <select
        adaptHlmNativeSelect
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
            adaptHlmNativeOption
            [value]="option.value"
            [selected]="readMultiDraft(p.draft).includes(option.value)"
          >
            {{ option.label }}
          </option>
        }
      </select>
    } @else if (isSelectEditor(p.editor)) {
      <select
        adaptHlmNativeSelect
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
            adaptHlmNativeOption
            [value]="option.value"
            [selected]="option.value === p.draft"
          >
            {{ option.label }}
          </option>
        }
      </select>
    } @else {
      <input
        adaptHlmInput
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
      />
    }
  `,
})
export class AdaptNativeCellEditor implements AfterViewInit {
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
    const host = this.el()?.nativeElement;
    this.props().focusRef(
      host?.querySelector<HTMLElement>("button") ?? host ?? null
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
  imports: [HlmCheckbox, BrnCheckbox],
  selector: "adapt-edit-cell-option",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <label>
      <brn-checkbox
        adaptHlmCheckbox
        #el
        [attr.data-value]="p.value"
        [checked]="p.checked"
        (checkedChange)="p.onToggle()"
        (keydown)="p.onKeyDown($event)"
      />
      {{ p.label }}
    </label>
  `,
})
class AdaptEditCellOption implements AfterViewInit {
  readonly props = input.required<MultiSelectEditorCheckboxProps>();
  private readonly el = viewChild.required<unknown, ElementRef<HTMLElement>>(
    "el",
    { read: ElementRef }
  );

  ngAfterViewInit(): void {
    const host = this.el().nativeElement;
    this.props().focusRef?.(host.querySelector<HTMLElement>("button") ?? host);
  }
}

const MULTI_SELECT_SLOTS: MultiSelectEditorSlots = {
  Checkbox: AdaptEditCellOption,
};

/**
 * Opt-in checkbox-list editor for multi-select columns. Other editor kinds
 * keep their Brain/Helm controls. Pass it to {@link AdaptEditableCell}'s editor.
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

  /** Editor component override; Brain/Helm controls remain the default. */
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
