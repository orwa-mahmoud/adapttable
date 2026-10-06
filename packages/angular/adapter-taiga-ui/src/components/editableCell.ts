import type { ColumnDef, EditableCellEditing } from "@adapttable/angular";
import {
  AdaptCell,
  AdaptEditableCellGate,
  AdaptMultiSelectEditorChrome,
  commitBooleanDraft,
  type EditableCellActivateProps,
  type EditableCellButtonProps,
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
  multiDraftFromSelect,
  type MultiSelectEditorCheckboxProps,
  type MultiSelectEditorSlots,
  readMultiDraft,
  stopCellEditKeyboard,
  stopEditKeys,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterNextRender,
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";
import { AdaptTaigaEditorValidation } from "./editorValidation";

/**
 * Native editable cell — the kit fill for {@link EDITABLE_CELL}.
 */

@Component({
  selector: "adapt-edit-cell-activate",
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      tuiButton
      size="s"
      appearance="secondary"
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
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-edit-cell-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      tuiButton
      size="s"
      appearance="secondary"
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
  imports: [...TAIGA_CONTROLS, AdaptTaigaEditorValidation],
  selector: "adapt-native-cell-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @let v = editorValidationProps(p);
    @if (isBooleanEditor(p.editor)) {
      <input
        tuiCheckbox
        [adaptTaigaEditorValidation]="p.error"
        [adaptTaigaEditorErrorId]="p.errorId"
        #el
        data-adapttable-part="edit-cell-editor"
        type="checkbox"
        [ngModelOptions]="{ standalone: true }"
        [attr.aria-label]="p.label"
        [attr.aria-invalid]="v['aria-invalid'] ?? null"
        [attr.aria-describedby]="v['aria-describedby'] ?? null"
        [attr.aria-busy]="v['aria-busy'] ?? null"
        [attr.data-conflict]="v['data-conflict'] ?? null"
        [ngModel]="isDraftChecked(p.draft)"
        (ngModelChange)="commitBoolean($event)"
        (keydown)="onKeyDown($event)"
      />
    } @else if (isMultiSelectEditor(p.editor)) {
      <fieldset
        #el
        tabindex="-1"
        data-adapttable-part="edit-cell-editor"
        [attr.aria-label]="p.label"
        [attr.aria-invalid]="v['aria-invalid'] ?? null"
        [attr.aria-describedby]="v['aria-describedby'] ?? null"
        [attr.aria-busy]="v['aria-busy'] ?? null"
        [attr.data-conflict]="v['data-conflict'] ?? null"
        (keydown)="onKeyDown($event)"
      >
        @for (option of p.selectOptions; track option.value) {
          <label
            ><input
              tuiCheckbox
              type="checkbox"
              [ngModelOptions]="{ standalone: true }"
              [ngModel]="readMultiDraft(p.draft).includes(option.value)"
              (ngModelChange)="toggleOption(option.value)"
            />{{ option.label }}</label
          >
        }
      </fieldset>
    } @else if (isSelectEditor(p.editor)) {
      <tui-textfield [stringify]="p.selectOptions | taigaLabels"
        ><input
          tuiSelect
          [adaptTaigaEditorValidation]="p.error"
          [adaptTaigaEditorErrorId]="p.errorId"
          [ngModelOptions]="{ standalone: true }"
          #el
          data-adapttable-part="edit-cell-editor"
          [attr.aria-label]="p.label"
          [attr.aria-invalid]="v['aria-invalid'] ?? null"
          [attr.aria-describedby]="v['aria-describedby'] ?? null"
          [attr.aria-busy]="v['aria-busy'] ?? null"
          [attr.data-conflict]="v['data-conflict'] ?? null"
          [ngModel]="p.draft"
          (ngModelChange)="p.setDraft($event ?? '')"
          (keydown)="onKeyDown($event)"
          (blur)="commitOnBlur($event)"
        /><tui-data-list *tuiDropdown>
          @for (option of p.selectOptions; track option.value) {
            <button tuiOption type="button" [value]="option.value">
              {{ option.label }}
            </button>
          }
        </tui-data-list></tui-textfield
      >
    } @else {
      <tui-textfield
        ><input
          tuiInput
          [adaptTaigaEditorValidation]="p.error"
          [adaptTaigaEditorErrorId]="p.errorId"
          [ngModelOptions]="{ standalone: true }"
          #el
          data-adapttable-part="edit-cell-editor"
          [attr.aria-label]="p.label"
          [attr.aria-invalid]="v['aria-invalid'] ?? null"
          [attr.aria-describedby]="v['aria-describedby'] ?? null"
          [attr.aria-busy]="v['aria-busy'] ?? null"
          [attr.data-conflict]="v['data-conflict'] ?? null"
          [type]="editorInputType(p.editor)"
          [ngModel]="p.draft"
          (ngModelChange)="p.setDraft($event == null ? '' : '' + $event)"
          (keydown)="onKeyDown($event)"
          (blur)="commitOnBlur($event)"
      /></tui-textfield>
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

  protected commitOnBlur(event: FocusEvent): void {
    if (
      event.relatedTarget instanceof Element &&
      event.relatedTarget.closest("tui-dropdown")
    )
      return;
    this.props().commitOnBlur();
  }

  protected toggleOption(value: string): void {
    const p = this.props();
    const values = readMultiDraft(p.draft);
    p.setDraft(
      formatMultiDraft(
        values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value]
      )
    );
  }

  ngAfterViewInit(): void {
    this.props().focusRef(this.el()?.nativeElement ?? null);
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
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-edit-cell-option",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <label>
      <input
        tuiCheckbox
        #el
        type="checkbox"
        [ngModelOptions]="{ standalone: true }"
        [value]="p.value"
        [ngModel]="p.checked"
        (ngModelChange)="p.onToggle()"
        (keydown)="p.onKeyDown($event)"
      />
      {{ p.label }}
    </label>
  `,
})
class AdaptEditCellOption {
  private readonly destroyRef = inject(DestroyRef);
  readonly props = input.required<MultiSelectEditorCheckboxProps>();
  private readonly el = viewChild.required<
    unknown,
    ElementRef<HTMLInputElement>
  >("el", { read: ElementRef });

  constructor() {
    afterNextRender(() => {
      const element = this.el().nativeElement;
      const focus = this.props().focusRef;
      queueMicrotask(() => {
        if (!this.destroyRef.destroyed && element.isConnected) focus?.(element);
      });
    });
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
  imports: [
    ...TAIGA_CONTROLS,
    AdaptMultiSelectEditorChrome,
    AdaptNativeCellEditor,
  ],
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
  imports: [...TAIGA_CONTROLS, AdaptCell, AdaptEditableCellGate],
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
