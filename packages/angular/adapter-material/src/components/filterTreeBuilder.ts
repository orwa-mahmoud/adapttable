/**
 * The filter tree's native controls: select, input, button and disclosure.
 * Native is this kit's kit.
 */
import type {
  AngularFilterTreeDisclosureProps,
  FilterTreeButtonProps,
  FilterTreeInputProps,
  FilterTreeSelectProps,
  FilterTreeSlots,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

/** The tree's choice control. @internal */
@Component({
  imports: [MatFormFieldModule, MatInputModule],
  selector: "adapt-tree-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <mat-form-field appearance="outline" subscriptSizing="dynamic"
      ><select
        matNativeControl
        [attr.aria-label]="p.label"
        [attr.data-adapttable-part]="p.part"
        [class]="p.className"
        [value]="p.value"
        style="flex: 0 1 8.5rem; min-width: 8.5rem; max-width: 11rem"
        (change)="p.onChange($any($event.target).value)"
      >
        @for (option of p.options; track option.value) {
          <option [value]="option.value" [selected]="option.value === p.value">
            {{ option.label }}
          </option>
        }
      </select></mat-form-field
    >
  `,
})
export class AdaptTreeSelect {
  /** The select's props. */
  readonly props = input.required<FilterTreeSelectProps>();
}

/** The tree's text, number or date field. @internal */
@Component({
  imports: [MatFormFieldModule, MatInputModule],
  selector: "adapt-tree-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <mat-form-field appearance="outline" subscriptSizing="dynamic"
      ><input
        matInput
        data-adapttable-part="filter-input"
        [class]="p.className"
        [attr.aria-label]="p.label"
        [type]="p.type"
        [value]="p.value"
        style="flex: 1 1 7rem; min-width: 7rem"
        (input)="p.onChange($any($event.target).value)"
    /></mat-form-field>
  `,
})
export class AdaptTreeInput {
  /** The input's props. */
  readonly props = input.required<FilterTreeInputProps>();
}

/** The tree's action button. @internal */
@Component({
  imports: [MatButtonModule],
  selector: "adapt-tree-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      mat-button
      type="button"
      [attr.data-adapttable-part]="p.part ?? null"
      [class]="p.className"
      (click)="p.onClick()"
    >
      {{ p.label }}
    </button>
  `,
})
export class AdaptTreeButton {
  /** The button's props. */
  readonly props = input.required<FilterTreeButtonProps>();
}

/** The tree's collapsible Advanced section. @internal */
@Component({
  selector: "adapt-tree-disclosure",
  imports: [MatExpansionModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <mat-expansion-panel
      data-adapttable-part="filter-tree"
      [class]="p.className"
      [expanded]="p.expanded"
      style="grid-column: 1 / -1; margin-block-end: 0; padding-block-end: 0; border-block-end: 1px solid color-mix(in srgb, currentColor 14%, transparent)"
      (opened)="p.onExpandedChange(true)"
      (closed)="p.onExpandedChange(false)"
    >
      <mat-expansion-panel-header
        data-adapttable-part="filter-tree-summary"
        [class]="p.summaryClassName"
        style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-weight: 600; font-size: 0.8125rem; padding-block: 4px; list-style: none"
      >
        {{ p.label }}
      </mat-expansion-panel-header>
      @if (p.expanded) {
        <ng-container [ngTemplateOutlet]="p.children" />
      }
    </mat-expansion-panel>
  `,
})
export class AdaptTreeDisclosure {
  /** The disclosure's props. */
  readonly props = input.required<AngularFilterTreeDisclosureProps>();
}

/** The filter tree's native controls. */
export const TREE_SLOTS: FilterTreeSlots = {
  Select: AdaptTreeSelect,
  Input: AdaptTreeInput,
  Button: AdaptTreeButton,
  Disclosure: AdaptTreeDisclosure,
};
