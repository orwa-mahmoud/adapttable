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
import { CollapseDirective } from "ngx-bootstrap/collapse";

/** The tree's choice control. @internal */
@Component({
  selector: "adapt-tree-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <select
      class="form-select form-select-sm"
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
  selector: "adapt-tree-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <input
      class="form-control form-control-sm"
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
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      class="btn btn-outline-secondary btn-sm"
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
  imports: [NgTemplateOutlet, CollapseDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <section
      data-adapttable-part="filter-tree"
      style="margin-block-end: 4px; padding-block-end: 16px; border-block-end: 1px solid color-mix(in srgb, currentColor 14%, transparent)"
    >
      <button
        class="btn btn-outline-secondary btn-sm"
        type="button"
        [attr.aria-expanded]="p.expanded"
        (click)="p.onExpandedChange(!p.expanded)"
        data-adapttable-part="filter-tree-summary"
        style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-weight: 600; font-size: 0.8125rem; padding-block: 4px; list-style: none"
      >
        {{ p.label }}
        <span aria-hidden="true">{{ p.expanded ? "▴" : "▾" }}</span>
      </button>
      <div [collapse]="!p.expanded" [isAnimated]="false">
        @if (p.expanded) {
          <ng-container [ngTemplateOutlet]="p.children" />
        }
      </div>
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
