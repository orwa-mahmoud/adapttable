/**
 * Lean wrappers around optional cell chrome.
 *
 * DesktopTable and MobileCards import this file instead of the kit
 * implementations, so omitting a feature omits those components.
 */
import {
  COLUMN_GROUP_TOGGLE,
  type ColumnGroupToggleProps,
  COLUMN_SELECT,
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
  type GroupHeaderCardSlotProps,
  GROUP_HEADER_ROW,
  type GroupHeaderRowSlotProps,
  ROW_EDIT_ACTIONS,
  type RowEditActionsProps,
  ROW_REORDER_BUTTONS,
  type RowReorderButtonsProps,
  ROW_REORDER_HANDLE,
  type RowReorderHandleProps,
  TREE_CELL,
  type TreeCellProps,
  TREE_TOGGLE,
  type TreeToggleProps,
  useFeatureSlotFilled,
} from "@adapttable/core/adapter";
import type { ReactNode } from "react";

export function OptionalEditableCell<TRow>(
  props: EditableCellSlotProps<TRow>
): ReactNode {
  const display =
    props.display ??
    (props.column.Cell ? (
      <props.column.Cell row={props.row} rowIndex={props.rowIndex} />
    ) : (
      props.column.accessor?.(props.row)
    ));
  const filled = useFeatureSlotFilled(EDITABLE_CELL);
  if (filled) {
    return (
      <FeatureSlot
        slot={EDITABLE_CELL}
        props={{ ...props, display } as unknown as EditableCellSlotProps<never>}
      />
    );
  }
  return display;
}

export function OptionalTreeCell<TRow>(props: TreeCellProps<TRow>): ReactNode {
  const filled = useFeatureSlotFilled(TREE_CELL);
  if (!filled) return props.children;
  return (
    <FeatureSlot
      slot={TREE_CELL}
      props={props as unknown as TreeCellProps<never>}
    />
  );
}

export function OptionalTreeToggle<TRow>(
  props: TreeToggleProps<TRow>
): ReactNode {
  return (
    <FeatureSlot
      slot={TREE_TOGGLE}
      props={props as unknown as TreeToggleProps<never>}
    />
  );
}

export function OptionalFillHandle(props: FillHandleCellSlotProps): ReactNode {
  return <FeatureSlot slot={FILL_HANDLE} props={props} />;
}

export function OptionalExpandToggle(props: ExpandToggleSlotProps): ReactNode {
  return <FeatureSlot slot={EXPAND_TOGGLE} props={props} />;
}

export function OptionalFilterHeader<TRow>(
  props: FilterHeaderControlProps<TRow>
): ReactNode {
  return (
    <FeatureSlot
      slot={FILTER_HEADER}
      props={props as unknown as FilterHeaderControlProps<never>}
    />
  );
}

export function OptionalRowEditActions<TRow>(
  props: RowEditActionsProps<TRow>
): ReactNode {
  return (
    <FeatureSlot
      slot={ROW_EDIT_ACTIONS}
      props={props as unknown as RowEditActionsProps<never>}
    />
  );
}

export function OptionalRowReorderHandle<TRow>(
  props: RowReorderHandleProps<TRow>
): ReactNode {
  return (
    <FeatureSlot
      slot={ROW_REORDER_HANDLE}
      props={props as unknown as RowReorderHandleProps<never>}
    />
  );
}

export function OptionalRowReorderButtons<TRow>(
  props: RowReorderButtonsProps<TRow>
): ReactNode {
  return (
    <FeatureSlot
      slot={ROW_REORDER_BUTTONS}
      props={props as unknown as RowReorderButtonsProps<never>}
    />
  );
}

export function OptionalColumnGroupToggle(
  props: ColumnGroupToggleProps
): ReactNode {
  return <FeatureSlot slot={COLUMN_GROUP_TOGGLE} props={props} />;
}

export function OptionalColumnSelect(
  props: Omit<ColumnSelectCheckboxChromeProps, "slots">
): ReactNode {
  return <FeatureSlot slot={COLUMN_SELECT} props={props} />;
}

export function OptionalGroupHeaderRow<TRow>(
  props: GroupHeaderRowSlotProps<TRow>
): ReactNode {
  return (
    <FeatureSlot
      slot={GROUP_HEADER_ROW}
      props={props as unknown as GroupHeaderRowSlotProps<never>}
    />
  );
}

export function OptionalGroupHeaderCard<TRow>(
  props: GroupHeaderCardSlotProps<TRow>
): ReactNode {
  return (
    <FeatureSlot
      slot={GROUP_HEADER_CARD}
      props={props as unknown as GroupHeaderCardSlotProps<never>}
    />
  );
}
