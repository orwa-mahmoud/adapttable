/**
 * The optional cell chrome a table body draws.
 *
 * Each wrapper asks the slot its feature fills, so a kit's desktop table and
 * mobile cards name the control without importing it, and a table that omits
 * the feature omits the component. The slot keys erase the row; each wrapper
 * hands its table's row-typed props across that boundary.
 */
import type { ReactNode } from "react";

import type { ColumnDef } from "../columnDef";
import type { ColumnGroupToggleProps } from "../columns/ColumnGroupToggle";
import type { RowEditActionsProps } from "../editing/RowEditGate";
import { FeatureSlot, useFeatureSlotFilled } from "../features/providers";
import {
  COLUMN_GROUP_TOGGLE,
  COLUMN_HEADER_RENAME,
  COLUMN_SELECT,
  type ColumnHeaderRenameSlotProps,
  EDITABLE_CELL,
  type EditableCellSlotProps,
  EXPAND_TOGGLE,
  type ExpandToggleSlotProps,
  FILL_HANDLE,
  type FillHandleCellSlotProps,
  FILTER_HEADER,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  type GroupHeaderCardSlotProps,
  type GroupHeaderRowSlotProps,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
  TREE_CELL,
  TREE_TOGGLE,
} from "../features/slotKeys";
import type { FilterHeaderControlProps } from "../filters/FilterHeaderRow";
import type { ColumnSelectCheckboxChromeProps } from "../focus/ColumnSelectCheckbox";
import type {
  RowReorderButtonsProps,
  RowReorderHandleProps,
} from "../rows/RowReorderHandle";
import type { TreeCellProps } from "../tree/TreeCell";
import type { TreeToggleProps } from "../tree/TreeToggle";

/**
 * The cell's own display content.
 *
 * Called from the cell wrapper rather than the row, so the accessor sits in
 * that cell's memo scope: re-rendering a row for selection or expansion
 * leaves its data cells alone.
 *
 * @public
 */
export function cellDisplay<TRow>(
  column: ColumnDef<TRow>,
  row: TRow,
  rowIndex: number
): ReactNode {
  return column.Cell ? (
    <column.Cell row={row} rowIndex={rowIndex} />
  ) : (
    column.accessor?.(row)
  );
}

/**
 * The `EditableCell` slot, or nothing when no feature fills it.
 *
 * @public
 */
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
      props={{ ...props, display } as unknown as EditableCellSlotProps<unknown>}
    />
  ) : (
    display
  );
}

/**
 * The `TreeCell` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalTreeCell<TRow>(
  props: Readonly<TreeCellProps<TRow>>
): ReactNode {
  const filled = useFeatureSlotFilled(TREE_CELL);
  return filled ? (
    <FeatureSlot slot={TREE_CELL} props={props} />
  ) : (
    props.children
  );
}

/**
 * The `TreeToggle` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalTreeToggle<TRow>(
  props: Readonly<TreeToggleProps<TRow>>
): ReactNode {
  return <FeatureSlot slot={TREE_TOGGLE} props={props} />;
}

/**
 * The `FillHandle` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalFillHandle(
  props: Readonly<FillHandleCellSlotProps>
): ReactNode {
  return <FeatureSlot slot={FILL_HANDLE} props={props} />;
}

/**
 * The `ExpandToggle` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalExpandToggle(
  props: Readonly<ExpandToggleSlotProps>
): ReactNode {
  return <FeatureSlot slot={EXPAND_TOGGLE} props={props} />;
}

/**
 * The `FilterHeader` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalFilterHeader<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
): ReactNode {
  return <FeatureSlot slot={FILTER_HEADER} props={props} />;
}

/**
 * The `RowEditActions` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalRowEditActions<TRow>(
  props: Readonly<RowEditActionsProps<TRow>>
): ReactNode {
  return <FeatureSlot slot={ROW_EDIT_ACTIONS} props={props} />;
}

/**
 * The `RowReorderHandle` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalRowReorderHandle<TRow>(
  props: Readonly<RowReorderHandleProps<TRow>>
): ReactNode {
  return <FeatureSlot slot={ROW_REORDER_HANDLE} props={props} />;
}

/**
 * The `RowReorderButtons` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalRowReorderButtons<TRow>(
  props: Readonly<RowReorderButtonsProps<TRow>>
): ReactNode {
  return <FeatureSlot slot={ROW_REORDER_BUTTONS} props={props} />;
}

/**
 * The `ColumnGroupToggle` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalColumnGroupToggle(
  props: Readonly<ColumnGroupToggleProps>
): ReactNode {
  return <FeatureSlot slot={COLUMN_GROUP_TOGGLE} props={props} />;
}

/**
 * The `ColumnHeaderRename` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalColumnHeaderRename(
  props: Readonly<ColumnHeaderRenameSlotProps>
): ReactNode {
  return <FeatureSlot slot={COLUMN_HEADER_RENAME} props={props} />;
}

/**
 * The `ColumnSelect` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalColumnSelect(
  props: Readonly<Omit<ColumnSelectCheckboxChromeProps, "slots">>
): ReactNode {
  return <FeatureSlot slot={COLUMN_SELECT} props={props} />;
}

/**
 * The `GroupHeaderRow` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalGroupHeaderRow<TRow>(
  props: Readonly<GroupHeaderRowSlotProps<TRow>>
): ReactNode {
  return (
    <FeatureSlot
      slot={GROUP_HEADER_ROW}
      props={props as unknown as GroupHeaderRowSlotProps<unknown>}
    />
  );
}

/**
 * The `GroupHeaderCard` slot, or nothing when no feature fills it.
 *
 * @public
 */
export function OptionalGroupHeaderCard<TRow>(
  props: Readonly<GroupHeaderCardSlotProps<TRow>>
): ReactNode {
  return (
    <FeatureSlot
      slot={GROUP_HEADER_CARD}
      props={props as unknown as GroupHeaderCardSlotProps<unknown>}
    />
  );
}
