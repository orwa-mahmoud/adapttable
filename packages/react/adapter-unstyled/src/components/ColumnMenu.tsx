/**
 * The Columns menu: the binding's composition, drawn with native controls.
 * Every element carries its part and the class of its `classNames` key; the
 * kit adds no look of its own.
 */
import {
  type ColumnMenuSlotProps,
  createColumnMenu,
  type KitColumnMenuLook,
  type KitSelectProps,
} from "@adapttable/react/adapter";
import type { CSSProperties } from "react";

import { usePartClass } from "./classNamesContext";
import {
  anchoredPopover,
  Button,
  Divider,
  IconButton,
  type PartAttribute,
  RenameField,
  Text,
  TextInput,
} from "./partPrimitives";

/** The shared Columns-menu contract, declared once in core. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow>;

/** The caption and select parts of each labelled choice, by its own part. */
const CHOICE_PARTS = {
  "column-menu-choice": {
    label: { "data-adapttable-part": "column-menu-choice-label" },
    select: { "data-adapttable-part": "column-menu-choice-select" },
  },
};

const choiceParts: Readonly<
  Partial<
    Record<
      string,
      { readonly label: PartAttribute; readonly select: PartAttribute }
    >
  >
> = CHOICE_PARTS;

/** A labelled native select: the label holds its caption and the select. */
function Select({
  value,
  options,
  onValueChange,
  rootPart = "select",
  label,
  fullWidth: _fullWidth,
  style: _style,
  ...rest
}: Readonly<KitSelectProps>) {
  "use no memo";
  const classOf = usePartClass();
  const parts = choiceParts[rootPart];
  return (
    <label data-adapttable-part={rootPart} className={classOf(rootPart)}>
      <span
        {...parts?.label}
        className={parts && classOf(parts.label["data-adapttable-part"])}
      >
        {label}
      </span>
      <select
        value={value}
        {...parts?.select}
        className={parts && classOf(parts.select["data-adapttable-part"])}
        onChange={(event) => onValueChange(event.target.value)}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const Popover = /* @__PURE__ */ anchoredPopover({
  "data-adapttable-part": "column-menu",
});

const CONTENTS: CSSProperties = { display: "contents" };

const LOOK: KitColumnMenuLook = {
  // The fieldset is the panel; the binding's own box steps aside.
  panel: { ...CONTENTS, maxHeight: "none", overflowY: "visible" },
  heading: {},
  search: {},
  bulk: {},
  row: {},
  fixedRow: {},
  rowSpacer: { display: "none" },
  grip: {},
  divider: {},
  submenu: {},
  choice: {},
  renameForm: {},
  renameActions: CONTENTS,
  accent: "currentColor",
  flatItem: true,
  footerDivider: false,
};

const useLook = (): KitColumnMenuLook => LOOK;

/**
 * Column-management popover: a disclosure button and a panel where each
 * column has a drag grip (reorder), an eye toggle (show/hide), a pin toggle
 * and its actions. Ships no styles: target the `data-adapttable-part` hooks
 * or the `columnMenu*` className slots.
 */
export const ColumnMenu = /* @__PURE__ */ createColumnMenu(
  {
    Button,
    IconButton,
    TextInput,
    Select,
    Popover,
    Text,
    Divider,
    RenameField,
    usePartClass,
  },
  useLook
);
