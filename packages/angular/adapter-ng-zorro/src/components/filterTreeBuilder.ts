/** The filter tree's NG-ZORRO selects, inputs, buttons and disclosure. */
import {
  AdaptAttrs,
  type AngularFilterTreeDisclosureProps,
  type FilterTreeButtonProps,
  type FilterTreeInputProps,
  type FilterTreeSelectProps,
  type FilterTreeSlots,
} from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCollapseModule } from "ng-zorro-antd/collapse";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzInputNumberModule } from "ng-zorro-antd/input-number";
import { NzSelectModule } from "ng-zorro-antd/select";

import { AdaptOverlayOrigin } from "./overlayPlacement";

let nextControlId = 0;

/** A unique native input id, including when several trees are open. */
function controlId(): string {
  nextControlId += 1;
  return `adapttable-tree-control-${String(nextControlId)}`;
}

const HIDDEN_LABEL =
  "position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap";

/** The tree's choice control. @internal */
@Component({
  selector: "adapt-tree-select",
  imports: [AdaptOverlayOrigin, FormsModule, NzSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <label [for]="id" [style]="hiddenLabel">{{ p.label }}</label>
    <nz-select
      adaptOverlayOrigin
      nzSize="small"
      [nzId]="id"
      [attr.data-adapttable-part]="p.part"
      [class]="p.className"
      [ngModel]="p.value"
      style="flex: 0 1 8.5rem; min-width: 8.5rem; max-width: 11rem"
      (ngModelChange)="p.onChange($event)"
    >
      @for (option of p.options; track option.value) {
        <nz-option [nzValue]="option.value" [nzLabel]="option.label" />
      }
    </nz-select>
  `,
})
export class AdaptTreeSelect {
  /** The select's props. */
  readonly props = input.required<FilterTreeSelectProps>();
  protected readonly id = controlId();
  protected readonly hiddenLabel = HIDDEN_LABEL;
}

/** The tree's text, number or date field. @internal */
@Component({
  selector: "adapt-tree-input",
  imports: [AdaptAttrs, FormsModule, NzInputModule, NzInputNumberModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @if (p.type === "number") {
      <label [for]="id" [style]="hiddenLabel">{{ p.label }}</label>
      <nz-input-number
        #numeric
        [adaptAttrs]="{ 'aria-valuenow': numberValue() }"
        [adaptAttrsTarget]="numberTarget"
        [nzControls]="false"
        nzSize="small"
        [nzId]="id"
        data-adapttable-part="filter-input"
        [class]="p.className"
        [ngModel]="numberValue()"
        style="flex: 1 1 7rem; min-width: 7rem"
        (ngModelChange)="writeNumber($event)"
      />
    } @else {
      <input
        nz-input
        nzSize="small"
        data-adapttable-part="filter-input"
        [attr.aria-label]="p.label"
        [class]="p.className"
        [type]="p.type"
        [value]="p.value"
        style="flex: 1 1 7rem; min-width: 7rem"
        (input)="p.onChange($any($event.target).value)"
      />
    }
  `,
})
export class AdaptTreeInput {
  /** The input's props. */
  readonly props = input.required<FilterTreeInputProps>();
  protected readonly id = controlId();
  protected readonly hiddenLabel = HIDDEN_LABEL;
  protected readonly numberValue = computed(() =>
    this.props().value === "" ? null : Number(this.props().value)
  );
  private readonly numberElement = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("numeric", { read: ElementRef });
  protected readonly numberTarget = () =>
    this.numberElement()?.nativeElement.querySelector<HTMLInputElement>(
      "input"
    ) ?? null;

  protected writeNumber(value: number | null): void {
    this.props().onChange(value === null ? "" : String(value));
  }
}

/** The tree's action button. @internal */
@Component({
  selector: "adapt-tree-button",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      nz-button
      nzSize="small"
      type="button"
      [attr.data-adapttable-part]="p.part ?? null"
      [class]="p.className"
      (click)="p.onClick()"
    >
      <span>{{ p.label }} </span>
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
  imports: [NgTemplateOutlet, NzCollapseModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <nz-collapse
      data-adapttable-part="filter-tree"
      [class]="p.className"
      [nzGhost]="true"
      nzSize="small"
      style="grid-column: 1 / -1; margin-block-end: 0; padding-block-end: 4px; border-block-end: 1px solid color-mix(in srgb, currentColor 14%, transparent)"
    >
      <nz-collapse-panel
        [nzHeader]="summary"
        [nzActive]="p.expanded"
        (nzActiveChange)="p.onExpandedChange($event)"
      >
        <ng-template #summary>
          <span
            data-adapttable-part="filter-tree-summary"
            [class]="p.summaryClassName"
            >{{ p.label }}</span
          >
        </ng-template>
        @if (p.expanded) {
          <ng-container [ngTemplateOutlet]="p.children" />
        }
      </nz-collapse-panel>
    </nz-collapse>
  `,
})
export class AdaptTreeDisclosure {
  /** The disclosure's props. */
  readonly props = input.required<AngularFilterTreeDisclosureProps>();
}

/** The filter tree's NG-ZORRO controls. */
export const TREE_SLOTS: FilterTreeSlots = {
  Select: AdaptTreeSelect,
  Input: AdaptTreeInput,
  Button: AdaptTreeButton,
  Disclosure: AdaptTreeDisclosure,
};
