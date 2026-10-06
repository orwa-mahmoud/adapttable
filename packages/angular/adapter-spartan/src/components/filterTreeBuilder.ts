/**
 * The filter tree's Brain/Helm controls: select, input, button and disclosure.
 * Behavior is owned by Spartan Brain.
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
import {
  BrnCollapsible,
  BrnCollapsibleContent,
  BrnCollapsibleTrigger,
} from "@spartan-ng/brain/collapsible";

import {
  HlmButton,
  HlmInput,
  HlmNativeOption,
  HlmNativeSelect,
} from "../helm/controls";

/** The tree's choice control. @internal */
@Component({
  imports: [HlmNativeSelect, HlmNativeOption],
  selector: "adapt-tree-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <select
      adaptHlmNativeSelect
      [attr.aria-label]="p.label"
      [attr.data-adapttable-part]="p.part"
      [value]="p.value"
      style="flex: 0 1 8.5rem; min-width: 8.5rem; max-width: 11rem"
      (change)="p.onChange($any($event.target).value)"
    >
      @for (option of p.options; track option.value) {
        <option
          adaptHlmNativeOption
          [value]="option.value"
          [selected]="option.value === p.value"
        >
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
  imports: [HlmInput],
  selector: "adapt-tree-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <input
      adaptHlmInput
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
  imports: [HlmButton],
  selector: "adapt-tree-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      adaptHlmButton
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
  imports: [
    NgTemplateOutlet,
    HlmButton,
    BrnCollapsible,
    BrnCollapsibleContent,
    BrnCollapsibleTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <div
      brnCollapsible
      data-adapttable-part="filter-tree"
      [expanded]="p.expanded"
      style="margin-block-end: 4px; padding-block-end: 16px; border-block-end: 1px solid color-mix(in srgb, currentColor 14%, transparent)"
      (expandedChange)="p.onExpandedChange($event)"
    >
      <button
        adaptHlmButton
        brnCollapsibleTrigger
        data-adapttable-part="filter-tree-summary"
        style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-weight: 600; font-size: 0.8125rem; padding-block: 4px; list-style: none"
      >
        {{ p.label }}
        <span aria-hidden="true">{{ p.expanded ? "▴" : "▾" }}</span>
      </button>
      @if (p.expanded) {
        <div brnCollapsibleContent>
          <ng-container [ngTemplateOutlet]="p.children" />
        </div>
      }
    </div>
  `,
})
export class AdaptTreeDisclosure {
  /** The disclosure's props. */
  readonly props = input.required<AngularFilterTreeDisclosureProps>();
}

/** The filter tree's Brain/Helm controls. */
export const TREE_SLOTS: FilterTreeSlots = {
  Select: AdaptTreeSelect,
  Input: AdaptTreeInput,
  Button: AdaptTreeButton,
  Disclosure: AdaptTreeDisclosure,
};
