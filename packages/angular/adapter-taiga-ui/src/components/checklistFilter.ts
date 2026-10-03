import {
  type ChecklistButtonProps,
  type ChecklistCheckboxProps,
  type ChecklistSearchProps,
  type ChecklistSlots,
} from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";

/**
 * The checklist's native controls: search box, button and checkbox. Native
 * is this kit's kit.
 */

/** The checklist's search box. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-checklist-search",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <tui-textfield
      ><input
        tuiInput
        type="search"
        data-adapttable-part="filter-checklist-search"
        [attr.aria-label]="p.label"
        [attr.placeholder]="p.label"
        [value]="p.value"
        (input)="p.onChange($any($event.target).value)"
    /></tui-textfield>
  `,
})
export class AdaptChecklistSearch {
  /** The search box's props. */
  readonly props = input.required<ChecklistSearchProps>();
}

/** The checklist's action button. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-checklist-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button
      tuiButton
      size="s"
      appearance="secondary"
      type="button"
      (click)="props().onClick()"
    >
      {{ props().label }}
    </button>
  `,
})
export class AdaptChecklistButton {
  /** The button's props. */
  readonly props = input.required<ChecklistButtonProps>();
}

/** One checklist value. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-checklist-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <label
      data-adapttable-part="filter-checkbox"
      style="display: inline-flex; align-items: center; gap: 8px; width: auto"
    >
      <input
        tuiCheckbox
        type="checkbox"
        [checked]="p.checked"
        (change)="p.onChange($any($event.target).checked)"
      />
      {{ p.label }}
      <span data-adapttable-part="filter-checklist-count">{{ p.count }}</span>
    </label>
  `,
})
export class AdaptChecklistCheckbox {
  /** The checkbox's props. */
  readonly props = input.required<ChecklistCheckboxProps>();
}

/** The checklist's native controls. */
export const CHECKLIST_SLOTS: ChecklistSlots = {
  Search: AdaptChecklistSearch,
  Button: AdaptChecklistButton,
  Checkbox: AdaptChecklistCheckbox,
};
