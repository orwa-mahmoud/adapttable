/**
 * The checklist's native controls: search box, button and checkbox. Native
 * is this kit's kit.
 */
import type {
  ChecklistButtonProps,
  ChecklistCheckboxProps,
  ChecklistSearchProps,
  ChecklistSlots,
} from "@adapttable/angular/adapter";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

/** The checklist's search box. @internal */
@Component({
  imports: [MatFormFieldModule, MatInputModule],
  selector: "adapt-checklist-search",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <mat-form-field appearance="outline" subscriptSizing="dynamic"
      ><input
        matInput
        type="search"
        data-adapttable-part="filter-checklist-search"
        [attr.aria-label]="p.label"
        [attr.placeholder]="p.label"
        [value]="p.value"
        (input)="p.onChange($any($event.target).value)"
    /></mat-form-field>
  `,
})
export class AdaptChecklistSearch {
  /** The search box's props. */
  readonly props = input.required<ChecklistSearchProps>();
}

/** The checklist's action button. @internal */
@Component({
  imports: [MatButtonModule],
  selector: "adapt-checklist-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button mat-button type="button" (click)="props().onClick()">
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
  imports: [MatCheckboxModule],
  selector: "adapt-checklist-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <div
      data-adapttable-part="filter-checkbox"
      style="display: inline-flex; align-items: center; gap: 8px; width: auto"
    >
      <mat-checkbox [checked]="p.checked" (change)="p.onChange($event.checked)">
        {{ p.label }}
        <span data-adapttable-part="filter-checklist-count">{{ p.count }}</span>
      </mat-checkbox>
    </div>
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
