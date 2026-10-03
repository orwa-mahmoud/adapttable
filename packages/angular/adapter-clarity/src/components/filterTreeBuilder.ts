/**
 * The filter tree's native controls: select, input, button and disclosure.
 * Clarity directives and button styling fill the binding slots.
 */
import {
  type AngularFilterTreeDisclosureProps,
  type FilterTreeButtonProps,
  type FilterTreeInputProps,
  type FilterTreeSelectProps,
  type FilterTreeSlots,
} from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { ClrInputModule, ClrSelectModule } from "@clr/angular";

/** The tree's choice control. @internal */
@Component({
  imports: [ClrSelectModule],
  selector: "adapt-tree-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
  template: `
    @let p = props();
    <select
      clrSelect
      [attr.aria-label]="p.label"
      [attr.data-adapttable-part]="p.part"
      [value]="p.value"
      style="flex: 0 1 8.5rem; min-width: 8.5rem; max-width: 11rem"
      (change)="p.onChange($any($event.target).value)"
    >
      @for (option of p.options; track option.value) {
        <option [value]="option.value" [selected]="option.value === p.value">
          {{ option.label }}
        </option>
      }
    </select>
  `,
})
export class AdaptTreeSelect {
  /** The select's props. */
  readonly props = input.required<FilterTreeSelectProps>();
}

/** The tree's text, number or date field. @internal */
@Component({
  imports: [ClrInputModule],
  selector: "adapt-tree-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
  template: `
    @let p = props();
    <input
      clrInput
      data-adapttable-part="filter-input"
      [attr.aria-label]="p.label"
      [type]="p.type"
      [value]="p.value"
      style="flex: 1 1 7rem; min-width: 7rem"
      (input)="p.onChange($any($event.target).value)"
    />
  `,
})
export class AdaptTreeInput {
  /** The input's props. */
  readonly props = input.required<FilterTreeInputProps>();
}

/** The tree's action button. @internal */
@Component({
  selector: "adapt-tree-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
  template: `
    @let p = props();
    <button
      class="btn btn-sm btn-outline"
      type="button"
      [attr.data-adapttable-part]="p.part ?? null"
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
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
  template: `
    @let p = props();
    <section
      data-adapttable-part="filter-tree"
      style="margin-block-end: 4px; padding-block-end: 16px; border-block-end: 1px solid color-mix(in srgb, currentColor 14%, transparent)"
    >
      <button
        class="btn btn-sm btn-link"
        type="button"
        [attr.aria-expanded]="p.expanded"
        (click)="p.onExpandedChange(!p.expanded)"
        data-adapttable-part="filter-tree-summary"
        style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-weight: 600; font-size: 0.8125rem; padding-block: 4px; list-style: none"
      >
        {{ p.label }}
        <span aria-hidden="true">{{ p.expanded ? "▴" : "▾" }}</span>
      </button>
      @if (p.expanded) {
        <ng-container [ngTemplateOutlet]="p.children" />
      }
    </section>
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
