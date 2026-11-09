/**
 * Row-reorder layout. The live region stays here. Adapters pass the grip
 * and the mobile up/down buttons the end user clicks.
 */
import {
  rowMoveMenuProps,
  type RowMoveMenuSlotProps,
  type RowReorderButtonsProps as NeutralRowReorderButtonsProps,
  type RowReorderButtonsSlots as NeutralRowReorderButtonsSlots,
  type RowReorderHandleProps as NeutralRowReorderHandleProps,
  type RowReorderHandleSlotProps as NeutralRowReorderHandleSlotProps,
  type RowReorderHandleSlots as NeutralRowReorderHandleSlots,
} from "@adapttable/core/binding";
import type { DragEvent, KeyboardEvent, ReactElement, ReactNode } from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import type { RowReorderLabels, RowReorderState } from "./rowReorder";

export type { RowReorderLabels };
export type {
  RowMoveConfirmationProps,
  RowMoveMenuItemProps,
  RowMoveMenuSlotProps,
  RowReorderMoveButtonProps,
} from "@adapttable/core/binding";

/**
 * Props for an adapter `RowReorderHandle` — `@adapttable/core`'s
 * `RowReorderHandleProps` over React's row-reorder state.
 *
 * @public
 */
export type RowReorderHandleProps<TRow> = NeutralRowReorderHandleProps<
  TRow,
  RowReorderState<TRow>
>;

/**
 * Kit grip the reorder chrome calls — `@adapttable/core`'s
 * `RowReorderHandleSlotProps` with React's key and drag events.
 *
 * @public
 */
export type RowReorderHandleSlotProps = NeutralRowReorderHandleSlotProps<
  KeyboardEvent<HTMLElement>,
  DragEvent<HTMLElement>
>;

/**
 * Adapter-supplied controls for {@link RowReorderHandleChrome} —
 * `@adapttable/core`'s `RowReorderHandleSlots` drawing React nodes.
 *
 * @public
 */
export type RowReorderHandleSlots = NeutralRowReorderHandleSlots<
  ReactNode,
  KeyboardEvent<HTMLElement>,
  DragEvent<HTMLElement>
>;

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
/**
 * The destination menu both reorder controls offer, and the state it needs.
 *
 * A grip and a pair of arrow buttons are different affordances for the same
 * move, and the menu behind them is one thing: the same targets, the same
 * lock while a move is in flight, the same confirmation text.
 */
function RowMoveMenu<TRow>({
  reorder,
  labels,
  row,
  moveLocked,
  Menu,
}: Readonly<{
  reorder: RowReorderState<TRow>;
  labels: RowReorderLabels;
  row: TRow;
  moveLocked: boolean;
  Menu: (props: RowMoveMenuSlotProps) => ReactNode;
}>): ReactNode {
  const props = rowMoveMenuProps(reorder, labels, row, moveLocked);
  return props ? <Menu {...props} /> : null;
}

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
  const moveLocked = Boolean(reorder.hostConfirmPending || reorder.pendingMove);
  return (
    <>
      <Handle
        label={labels.reorderRow}
        pressed={lifted}
        dragging={lifted}
        disabled={moveLocked}
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
      <RowMoveMenu
        reorder={reorder}
        labels={labels}
        row={row}
        moveLocked={moveLocked}
        Menu={slots.Menu}
      />
    </>
  );
}

/**
 * Props for an adapter `RowReorderButtons` — `@adapttable/core`'s
 * `RowReorderButtonsProps` over React's row-reorder state.
 *
 * @public
 */
export type RowReorderButtonsProps<TRow> = NeutralRowReorderButtonsProps<
  TRow,
  RowReorderState<TRow>
>;

/**
 * Adapter-supplied controls for {@link RowReorderButtonsChrome} —
 * `@adapttable/core`'s `RowReorderButtonsSlots` drawing React nodes.
 *
 * @public
 */
export type RowReorderButtonsSlots = NeutralRowReorderButtonsSlots<ReactNode>;

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
  const moveLocked = Boolean(reorder.hostConfirmPending || reorder.pendingMove);
  return (
    <span data-adapttable-part="row-reorder-buttons" className={className}>
      <Button
        label={labels.moveRowUp}
        part="row-reorder-up"
        disabled={moveLocked || localIndex <= 0}
        className={upClassName}
        onClick={() => {
          reorder.moveBy(localIndex, -1, row, windowStart, rowCount);
        }}
      />
      <Button
        label={labels.moveRowDown}
        part="row-reorder-down"
        disabled={moveLocked || localIndex >= rowCount - 1}
        className={downClassName}
        onClick={() => {
          reorder.moveBy(localIndex, 1, row, windowStart, rowCount);
        }}
      />
      <RowMoveMenu
        reorder={reorder}
        labels={labels}
        row={row}
        moveLocked={moveLocked}
        Menu={slots.Menu}
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

export type { SortByOption } from "@adapttable/core";
