/**
 * The header checkbox that selects a whole column, drawn with an NG-ZORRO
 * checkbox.
 */
import {
  AdaptAttrs,
  AdaptColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
  type ColumnSelectCheckboxProps,
  type ColumnSelectSlots,
} from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";

/**
 * An NG-ZORRO checkbox. It carries no part of its own: `column-select` on the
 * Chrome's wrapper names the whole control, as in every other kit.
 *
 * @public
 */
@Component({
  selector: "adapt-column-select-box",
  imports: [AdaptAttrs, NzCheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <label
      #box="nzCheckbox"
      nz-checkbox
      [nzChecked]="props().checked"
      [adaptAttrs]="{ 'aria-label': props().label }"
      [adaptAttrsTarget]="box.inputElement.nativeElement"
      (nzCheckedChange)="props().onToggle()"
    ></label>
  `,
})
export class AdaptColumnSelectBox {
  /** The checkbox's name, state and toggle. */
  readonly props = input.required<ColumnSelectCheckboxProps>();
}

const SLOTS: ColumnSelectSlots = { Checkbox: AdaptColumnSelectBox };

/**
 * The column-selection checkbox in a header cell — the `COLUMN_SELECT`
 * slot's component.
 *
 * @public
 */
@Component({
  selector: "adapt-column-select-checkbox",
  imports: [AdaptColumnSelectCheckboxChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <adapt-column-select-checkbox-chrome
      [label]="p.label"
      [checked]="p.checked"
      [onToggle]="p.onToggle"
      [className]="p.className"
      [slots]="slots"
    />
  `,
})
export class AdaptColumnSelectCheckbox {
  /** The column's checkbox props. */
  readonly props = input.required<ColumnSelectCheckboxChromeProps>();
  /** @internal */
  protected readonly slots = SLOTS;
}
