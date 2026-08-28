/**
 * Row-reorder layout. The live region stays here. Adapters pass the grip
 * and the mobile up/down buttons the end user clicks.
 */
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import type { RowReorderLabels, RowReorderState } from "./rowReorder";

/** Props for an adapter `RowReorderHandle` — no slots on the public API. */
export interface RowReorderHandleProps<TRow> {
  reorder: RowReorderState<TRow>;
  labels: RowReorderLabels;
  rowId: string;
  localIndex: number;
  row: TRow;
  windowStart: number;
  rowCount: number;
  className?: string;
}

/** Kit grip the reorder chrome calls. */
export interface RowReorderHandleSlotProps {
  readonly label: string;
  readonly pressed: boolean;
  readonly dragging: boolean;
  readonly className?: string;
  readonly dragProps: ReturnType<RowReorderState<unknown>["dragProps"]>;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/** Adapter-supplied controls for {@link RowReorderHandleChrome}. */
export interface RowReorderHandleSlots {
  readonly Handle: (props: RowReorderHandleSlotProps) => ReactNode;
}

/** Props for {@link RowReorderHandleChrome}. */
export interface RowReorderHandleChromeProps<
  TRow,
> extends RowReorderHandleProps<TRow> {
  readonly slots: RowReorderHandleSlots;
}

/**
 * Desktop grip: pointer drag plus Space-lift keyboard. Kits wrap this in
 * their own `<td>` / `<th>` so the cell looks like the rest of the row.
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

/** Props for an adapter `RowReorderButtons` — no slots on the public API. */
export interface RowReorderButtonsProps<TRow> {
  reorder: RowReorderState<TRow>;
  labels: RowReorderLabels;
  localIndex: number;
  row: TRow;
  windowStart: number;
  rowCount: number;
  className?: string;
  upClassName?: string;
  downClassName?: string;
}

/** Kit button the mobile reorder chrome calls. */
export interface RowReorderMoveButtonProps {
  readonly label: string;
  readonly part: string;
  readonly disabled: boolean;
  readonly className?: string;
  readonly onClick: () => void;
}

/** Adapter-supplied controls for {@link RowReorderButtonsChrome}. */
export interface RowReorderButtonsSlots {
  readonly Button: (props: RowReorderMoveButtonProps) => ReactNode;
}

/** Props for {@link RowReorderButtonsChrome}. */
export interface RowReorderButtonsChromeProps<
  TRow,
> extends RowReorderButtonsProps<TRow> {
  readonly slots: RowReorderButtonsSlots;
}

/**
 * Mobile up/down — a drag handle on a card is unusable. Each press swaps
 * with the neighbour; the ends disable rather than wrapping.
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

/** The live region for row reorder. Kits mount this only when reorder is armed. */
export function RowReorderAnnouncer(
  props: Readonly<{ announcement: string }>
): ReactElement {
  return (
    <LiveRegion part="row-reorder-announcer">{props.announcement}</LiveRegion>
  );
}
