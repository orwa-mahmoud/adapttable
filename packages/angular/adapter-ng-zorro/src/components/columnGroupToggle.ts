/**
 * The control that collapses a grouped column header, drawn with an NG-ZORRO
 * button.
 */
import {
  AdaptColumnGroupToggleChrome,
  AdaptIcon,
  type ColumnGroupToggleButtonProps,
  type ColumnGroupToggleProps,
  type ColumnGroupToggleSlots,
  expandChevronIcon,
} from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";

/**
 * An NG-ZORRO button with a disclosure glyph.
 *
 * @public
 */
@Component({
  selector: "adapt-column-group-button",
  imports: [AdaptIcon, NzButtonModule],
  styles: `
    .column-group-chevron {
      display: inline-flex;
    }
    .column-group-chevron:dir(rtl) {
      transform: scaleX(-1);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      nz-button
      nzType="text"
      type="button"
      data-adapttable-part="column-group-toggle"
      [class]="p.className ?? ''"
      [attr.aria-expanded]="p.expanded"
      [attr.aria-label]="p.label"
      style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5em;
        height: 1.5em;
        flex-shrink: 0;
        padding: 0;
        margin-inline-end: 0.25em;
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
      "
      (click)="$event.stopPropagation(); p.onClick()"
    >
      <span aria-hidden="true" class="column-group-chevron">
        <svg [adaptIcon]="chevron()"></svg>
      </span>
    </button>
  `,
})
export class AdaptColumnGroupButton {
  /** The button's name, state and click. */
  readonly props = input.required<ColumnGroupToggleButtonProps>();

  /** Shape and open state come from core; direction follows the host. */
  protected readonly chevron = computed(() =>
    expandChevronIcon({ open: this.props().expanded })
  );
}

const SLOTS: ColumnGroupToggleSlots = { Button: AdaptColumnGroupButton };

/**
 * A column group's collapse control — the `COLUMN_GROUP_TOGGLE` slot's
 * component.
 *
 * @public
 */
@Component({
  selector: "adapt-column-group-toggle",
  imports: [AdaptColumnGroupToggleChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <adapt-column-group-toggle-chrome
      [cell]="p.cell"
      [labels]="p.labels"
      [onToggle]="p.onToggle"
      [className]="p.className"
      [slots]="slots"
    />
  `,
})
export class AdaptColumnGroupToggle {
  /** The group cell, labels and toggle. */
  readonly props = input.required<ColumnGroupToggleProps>();
  /** @internal */
  protected readonly slots = SLOTS;
}
