/**
 * The Columns menu: the binding's composition, drawn with native controls.
 * Every element carries its part and the class of its `classNames` key; the
 * kit adds no look of its own.
 */
import {
  type ColumnMenuSlotProps,
  createColumnMenu,
  type KitButtonProps,
  type KitColumnMenuLook,
  type KitDividerProps,
  type KitIconButtonProps,
  type KitPopoverProps,
  type KitRenameFieldProps,
  type KitSelectProps,
  type KitTextInputProps,
  type KitTextProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import { type CSSProperties, forwardRef, type ReactElement } from "react";
import { createPortal } from "react-dom";

import { useClassOfPart, usePartClass } from "./classNamesContext";
import { MENU_PANEL_STYLE, useAnchoredPanel } from "./menuPopover";
import { usePortalContainer } from "./portalContainer";

/** The shared Columns-menu contract, declared once in core. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow>;

const NO_WRAP: CSSProperties = { flexShrink: 0, whiteSpace: "nowrap" };

/** A native button with its part's class; the trigger keeps one line. */
export const Button = forwardRef<HTMLButtonElement, KitButtonProps>(
  function Button(
    {
      elementRef,
      variant: _variant,
      tone: _tone,
      fullWidth: _fullWidth,
      justify: _justify,
      busy: _busy,
      style: _style,
      type = "button",
      ...rest
    },
    ref
  ) {
    "use no memo";
    const part = rest["data-adapttable-part"];
    return (
      <button
        ref={mergeRefs(ref, elementRef)}
        type={type}
        className={useClassOfPart(part)}
        style={part === "column-menu-button" ? NO_WRAP : undefined}
        {...rest}
      />
    );
  }
);

/** A native glyph button; the grip is a handle, not a button. */
export function IconButton({
  elementRef,
  variant: _variant,
  tone: _tone,
  fullWidth: _fullWidth,
  justify: _justify,
  busy: _busy,
  style: _style,
  disabled,
  type = "button",
  ...rest
}: Readonly<KitIconButtonProps>) {
  "use no memo";
  const part = rest["data-adapttable-part"];
  const className = useClassOfPart(part);
  if (part === "column-menu-grip") {
    return (
      <span
        className={className}
        aria-disabled={disabled === true || undefined}
        {...rest}
      />
    );
  }
  return (
    <button
      ref={elementRef}
      type={type}
      className={className}
      disabled={disabled}
      {...rest}
    />
  );
}

/** The menu's title sits in its header; other text is a plain span. */
export function Text({
  variant: _variant,
  tone: _tone,
  as: As = "span",
  style: _style,
  ...rest
}: Readonly<KitTextProps>) {
  "use no memo";
  const part = rest["data-adapttable-part"];
  const className = useClassOfPart(part);
  const header = useClassOfPart("column-menu-header");
  if (part === "column-menu-title") {
    return (
      <div data-adapttable-part="column-menu-header" className={header}>
        <span className={className} {...rest} />
      </div>
    );
  }
  return <As className={className} {...rest} />;
}

export function TextInput({
  value,
  onValueChange,
  elementRef,
  rootPart: _rootPart,
  fullWidth: _fullWidth,
  invalid: _invalid,
  style: _style,
  ...rest
}: Readonly<KitTextInputProps>) {
  "use no memo";
  return (
    <input
      ref={elementRef}
      value={value}
      className={useClassOfPart(rest["data-adapttable-part"])}
      onChange={(event) => onValueChange(event.target.value)}
      {...rest}
    />
  );
}

/** The caption and select parts of each labelled choice, by its own part. */
/** An element's part, as the attribute it carries. */
interface PartAttribute {
  readonly "data-adapttable-part": string;
}

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

function Divider({ style: _style, ...data }: Readonly<KitDividerProps>) {
  "use no memo";
  return (
    <hr className={useClassOfPart(data["data-adapttable-part"])} {...data} />
  );
}

/** The rename field: its label, its input and its error, each a part. */
export function RenameField({
  id,
  elementRef,
  label,
  value,
  error,
  errorId,
  parts,
  onValueChange,
  onBlur,
  onKeyDown,
}: Readonly<KitRenameFieldProps>): ReactElement {
  "use no memo";
  const classOf = usePartClass();
  return (
    <>
      <label
        htmlFor={id}
        data-adapttable-part={parts.label}
        className={classOf(parts.label)}
      >
        {label}
      </label>
      <input
        ref={elementRef}
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        data-adapttable-part={parts.input}
        className={classOf(parts.input)}
        onChange={(event) => onValueChange(event.currentTarget.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      {error ? (
        <span
          id={errorId}
          role="alert"
          data-adapttable-part={parts.error}
          className={classOf(parts.error)}
        >
          {error}
        </span>
      ) : null}
    </>
  );
}

const RELATIVE: CSSProperties = { position: "relative" };

/** The wrapper around a menu's trigger, by the part of its panel. */
const MENU_PARTS = {
  "column-menu-panel": { "data-adapttable-part": "column-menu" },
  "views-panel": { "data-adapttable-part": "views-menu" },
};

const menuParts: Readonly<Partial<Record<string, PartAttribute>>> = MENU_PARTS;

/**
 * A panel portalled under its trigger: the fieldset takes the panel's part
 * and the wrapper around the trigger the menu's (the panel's without
 * `-panel`, from a literal table so the parts check reads it). A pointer-down outside closes it, and the binding owns Escape;
 * the binding's own group inside carries the panel's name.
 */
export function Popover({
  trigger,
  children,
  open = false,
  onOpenChange,
  part = "menu-panel",
  dir,
}: Readonly<KitPopoverProps>) {
  "use no memo";
  const classOf = usePartClass();
  const root = menuParts[part];
  const portalContainer = usePortalContainer();
  const { rootRef, triggerRef, panelRef } = useAnchoredPanel(open, () =>
    onOpenChange?.(false)
  );
  return (
    <div
      ref={rootRef}
      {...root}
      className={root && classOf(root["data-adapttable-part"])}
      style={RELATIVE}
    >
      {trigger({
        elementRef: triggerRef,
        onClick: () => onOpenChange?.(!open),
        "aria-expanded": open,
        "aria-haspopup": "dialog",
      })}
      {open &&
        createPortal(
          <fieldset
            ref={panelRef}
            dir={dir}
            data-adapttable-part={part}
            className={classOf(part)}
            style={MENU_PANEL_STYLE}
          >
            {children}
          </fieldset>,
          portalContainer ?? document.body
        )}
    </div>
  );
}

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
