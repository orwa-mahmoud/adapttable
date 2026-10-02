/**
 * Multi-select editor structure for kits whose select holds one value.
 * The kit supplies every checkbox; the binding owns the group and focus.
 */
import {
  editorValidationProps,
  formatMultiDraft,
  readMultiDraft,
} from "@adapttable/core";
import type { MultiSelectEditorCheckboxProps as NeutralMultiSelectEditorCheckboxProps } from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Type,
} from "@angular/core";

import { AdaptControl } from "../control";
import type { EditableCellEditorCtrl } from "./editableCellShared";

/**
 * Props passed to each kit checkbox through its `props` input.
 *
 * @public
 */
export type MultiSelectEditorCheckboxProps =
  NeutralMultiSelectEditorCheckboxProps<unknown, KeyboardEvent>;

/**
 * Required kit controls for {@link AdaptMultiSelectEditorChrome}.
 *
 * @public
 */
export interface MultiSelectEditorSlots {
  /** The kit's checkbox, accepting {@link MultiSelectEditorCheckboxProps}. */
  readonly Checkbox: Type<unknown>;
}

/**
 * A named group of kit checkboxes standing in for a multi-value select.
 * Native-capable kits can keep their native multi-select editor.
 *
 * @public
 */
@Component({
  selector: "adapt-multi-select-editor-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let v = validation();
    <div
      #group
      role="group"
      [attr.aria-label]="label()"
      data-adapttable-part="edit-cell-editor"
      [attr.aria-invalid]="v['aria-invalid'] ?? null"
      [attr.aria-describedby]="v['aria-describedby'] ?? null"
      [attr.aria-busy]="v['aria-busy'] ?? null"
      [attr.data-conflict]="v['data-conflict'] ?? null"
      style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0"
      (focusout)="onBlur($event, group)"
    >
      @for (option of options(); track option.value) {
        <ng-container
          [adaptControl]="slots().Checkbox"
          [adaptControlProps]="option"
        />
      }
    </div>
  `,
})
export class AdaptMultiSelectEditorChrome {
  /** The active cell's editor controller. */
  readonly ctrl = input.required<EditableCellEditorCtrl>();
  /** Localized accessible name for the group. */
  readonly label = input.required<string>();
  /** Kit key handling, already wired to the editor controller. */
  readonly onKeyDown = input.required<(event: KeyboardEvent) => void>();
  /** The kit's checkbox component. */
  readonly slots = input.required<MultiSelectEditorSlots>();

  protected readonly validation = computed(() =>
    editorValidationProps(this.ctrl())
  );

  protected readonly options = computed(
    (): readonly MultiSelectEditorCheckboxProps[] => {
      const ctrl = this.ctrl();
      const selected = readMultiDraft(ctrl.draft);
      return ctrl.selectOptions.map((option, index) => ({
        label: option.label,
        value: option.value,
        checked: selected.includes(option.value),
        onToggle: () => {
          const next = selected.includes(option.value)
            ? selected.filter((value) => value !== option.value)
            : [...selected, option.value];
          ctrl.setDraft(
            formatMultiDraft(
              ctrl.selectOptions
                .map((item) => item.value)
                .filter((value) => next.includes(value))
            )
          );
        },
        onKeyDown: this.onKeyDown(),
        focusRef: index === 0 ? ctrl.focusRef : undefined,
      }));
    }
  );

  protected onBlur(event: FocusEvent, group: HTMLElement): void {
    if (
      event.relatedTarget instanceof Node &&
      group.contains(event.relatedTarget)
    ) {
      return;
    }
    this.ctrl().commitOnBlur();
  }
}
