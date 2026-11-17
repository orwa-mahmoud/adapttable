/**
 * Native primitives for binding unit tests. Not a product kit — not exported.
 * Each draws the plainest element that carries what the structure hands it,
 * and writes its `variant` as `data-variant` so a test can read the choice.
 */
import { type ReactNode, useEffect, useId, useState } from "react";

import type {
  KitButtonProps,
  KitCheckboxProps,
  KitDividerProps,
  KitIconButtonProps,
  KitMenuProps,
  KitPopoverProps,
  KitPrimitives,
  KitSelectProps,
  KitTextInputProps,
  KitTextProps,
} from "../kit/primitives";

function Button({
  elementRef,
  variant,
  tone,
  fullWidth,
  justify,
  ...rest
}: Readonly<KitButtonProps>) {
  return (
    <button
      ref={elementRef}
      type="button"
      data-variant={variant}
      data-tone={tone}
      data-full-width={fullWidth ? "" : undefined}
      data-justify={justify}
      {...rest}
    />
  );
}

function IconButton(props: Readonly<KitIconButtonProps>) {
  return <Button {...props} />;
}

function TextInput({
  value,
  onValueChange,
  rootPart,
  elementRef,
  fullWidth,
  invalid,
  type = "text",
  ...rest
}: Readonly<KitTextInputProps>) {
  return (
    <input
      ref={elementRef}
      type={type}
      value={value}
      data-adapttable-part={rootPart}
      data-full-width={fullWidth ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      onChange={(event) => onValueChange(event.target.value)}
      {...rest}
    />
  );
}

function Select({
  value,
  options,
  onValueChange,
  rootPart,
  fullWidth,
  label,
  ...rest
}: Readonly<KitSelectProps>) {
  return (
    <select
      value={value}
      data-label={label}
      data-adapttable-part={rootPart}
      data-full-width={fullWidth ? "" : undefined}
      onChange={(event) => onValueChange(event.target.value)}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Checkbox({
  checked,
  onCheckedChange,
  indeterminate,
  label,
  rootPart,
  style,
  ...rest
}: Readonly<KitCheckboxProps>) {
  const box = (
    <input
      type="checkbox"
      checked={checked}
      data-indeterminate={indeterminate ? "" : undefined}
      onChange={(event) => onCheckedChange(event.target.checked)}
      {...rest}
    />
  );
  if (label == null) return box;
  return (
    <label data-adapttable-part={rootPart} style={style}>
      {box}
      {label}
    </label>
  );
}

function usePopoverState(
  open: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined
): readonly [boolean, (open: boolean) => void] {
  const [own, setOwn] = useState(false);
  const shown = open ?? own;
  const set = (next: boolean) => {
    setOwn(next);
    onOpenChange?.(next);
  };
  useEffect(() => {
    if (!shown) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange?.(false);
      if (event.key === "Escape") setOwn(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shown, onOpenChange]);
  return [shown, set];
}

function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  role = "dialog",
  part,
  className,
  style,
  dir,
  "aria-label": label,
}: Readonly<KitPopoverProps>) {
  const id = useId();
  const [shown, set] = usePopoverState(open, onOpenChange);
  return (
    <>
      {trigger({
        elementRef: null,
        onClick: () => set(!shown),
        "aria-expanded": shown,
        "aria-haspopup": role,
        "aria-controls": shown ? id : undefined,
      })}
      {shown ? (
        <div
          id={id}
          role={role}
          aria-label={label}
          dir={dir}
          data-adapttable-part={part}
          className={className}
          style={style}
        >
          {children}
        </div>
      ) : null}
    </>
  );
}

function Menu({
  trigger,
  items,
  part,
  itemPart,
  "aria-label": label,
}: Readonly<KitMenuProps>) {
  const id = useId();
  const [shown, set] = usePopoverState(undefined, undefined);
  return (
    <>
      {trigger({
        elementRef: null,
        onClick: () => set(!shown),
        "aria-expanded": shown,
        "aria-haspopup": "menu",
        "aria-controls": shown ? id : undefined,
      })}
      {shown ? (
        <div id={id} role="menu" aria-label={label} data-adapttable-part={part}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.disabledReason}
              data-adapttable-part={itemPart}
              onClick={() => {
                item.onSelect();
                set(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

function Text({
  variant,
  tone,
  as,
  ...rest
}: Readonly<KitTextProps>): ReactNode {
  const Tag = as ?? (variant === "title" ? "strong" : "span");
  return <Tag data-variant={variant} data-tone={tone} {...rest} />;
}

function Divider({ style }: Readonly<KitDividerProps>): ReactNode {
  return <hr style={style} />;
}

/** The whole native set, for any factory a test builds. */
export const testPrimitives: KitPrimitives = {
  Button,
  IconButton,
  TextInput,
  Select,
  Checkbox,
  Popover,
  Menu,
  Text,
  Divider,
};
