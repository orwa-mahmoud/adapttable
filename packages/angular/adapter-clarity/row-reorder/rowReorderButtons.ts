/**
 * Native mobile up/down buttons for row reorder — the kit fill for the
 * buttons slot.
 */
import {
  AdaptRowReorderButtonsChrome,
  type RowReorderButtonsProps,
  type RowReorderButtonsSlots,
  type RowReorderMoveButtonProps,
} from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { AdaptRowMoveMenu } from "./rowMoveMenu";

const REORDER_BUTTON = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "2.75rem",
  minHeight: "2.75rem",
  flexShrink: "0",
  padding: "0",
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
} as const;

@Component({
  selector: "adapt-row-reorder-move-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
  template: `
    @let p = props();
    <button
      class="btn btn-sm btn-outline"
      type="button"
      [attr.data-adapttable-part]="p.part"
      [attr.aria-label]="p.label"
      [disabled]="p.disabled"
      [class]="p.className"
      [style]="buttonStyle"
      (click)="p.onClick()"
    >
      {{ p.part === "row-reorder-up" ? "↑" : "↓" }}
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
  host: { class: "adapttable-clarity", style: "display: contents" },
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
