/**
 * Lean wrappers around optional cell chrome.
 *
 * DesktopTable and MobileCards import this file instead of the kit
 * implementations, so omitting a feature omits those components.
 */
import {
  COLUMN_GROUP_TOGGLE,
  COLUMN_HEADER_RENAME,
  COLUMN_SELECT,
  type ColumnGroupToggleProps,
  type ColumnHeaderRenameSlotProps,
  type ColumnSelectCheckboxChromeProps,
  EDITABLE_CELL,
  type EditableCellSlotProps,
  EXPAND_TOGGLE,
  type ExpandToggleSlotProps,
  FeatureSlot,
  type FeatureSlotKey,
  FILL_HANDLE,
  type FillHandleCellSlotProps,
  FILTER_HEADER,
  type FilterHeaderControlProps,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
  type RowEditActionsProps,
  type RowReorderButtonsProps,
  type RowReorderHandleProps,
  TREE_CELL,
  TREE_TOGGLE,
  type TreeCellProps,
  type TreeToggleProps,
  useFeatureSlotFilled,
} from "@adapttable/react/adapter";
import type { ReactNode } from "react";

import { cellDisplay } from "./DisplayCell";

export function OptionalEditableCell<TRow>(
  props: Readonly<EditableCellSlotProps<TRow>>
): ReactNode {
  // Computed here, not in the row: the accessor call belongs to this cell's
  // own memo scope, so re-rendering a row for selection or expansion leaves
  // its data cells alone.
  const display =
    props.display ?? cellDisplay(props.column, props.row, props.rowIndex);
  const filled = useFeatureSlotFilled(EDITABLE_CELL);
  return filled ? (
    <FeatureSlot
      slot={EDITABLE_CELL}
      props={{ ...props, display } as unknown as EditableCellSlotProps<never>}
    />
  ) : (
    display
  );
}

export function OptionalTreeCell<TRow>(
  props: Readonly<TreeCellProps<TRow>>
): ReactNode {
  const filled = useFeatureSlotFilled(TREE_CELL);
  return filled ? (
    <FeatureSlot
      slot={TREE_CELL}
      props={props as unknown as TreeCellProps<never>}
    />
  ) : (
    props.children
  );
}

/** Bind a fixed slot once; every pass-through uses the same render path. */
function optionalSlot<TProps>(slot: FeatureSlotKey<TProps>) {
  return function OptionalSlot(props: Readonly<TProps>): ReactNode {
    return <FeatureSlot slot={slot} props={props} />;
  };
}

export const OptionalTreeToggle = optionalSlot(TREE_TOGGLE) as unknown as <
  TRow,
>(
  props: Readonly<TreeToggleProps<TRow>>
) => ReactNode;

export const OptionalFillHandle =
  optionalSlot<FillHandleCellSlotProps>(FILL_HANDLE);
export const OptionalExpandToggle =
  optionalSlot<ExpandToggleSlotProps>(EXPAND_TOGGLE);
export const OptionalFilterHeader = optionalSlot(FILTER_HEADER) as unknown as <
  TRow,
>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) => ReactNode;
export const OptionalRowEditActions = optionalSlot(
  ROW_EDIT_ACTIONS
) as unknown as <TRow>(props: Readonly<RowEditActionsProps<TRow>>) => ReactNode;
export const OptionalRowReorderHandle = optionalSlot(
  ROW_REORDER_HANDLE
) as unknown as <TRow>(
  props: Readonly<RowReorderHandleProps<TRow>>
) => ReactNode;
export const OptionalRowReorderButtons = optionalSlot(
  ROW_REORDER_BUTTONS
) as unknown as <TRow>(
  props: Readonly<RowReorderButtonsProps<TRow>>
) => ReactNode;
export const OptionalColumnGroupToggle =
  optionalSlot<ColumnGroupToggleProps>(COLUMN_GROUP_TOGGLE);
export const OptionalColumnSelect =
  optionalSlot<Omit<ColumnSelectCheckboxChromeProps, "slots">>(COLUMN_SELECT);
export const OptionalColumnHeaderRename = optionalSlot<
  ColumnHeaderRenameSlotProps & { children?: ReactNode }
>(COLUMN_HEADER_RENAME);
export const OptionalGroupHeaderRow = optionalSlot(
  GROUP_HEADER_ROW
) as unknown as <TRow>(
  props: Readonly<GroupHeaderRowSlotProps<TRow>>
) => ReactNode;
export const OptionalGroupHeaderCard = optionalSlot(
  GROUP_HEADER_CARD
) as unknown as <TRow>(
  props: Readonly<GroupHeaderCardSlotProps<TRow>>
) => ReactNode;
