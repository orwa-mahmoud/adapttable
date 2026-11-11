/**
 * Material UI's primitives — every control the table draws, in MUI's own
 * components. The binding composes them into each feature; nothing here knows
 * which feature it serves.
 */
import {
  type KitButtonProps,
  type KitButtonVariant,
  type KitCheckboxProps,
  type KitDataAttributes,
  type KitIconButtonProps,
  type KitMenuProps,
  type KitPopoverProps,
  type KitPrimitives,
  type KitSelectProps,
  type KitTextInputProps,
  type KitTextProps,
  type KitTone,
  restoreFocusSoon,
} from "@adapttable/react/adapter";
import {
  Button as MuiButton,
  Checkbox as MuiCheckbox,
  FormControlLabel,
  IconButton as MuiIconButton,
  Menu as MuiMenu,
  MenuItem,
  type PaperProps,
  Popover as MuiPopover,
  TextField,
  Typography,
} from "@mui/material";
import { useId, useRef, useState } from "react";

const MUI_VARIANT: Readonly<
  Record<KitButtonVariant, "text" | "outlined" | "contained">
> = {
  text: "text",
  outlined: "outlined",
  filled: "contained",
};

function buttonColor(tone: KitTone | undefined): "error" | undefined {
  return tone === "danger" ? "error" : undefined;
}

function iconColor(tone: KitTone | undefined): "default" | "primary" | "error" {
  if (tone === "danger") return "error";
  return tone === "primary" ? "primary" : "default";
}

/** A captioned button. @public */
export function Button({
  elementRef,
  variant = "text",
  tone,
  ...rest
}: Readonly<KitButtonProps>) {
  return (
    <MuiButton
      ref={elementRef}
      type="button"
      size="small"
      variant={MUI_VARIANT[variant]}
      color={buttonColor(tone)}
      {...rest}
    />
  );
}

/** A glyph button. @public */
export function IconButton({
  elementRef,
  variant: _variant,
  fullWidth: _fullWidth,
  tone,
  ...rest
}: Readonly<KitIconButtonProps>) {
  return (
    <MuiIconButton
      ref={elementRef}
      type="button"
      size="small"
      color={iconColor(tone)}
      {...rest}
    />
  );
}

/** A text field; `data-*` land on the input, `rootPart` on the field. @public */
export function TextInput({
  value,
  onValueChange,
  "aria-label": label,
  type = "text",
  placeholder,
  className,
  rootPart,
  style,
  fullWidth,
  disabled,
  elementRef,
  onKeyDown,
  ...data
}: Readonly<KitTextInputProps>) {
  return (
    <TextField
      inputRef={elementRef}
      size="small"
      hiddenLabel
      type={type}
      value={value}
      placeholder={placeholder}
      className={className}
      fullWidth={fullWidth}
      disabled={disabled}
      style={style}
      data-adapttable-part={rootPart}
      onChange={(event) => onValueChange(event.target.value)}
      onKeyDown={onKeyDown}
      slotProps={{ htmlInput: { "aria-label": label, ...data } }}
    />
  );
}

