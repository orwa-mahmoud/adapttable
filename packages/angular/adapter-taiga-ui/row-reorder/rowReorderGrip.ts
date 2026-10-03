import {
  AdaptIcon,
  AdaptRowReorderHandleChrome,
  GRIP_ICON,
  type RowReorderHandleProps,
  type RowReorderHandleSlotProps,
  type RowReorderHandleSlots,
} from "@adapttable/angular";
import { ɵTAIGA_CONTROLS as TAIGA_CONTROLS } from "@adapttable/taiga-ui";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { AdaptRowMoveMenu } from "./rowMoveMenu";

/**
 * Native desktop grip for row reorder — the kit fill for the handle slot.
 */

const REORDER_BUTTON = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "1.75em",
  height: "1.75em",
  flexShrink: "0",
  padding: "0",
  border: "none",
  background: "transparent",
  color: "inherit",
} as const;

@Component({
  selector: "adapt-row-reorder-grip-button",
  imports: [...TAIGA_CONTROLS, AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      tuiButton
      size="s"
      appearance="secondary"
      type="button"
      data-adapttable-part="row-reorder-handle"
      data-adapttable-grip=""
      [attr.data-dragging]="p.dragging ? '' : null"
      [attr.aria-label]="p.label"
      [attr.aria-pressed]="p.pressed ? 'true' : 'false'"
      [disabled]="p.disabled"
      [class]="p.className"
      [attr.draggable]="p.dragProps.draggable ? 'true' : null"
      [style]="buttonStyle(p.pressed)"
      (dragstart)="p.dragProps.onDragStart($event)"
      (dragend)="p.dragProps.onDragEnd()"
      (keydown)="p.onKeyDown($event)"
    >
      <svg [adaptIcon]="gripIcon"></svg>
    </button>
  `,
})
class AdaptRowReorderGripButton {
  readonly props = input.required<RowReorderHandleSlotProps>();
  protected readonly gripIcon = GRIP_ICON;

  protected buttonStyle(pressed: boolean): Record<string, string> {
    return {
      ...REORDER_BUTTON,
      cursor: pressed ? "grabbing" : "grab",
    };
  }
}

const SLOTS: RowReorderHandleSlots = {
  Handle: AdaptRowReorderGripButton,
  Menu: AdaptRowMoveMenu,
};

/**
 * The drag handle for reordering a row — fills {@link ROW_REORDER_HANDLE}.
 *
 * @public
 */
@Component({
  selector: "adapt-row-reorder-grip",
  imports: [...TAIGA_CONTROLS, AdaptRowReorderHandleChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <adapt-row-reorder-handle-chrome
      [reorder]="p.reorder"
      [labels]="p.labels"
      [rowId]="p.rowId"
      [localIndex]="p.localIndex"
      [row]="p.row"
      [windowStart]="p.windowStart"
      [rowCount]="p.rowCount"
      [className]="p.className"
      [slots]="slots"
    />
  `,
})
export class AdaptRowReorderGrip<TRow> {
  /** Handle props from the table's reorder slot. */
  readonly props = input.required<RowReorderHandleProps<TRow>>();

  protected readonly slots = SLOTS;
}
