/**
 * Native controls whose whole look is the host's classes: each element
 * carries its part and the class of that part's `classNames` key, and adds
 * no inline style of its own. The binding's menus and pager draw with them.
 */
import {
  type KitButtonProps,
  type KitDividerProps,
  type KitIconButtonProps,
  type KitPopoverProps,
  type KitRenameFieldProps,
  type KitTextInputProps,
  type KitTextProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import { type CSSProperties, forwardRef, type ReactElement } from "react";
import { createPortal } from "react-dom";

import { useClassOfPart, usePartClass } from "./classNamesContext";
import { MENU_PANEL_STYLE, useAnchoredPanel } from "./menuPopover";
import { usePortalContainer } from "./portalContainer";

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

/** An element's part, as the attribute it carries. */
export interface PartAttribute {
  readonly "data-adapttable-part": string;
}

export function Divider({ style: _style, ...data }: Readonly<KitDividerProps>) {
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

/**
 * A popover that portals its panel under the trigger, in a wrapper named
 * `root`. Given a part, the panel is a fieldset with that part; without one,
 * a plain box that only places the binding's own panel. A pointer-down
 * outside closes it, and the binding owns Escape and names the panel.
 */
export function anchoredPopover(
  root: PartAttribute
): (props: Readonly<KitPopoverProps>) => ReactElement {
  const rootPart = root["data-adapttable-part"];
  return function Popover({
    trigger,
    children,
    open = false,
    onOpenChange,
    part,
    dir,
  }) {
    "use no memo";
    const classOf = usePartClass();
    const portalContainer = usePortalContainer();
    const { rootRef, triggerRef, panelRef } = useAnchoredPanel(open, () =>
      onOpenChange?.(false)
    );
    const Panel = part === undefined ? "div" : "fieldset";
    return (
      <div
        ref={rootRef}
        {...root}
        className={classOf(rootPart)}
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
            <Panel
              ref={panelRef}
              dir={dir}
              data-adapttable-part={part}
              className={part && classOf(part)}
              style={MENU_PANEL_STYLE}
            >
              {children}
            </Panel>,
            portalContainer ?? document.body
          )}
      </div>
    );
  };
}
