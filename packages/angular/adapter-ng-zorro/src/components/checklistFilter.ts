/**
 * The checklist's NG-ZORRO search, action buttons and checkbox controls.
 */
import type {
  ChecklistButtonProps,
  ChecklistCheckboxProps,
  ChecklistSearchProps,
  ChecklistSlots,
} from "@adapttable/angular/adapter";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { NzInputModule } from "ng-zorro-antd/input";

/** The checklist's search box. @internal */
@Component({
  selector: "adapt-checklist-search",
  imports: [NzInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <input
      nz-input
      nzSize="small"
      type="search"
      data-adapttable-part="filter-checklist-search"
      [attr.aria-label]="p.label"
      [attr.placeholder]="p.label"
      [value]="p.value"
      [class]="p.className"
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
  selector: "adapt-checklist-button",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <button nz-button nzSize="small" type="button" (click)="props().onClick()">
      <span>{{ props().label }} </span>
    </button>
  `,
})
export class AdaptChecklistButton {
  /** The button's props. */
  readonly props = input.required<ChecklistButtonProps>();
}

/** One checklist value. @internal */
@Component({
  selector: "adapt-checklist-checkbox",
  imports: [FormsModule, NzCheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <span
      data-adapttable-part="filter-checkbox"
      [class]="p.className"
      style="display: inline-flex; align-items: center; gap: 8px; width: auto"
    >
      <label
        nz-checkbox
        [ngModel]="p.checked"
        (ngModelChange)="p.onChange($event)"
      >
        {{ p.label }}
        <span
          data-adapttable-part="filter-checklist-count"
          [class]="p.countClassName"
          >{{ p.count }}</span
        >
      </label>
    </span>
  `,
})
export class AdaptChecklistCheckbox {
  /** The checkbox's props. */
  readonly props = input.required<ChecklistCheckboxProps>();
}

/** The checklist's NG-ZORRO controls. */
export const CHECKLIST_SLOTS: ChecklistSlots = {
  Search: AdaptChecklistSearch,
  Button: AdaptChecklistButton,
  Checkbox: AdaptChecklistCheckbox,
};