/** A single choice from a list. @public */
export function Select({
  value,
  options,
  onValueChange,
  "aria-label": label,
  className,
  rootPart,
  fullWidth,
  disabled,
  ...data
}: Readonly<KitSelectProps>) {
  return (
    <TextField
      select
      size="small"
      hiddenLabel
      value={value}
      className={className}
      fullWidth={fullWidth}
      disabled={disabled}
      data-adapttable-part={rootPart}
      onChange={(event) => onValueChange(event.target.value)}
      slotProps={{
        select: { native: false },
        htmlInput: { "aria-label": label, ...data },
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** A checkbox, labelled when it has a label. @public */
export function Checkbox({
  checked,
  onCheckedChange,
  indeterminate,
  label,
  "aria-label": ariaLabel,
  disabled,
  className,
  ...data
}: Readonly<KitCheckboxProps>) {
  const box = (
    <MuiCheckbox
      size="small"
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      className={label == null ? className : undefined}
      onChange={(_, next) => onCheckedChange(next)}
      slotProps={{ input: { "aria-label": ariaLabel, ...data } }}
    />
  );
  if (label == null) return box;
  return (
    <FormControlLabel
      label={label}
      className={className}
      sx={{ display: "flex", mx: 1 }}
      control={box}
    />
  );
}

const POPOVER_PAPER = { px: 1, py: 0.5 } as const;
const MENU_PAPER = { minWidth: "12rem", p: 1 } as const;

/** Paper props carrying the structure's part name. */
function paperWith(
  part: string | undefined,
  props: PaperProps
): PaperProps & KitDataAttributes {
  const paper: PaperProps & KitDataAttributes = {
    ...props,
    "data-adapttable-part": part,
  };
  return paper;
}

/** A floating panel anchored to its trigger. @public */
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  role = "dialog",
  part,
  className,
  style,
}: Readonly<KitPopoverProps>) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [own, setOwn] = useState(false);
  const id = useId();
  const shown = open ?? own;
  const set = (next: boolean) => {
    setOwn(next);
    onOpenChange?.(next);
  };
  return (
    <>
      {trigger({
        elementRef: anchorRef,
        onClick: () => set(!shown),
        "aria-expanded": shown,
        "aria-haspopup": role,
        "aria-controls": shown ? id : undefined,
      })}
      <MuiPopover
        id={id}
        open={shown}
        anchorEl={() => anchorRef.current}
        onClose={() => set(false)}
        slotProps={{
          paper: paperWith(part, { className, style, sx: POPOVER_PAPER }),
        }}
      >
        {children}
      </MuiPopover>
    </>
  );
}

/** A list of actions anchored to its trigger. @public */
export function Menu({
  trigger,
  items,
  "aria-label": label,
  part,
  itemPart,
}: Readonly<KitMenuProps>) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // A click that closes the menu lands on the trigger too; hold the trigger
  // shut until focus is back on it, so the menu does not open again.
  const suppressOpenRef = useRef(false);
  const id = useId();
  const open = anchor !== null;
  const close = () => {
    suppressOpenRef.current = true;
    setAnchor(null);
    window.setTimeout(() => {
      restoreFocusSoon(triggerRef.current);
      window.setTimeout(() => {
        suppressOpenRef.current = false;
      }, 500);
    }, 0);
  };
  return (
    <>
      {trigger({
        elementRef: triggerRef,
        onClick: () => {
          if (!suppressOpenRef.current) setAnchor(triggerRef.current);
        },
        "aria-expanded": open,
        "aria-haspopup": "menu",
        "aria-controls": open ? id : undefined,
      })}
      <MuiMenu
        id={id}
        anchorEl={anchor}
        open={open}
        onClose={close}
        slotProps={{
          list: { "aria-label": label },
          paper: paperWith(part, { sx: MENU_PAPER }),
        }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.id}
            disabled={item.disabled}
            title={item.disabledReason}
            data-adapttable-part={itemPart}
            onClick={() => {
              item.onSelect();
              close();
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </MuiMenu>
    </>
  );
}

const TEXT_VARIANT = {
  body: "body2",
  secondary: "body2",
  title: "subtitle2",
} as const;

/** A run of text in one of MUI's type roles. @public */
export function Text({
  variant = "body",
  as,
  color: _color,
  ...rest
}: Readonly<KitTextProps>) {
  return (
    <Typography
      variant={TEXT_VARIANT[variant]}
      color={variant === "secondary" ? "text.secondary" : undefined}
      component={as ?? (variant === "title" ? "p" : "span")}
      {...rest}
    />
  );
}

/** Every MUI primitive; the type check is that none is missing. */
export const primitives = {
  Button,
  IconButton,
  TextInput,
  Select,
  Checkbox,
  Popover,
  Menu,
  Text,
} satisfies KitPrimitives;
