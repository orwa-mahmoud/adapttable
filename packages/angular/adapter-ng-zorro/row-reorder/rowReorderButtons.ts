/**
 * NG-ZORRO mobile up/down buttons for row reorder — the kit fill for the
 * buttons slot.
 */
import {
  AdaptRowReorderButtonsChrome,
  type RowReorderButtonsProps,
  type RowReorderButtonsSlots,
  type RowReorderMoveButtonProps,
} from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";

import { AdaptRowMoveMenu } from "./rowMoveMenu";

const REORDER_BUTTON = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "2.75rem",
  minHeight: "2.75rem",
  flexShrink: "0",
  padding: "0",
  cursor: "pointer",
} as const;

@Component({
  selector: "adapt-row-reorder-move-button",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      nz-button
      nzSize="small"
      nzType="text"
      type="button"
      [attr.data-adapttable-part]="p.part"
      [attr.aria-label]="p.label"
      [disabled]="p.disabled"
      [class]="p.className"
      [style]="buttonStyle"
      (click)="p.onClick()"
    >
      <span>{{ p.part === "row-reorder-up" ? "↑" : "↓" }} </span>
    </button>
  `,
})
class AdaptRowReorderMoveButton {
  readonly props = input.required<RowReorderMoveButtonProps>();
  protected readonly buttonStyle = REORDER_BUTTON;
}

const SLOTS: RowReorderButtonsSlots = {
  Button: AdaptRowReorderMoveButton,
  Menu: AdaptRowMoveMenu,
};

/**
 * Keyboard-reachable move-up and move-down for a row — fills
 * {@link ROW_REORDER_BUTTONS}.
 *
 * @public
 */
@Component({
  selector: "adapt-row-reorder-buttons",
  imports: [AdaptRowReorderButtonsChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <adapt-row-reorder-buttons-chrome
      [reorder]="p.reorder"
      [labels]="p.labels"
      [localIndex]="p.localIndex"
      [row]="p.row"
      [windowStart]="p.windowStart"
      [rowCount]="p.rowCount"
      [className]="p.className"
      [upClassName]="p.upClassName"
      [downClassName]="p.downClassName"
      [slots]="slots"
    />
  `,
})
export class AdaptRowReorderButtons<TRow> {
  /** Buttons props from the table's reorder slot. */
  readonly props = input.required<RowReorderButtonsProps<TRow>>();

  protected readonly slots = SLOTS;
}
