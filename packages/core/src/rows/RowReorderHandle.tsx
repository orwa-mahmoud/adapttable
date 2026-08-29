/**
 * Row-reorder layout. The live region stays here. Adapters pass the grip
 * and the mobile up/down buttons the end user clicks.
 */
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import type { RowReorderLabels, RowReorderState } from "./rowReorder";

export type { RowReorderLabels };

/**
 * Props for an adapter `RowReorderHandle` — no slots on the public API.
 *
 * @public
 */
export interface RowReorderHandleProps<TRow> {
  /** Row-reorder state: what is being dragged and where it may land. */
  reorder: RowReorderState<TRow>;
  /** Resolved labels, every key filled. */
  labels: RowReorderLabels;
  /** Identity of the row this control moves. */
  rowId: string;
  /** The row's index within the rendered window. */
  localIndex: number;
  /** The row being rendered. */
  row: TRow;
  /** Index of the first rendered row, so a windowed index maps back. */
  windowStart: number;
  /** Rows in the whole dataset, for the move bounds. */
  rowCount: number;
  /** Class for the element. */
  className?: string;
}

/**
 * Kit grip the reorder chrome calls.
 *
 * @public
 */
export interface RowReorderHandleSlotProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Whether the grip is held. */
  readonly pressed: boolean;
  /** Whether a drag is in progress. */
  readonly dragging: boolean;
  /** Class for the element. */
  readonly className?: string;
  /** Pointer bindings that start and track the drag. */
  readonly dragProps: ReturnType<RowReorderState<unknown>["dragProps"]>;
  /** Handles the keyboard move keys. */
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Adapter-supplied controls for {@link RowReorderHandleChrome}.
 *
 * @public
 */
export interface RowReorderHandleSlots {
  /** Renders the drag grip. */
  readonly Handle: (props: RowReorderHandleSlotProps) => ReactNode;
}

/**
 * Props for {@link RowReorderHandleChrome}.
 *
 * @public
 */
export interface RowReorderHandleChromeProps<
  TRow,
> extends RowReorderHandleProps<TRow> {
  /** The kit's components for each part. */
  readonly slots: RowReorderHandleSlots;
}

/**
 * Desktop grip: pointer drag plus Space-lift keyboard. Kits wrap this in
 * their own `<td>` / `<th>` so the cell looks like the rest of the row.
 *
 * @public
 */
export function RowReorderHandleChrome<TRow>({
  reorder,
  labels,
  rowId,
  localIndex,
  row,
  windowStart,
  rowCount,
  className,
  slots,
}: Readonly<RowReorderHandleChromeProps<TRow>>): ReactElement {
  const lifted = reorder.isLifted(rowId);
  const Handle = slots.Handle;
  return (
    <Handle
      label={labels.reorderRow}
      pressed={lifted}
      dragging={lifted}
      className={className}
      dragProps={reorder.dragProps(rowId, localIndex)}
      onKeyDown={(event) => {
        reorder.handleKeyDown(
          event,
          rowId,
          localIndex,
          row,
          windowStart,
          rowCount
        );
      }}
    />
  );
}

/**
 * Props for an adapter `RowReorderButtons` — no slots on the public API.
 *
 * @public
 */
export interface RowReorderButtonsProps<TRow> {
  /** Row-reorder state: what is being dragged and where it may land. */
  reorder: RowReorderState<TRow>;
  /** Resolved labels, every key filled. */
  labels: RowReorderLabels;
  /** The row's index within the rendered window. */
  localIndex: number;
  /** The row being rendered. */
  row: TRow;
  /** Index of the first rendered row, so a windowed index maps back. */
  windowStart: number;
  /** Rows in the whole dataset, for the move bounds. */
  rowCount: number;
  /** Class for the element. */
  className?: string;
  /** Class for the move-up button. */
  upClassName?: string;
  /** Class for the move-down button. */
  downClassName?: string;
}

/**
 * Kit button the mobile reorder chrome calls.
 *
 * @public
 */
export interface RowReorderMoveButtonProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Part name, so styling can target this element. */
  readonly part: string;
  /** Whether the control is offered but not available. */
  readonly disabled: boolean;
  /** Class for the element. */
  readonly className?: string;
  /** Called when pressed. */
  readonly onClick: () => void;
}

/**
 * Adapter-supplied controls for {@link RowReorderButtonsChrome}.
 *
 * @public
 */
export interface RowReorderButtonsSlots {
  /** Renders one move button. */
  readonly Button: (props: RowReorderMoveButtonProps) => ReactNode;
}

/**
 * Props for {@link RowReorderButtonsChrome}.
 *
 * @public
 */
export interface RowReorderButtonsChromeProps<
  TRow,
> extends RowReorderButtonsProps<TRow> {
  /** The kit's components for each part. */
  readonly slots: RowReorderButtonsSlots;
}

/**
 * Mobile up/down — a drag handle on a card is unusable. Each press swaps
 * with the neighbour; the ends disable rather than wrapping.
 *
 * @public
 */
export function RowReorderButtonsChrome<TRow>({
  reorder,
  labels,
  localIndex,
  row,
  windowStart,
  rowCount,
  className,
  upClassName,
  downClassName,
  slots,
}: Readonly<RowReorderButtonsChromeProps<TRow>>): ReactElement {
  const Button = slots.Button;
  return (
    <span data-adapttable-part="row-reorder-buttons" className={className}>
      <Button
        label={labels.moveRowUp}
        part="row-reorder-up"
        disabled={localIndex <= 0}
        className={upClassName}
        onClick={() => {
          reorder.moveBy(localIndex, -1, row, windowStart, rowCount);
        }}
      />
      <Button
        label={labels.moveRowDown}
        part="row-reorder-down"
        disabled={localIndex >= rowCount - 1}
        className={downClassName}
        onClick={() => {
          reorder.moveBy(localIndex, 1, row, windowStart, rowCount);
        }}
      />
    </span>
  );
}

/**
 * The live region for row reorder. Kits mount this only when reorder is armed.
 *
 * @public
 */
export function RowReorderAnnouncer(
  props: Readonly<{ announcement: string }>
): ReactElement {
  return (
    <LiveRegion part="row-reorder-announcer">{props.announcement}</LiveRegion>
  );
}

export type { SortByOption } from "../types";
