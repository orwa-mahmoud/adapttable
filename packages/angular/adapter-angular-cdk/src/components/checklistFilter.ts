/**
 * The checklist's native controls: search box, button and checkbox. Native
 * is this kit's kit.
 */
import {
  type ChecklistButtonProps,
  type ChecklistCheckboxProps,
  type ChecklistSearchProps,
  type ChecklistSlots,
} from "@adapttable/angular";
import { A11yModule } from "@angular/cdk/a11y";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** The checklist's search box. @internal */
@Component({
  imports: [A11yModule],
  selector: "adapt-checklist-search",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <input
      cdkMonitorElementFocus
      data-adapttable-cdk-control
      type="search"
      data-adapttable-part="filter-checklist-search"
      [attr.aria-label]="p.label"
      [attr.placeholder]="p.label"
      [value]="p.value"
      (input)="p.onChange($any($event.target).value)"
    />
  `,
})
export class AdaptChecklistSearch {
  /** The search box's props. */
  readonly props = input.required<ChecklistSearchProps>();
}

/** The checklist's action button. @internal */
@Component({
  imports: [A11yModule],
  selector: "adapt-checklist-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button
      cdkMonitorElementFocus
      data-adapttable-cdk-control
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
  imports: [A11yModule],
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
        cdkMonitorElementFocus
        data-adapttable-cdk-control
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
