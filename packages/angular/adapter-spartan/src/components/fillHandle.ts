/** A native pointer affordance for core's range-fill gesture. */
import {
  AdaptAttrs,
  AdaptFillHandleChrome,
  type FillHandleChromeProps,
  type FillHandleSlotProps,
  type FillHandleSlots,
} from "@adapttable/angular/adapter";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { HlmButton } from "../helm/controls";

/** The Spartan kit's visible drag handle. @public */
@Component({
  selector: "adapt-fill-handle-control",
  imports: [AdaptAttrs, HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <span
      data-adapttable-part="fill-handle-anchor"
      style="position: relative; display: block; height: 0"
    >
      <button
        adaptHlmButton
        type="button"
        tabindex="-1"
        data-adapttable-part="fill-handle"
        [adaptAttrs]="props().handleProps"
        aria-hidden="true"
        [title]="props().label"
        [class]="props().className ?? ''"
        style="position: absolute; inset-inline-end: -3px; bottom: -3px; width: 8px; height: 8px; min-height: 0; padding: 0; border-radius: 1px; background: var(--adapttable-fill-handle, currentColor); cursor: crosshair"
      ></button>
    </span>
  `,
})
export class AdaptFillHandleControl {
  /** Localized title, drag handler and optional class. */
  readonly props = input.required<FillHandleSlotProps>();
}

const SLOTS: FillHandleSlots = { Handle: AdaptFillHandleControl };

/** The selected cell's fill handle, drawn by the Spartan kit. @public */
@Component({
  selector: "adapt-fill-handle",
  imports: [AdaptFillHandleChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <adapt-fill-handle-chrome
      [focus]="p.focus"
      [windowIndex]="p.windowIndex"
      [col]="p.col"
      [firstRowIndex]="p.firstRowIndex ?? 0"
      [className]="p.className"
      [slots]="slots"
    />
  `,
})
export class AdaptFillHandle {
  /** The cell's placement and live grid focus state. */
  readonly props = input.required<FillHandleChromeProps>();
  /** @internal */
  protected readonly slots = SLOTS;
}
