/**
 * The filter tree's native controls: select, input, button and disclosure.
 * Simple controls are styled by this adapter; Aria supplies composite behavior.
 */
import {
  type AngularFilterTreeDisclosureProps,
  type FilterTreeButtonProps,
  type FilterTreeInputProps,
  type FilterTreeSelectProps,
  type FilterTreeSlots,
} from "@adapttable/angular";
import {
  AccordionContent,
  AccordionGroup,
  AccordionPanel,
  AccordionTrigger,
} from "@angular/aria/accordion";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { AdaptAriaSelect } from "./ariaSelect";

/** The tree's choice control. @internal */
@Component({
  selector: "adapt-tree-select",
  imports: [AdaptAriaSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: contents" },
  template: `
    @let p = props();
    <adapt-aria-select
      [label]="p.label"
      [part]="p.part"
      [value]="p.value"
      [options]="p.options"
      (valueChange)="p.onChange($event)"
    />
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
  host: { class: "adapt-aria", style: "display: contents" },
  template: `
    @let p = props();
    <input
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
  host: { class: "adapt-aria", style: "display: contents" },
  template: `
    @let p = props();
    <button
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
    AccordionGroup,
    AccordionTrigger,
    AccordionPanel,
    AccordionContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: contents" },
  template: `
    @let p = props();
    <div ngAccordionGroup data-adapttable-part="filter-tree">
      <button
        type="button"
        ngAccordionTrigger
        [panel]="panel"
        [expanded]="p.expanded"
        (expandedChange)="p.onExpandedChange($event)"
        data-adapttable-part="filter-tree-summary"
      >
        {{ p.label }}
      </button>
      <div ngAccordionPanel #panel="ngAccordionPanel">
        <ng-template ngAccordionContent>
          <ng-container [ngTemplateOutlet]="p.children" />
        </ng-template>
      </div>
    </div>
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
