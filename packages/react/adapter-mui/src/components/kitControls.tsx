/**
 * Each feature's controls, drawn with MUI's primitives. The binding owns the
 * structure, glyphs and wiring; this file only picks the primitives.
 */
import {
  createAgentApproval,
  createBatchEditBar,
  createColumnGroupToggle,
  createEditableCellSlots,
  createFilterHeaderControl,
  createFilterHeaderRow,
  createFindBar,
  createGroupMoreButton,
  createRowEditActions,
  createRowReorderButtons,
  createRowReorderHandle,
  createTreeCell,
  createTreeToggle,
  type EditableCellSlots,
  type KitPopoverProps,
} from "@adapttable/react/adapter";

import { iconForRowEditPart } from "../icons";
import {
  Button,
  Checkbox,
  IconButton,
  Menu,
  Popover,
  Select,
  Text,
  TextInput,
} from "./primitives";

export type {
  AgentApprovalProps,
  BatchEditBarProps,
  ColumnGroupToggleProps,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
  FindBarProps,
  GroupMoreButtonProps,
  RowEditActionsProps,
  RowReorderButtonsProps,
  RowReorderHandleProps,
  TreeCellProps,
  TreeToggleProps,
} from "@adapttable/react/adapter";
/** The header filter's list of choices is at least a comfortable 160 px. */
function HeaderPopover(props: Readonly<KitPopoverProps>) {
  "use no memo";
  return <Popover {...props} style={{ ...props.style, minWidth: 160 }} />;
}

const headerKit = {
  TextInput,
  Select,
  Button,
  Checkbox,
  Popover: HeaderPopover,
};

/**
 * The filter row under the column headers, drawn with this kit's controls.
 *
 * @public
 */
export const FilterHeaderRow = /* @__PURE__ */ createFilterHeaderRow(headerKit);

/**
 * One column's header filter, drawn with this kit's controls.
 *
 * @public
 */
export const FilterHeaderControl =
  /* @__PURE__ */ createFilterHeaderControl(headerKit);

/**
 * The find bar, drawn with this kit's input and buttons.
 *
 * @public
 */
export const FindBar = /* @__PURE__ */ createFindBar({ TextInput, IconButton });

/**
 * Save and cancel for a row being edited.
 *
 * @public
 */
export const RowEditActions = /* @__PURE__ */ createRowEditActions(
  { Button, IconButton },
  iconForRowEditPart
);

/**
 * The bar that saves or discards a batch of edits.
 *
 * @public
 */
export const BatchEditBar = /* @__PURE__ */ createBatchEditBar({ Button });

/**
 * Approve or reject a pending agent write.
 *
 * @public
 */
export const AgentApproval = /* @__PURE__ */ createAgentApproval({ Button });

/**
 * The expand/collapse control on a tree row.
 *
 * @public
 */
export const TreeToggle = /* @__PURE__ */ createTreeToggle({ IconButton });

/**
 * A tree row's first cell: indentation, toggle and content.
 *
 * @public
 */
export const TreeCell = /* @__PURE__ */ createTreeCell({ IconButton });

/**
 * The control that collapses a grouped column header.
 *
 * @public
 */
export const ColumnGroupToggle = /* @__PURE__ */ createColumnGroupToggle({
  IconButton,
});

/**
 * The control that reveals the rest of a truncated group.
 *
 * @public
 */
export const GroupMoreButton = /* @__PURE__ */ createGroupMoreButton({
  Button,
});

const rowMove = { IconButton, Button, Menu, Popover, Text };

/**
 * The drag handle for reordering a row.
 *
 * @public
 */
export const RowReorderHandle = /* @__PURE__ */ createRowReorderHandle(rowMove);

/**
 * Keyboard-reachable move-up and move-down for a row.
 *
 * @public
 */
export const RowReorderButtons =
  /* @__PURE__ */ createRowReorderButtons(rowMove);

/** This kit's controls for the editable-cell gate. */
export const editableCellSlots: EditableCellSlots =
  /* @__PURE__ */ createEditableCellSlots({ Button });
