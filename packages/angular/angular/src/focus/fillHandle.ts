/** The selection-corner gate; the kit owns the visible fill handle. */
import { sameGridCell } from "@adapttable/core";
import type { FillHandleSlotProps } from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Type,
} from "@angular/core";

import { AdaptControl } from "../control";
import type { GridFocus } from "./gridFocus";

export type { FillHandleSlotProps } from "@adapttable/core/binding";

/** The row-independent focus state the handle consumes. @public */
export type FillHandleFocus = Pick<
  GridFocus<unknown>,
  "fillHandleCell" | "fillHandleLabel" | "getFillHandleProps"
>;

/** Kit-owned handle control, receiving one `props` input. @public */
export interface FillHandleSlots {
  /** The visible drag affordance. */
  readonly Handle: Type<unknown>;
}

/** Placement and styling for a cell's fill handle. @public */
export interface FillHandleChromeProps {
  /** The table's live grid state. */
  readonly focus: FillHandleFocus | undefined;
  /** Row index within the rendered window. */
  readonly windowIndex: number;
  /** Column index in the grid. */
  readonly col: number;
  /** Dataset offset of the rendered window. */
  readonly firstRowIndex?: number;
  /** Kit-specific class for the visible handle. */
  readonly className?: string;
}

/** Renders the required kit control only at the selection corner. @public */
@Component({
  selector: "adapt-fill-handle-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (handleProps(); as props) {
      <ng-container
        [adaptControl]="slots().Handle"
        [adaptControlProps]="props"
      />
    }
  `,
})
export class AdaptFillHandleChrome {
  /** The grid state, absent when cell navigation is off. */
  readonly focus = input<FillHandleFocus>();
  /** Row index in the rendered window. */
  readonly windowIndex = input.required<number>();
  /** Column index in the grid. */
  readonly col = input.required<number>();
  /** Dataset offset of the rendered window. */
  readonly firstRowIndex = input(0);
  /** Kit-specific class for the visible handle. */
  readonly className = input<string>();
  /** Required kit control; the binding has no visible fallback. */
  readonly slots = input.required<FillHandleSlots>();

  /** The current corner's localized drag props. @internal */
  protected readonly handleProps = computed((): FillHandleSlotProps | null => {
    const focus = this.focus();
    const corner = focus?.fillHandleCell();
    if (
      !focus ||
      !corner ||
      !sameGridCell(corner, {
        row: this.firstRowIndex() + this.windowIndex(),
        col: this.col(),
      })
    )
      return null;
    return {
      label: focus.fillHandleLabel(),
      handleProps: focus.getFillHandleProps(),
      className: this.className(),
    };
  });
}
