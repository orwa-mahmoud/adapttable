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

export function OptionalTreeToggle<TRow>(
  props: Readonly<TreeToggleProps<TRow>>
): ReactNode {
  return (
    <FeatureSlot
      slot={TREE_TOGGLE}
      props={props as unknown as TreeToggleProps<never>}
    />
  );
}

export function OptionalFillHandle(
  props: Readonly<FillHandleCellSlotProps>
): ReactNode {
  return <FeatureSlot slot={FILL_HANDLE} props={props} />;
}

export function OptionalExpandToggle(
  props: Readonly<ExpandToggleSlotProps>
): ReactNode {
  return <FeatureSlot slot={EXPAND_TOGGLE} props={props} />;
}

export function OptionalFilterHeader<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
): ReactNode {
  return (
    <FeatureSlot
      slot={FILTER_HEADER}
      props={props as unknown as FilterHeaderControlProps<never>}
    />
  );
}

export function OptionalRowEditActions<TRow>(
  props: Readonly<RowEditActionsProps<TRow>>
): ReactNode {
  return (
    <FeatureSlot
      slot={ROW_EDIT_ACTIONS}
      props={props as unknown as RowEditActionsProps<never>}
    />
  );
}

export function OptionalRowReorderHandle<TRow>(
  props: Readonly<RowReorderHandleProps<TRow>>
): ReactNode {
  return (
    <FeatureSlot
      slot={ROW_REORDER_HANDLE}
      props={props as unknown as RowReorderHandleProps<never>}
    />
  );
}

export function OptionalRowReorderButtons<TRow>(
  props: Readonly<RowReorderButtonsProps<TRow>>
): ReactNode {
  return (
    <FeatureSlot
      slot={ROW_REORDER_BUTTONS}
      props={props as unknown as RowReorderButtonsProps<never>}
    />
  );
}

export function OptionalColumnGroupToggle(
  props: Readonly<ColumnGroupToggleProps>
): ReactNode {
  return <FeatureSlot slot={COLUMN_GROUP_TOGGLE} props={props} />;
}

export function OptionalColumnHeaderRename(
  props: Readonly<ColumnHeaderRenameSlotProps>
): ReactNode {
  return <FeatureSlot slot={COLUMN_HEADER_RENAME} props={props} />;
}

export function OptionalColumnSelect(
  props: Readonly<Omit<ColumnSelectCheckboxChromeProps, "slots">>
): ReactNode {
  return <FeatureSlot slot={COLUMN_SELECT} props={props} />;
}

export function OptionalGroupHeaderRow<TRow>(
  props: Readonly<GroupHeaderRowSlotProps<TRow>>
): ReactNode {
  return (
    <FeatureSlot
      slot={GROUP_HEADER_ROW}
      props={props as unknown as GroupHeaderRowSlotProps<never>}
    />
  );
}

export function OptionalGroupHeaderCard<TRow>(
  props: Readonly<GroupHeaderCardSlotProps<TRow>>
): ReactNode {
  return (
    <FeatureSlot
      slot={GROUP_HEADER_CARD}
      props={props as unknown as GroupHeaderCardSlotProps<never>}
    />
  );
}
