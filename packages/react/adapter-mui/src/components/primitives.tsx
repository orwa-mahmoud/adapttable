/**
 * Material UI's primitives — every control the table draws, in MUI's own
 * components. The binding composes them into each feature; nothing here knows
 * which feature it serves.
 */
import {
  type KitButtonProps,
  type KitCheckboxProps,
  type KitDataAttributes,
  type KitDividerProps,
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
  CircularProgress,
  Divider as MuiDivider,
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

function iconColor(tone: KitTone | undefined): "default" | "primary" | "error" {
  if (tone === "danger") return "error";
  return tone === "primary" ? "primary" : "default";
}

const JUSTIFY_START = { justifyContent: "flex-start" } as const;

/** A captioned button. @public */
export function Button({
  elementRef,
  variant = "text",
  tone,
  justify,
  busy,
  disabled,
  ...rest
}: Readonly<KitButtonProps>) {
  // A pass-through: the compiler's cache would outweigh the element it saves.
  "use no memo";
  return (
    <MuiButton
      ref={elementRef}
      type="button"
      size="small"
      variant={variant === "filled" ? "contained" : variant}
      color={tone === "danger" ? "error" : undefined}
      sx={justify ? JUSTIFY_START : undefined}
      disabled={disabled === true || busy === true}
      startIcon={
        busy ? <CircularProgress size={14} color="inherit" /> : undefined
      }
      {...rest}
    />
  );
}

/** A glyph button. @public */
export function IconButton({
  elementRef,
  variant: _variant,
  fullWidth: _fullWidth,
  justify: _justify,
  busy,
  disabled,
  tone,
  ...rest
}: Readonly<KitIconButtonProps>) {
  // A pass-through: the compiler's cache would outweigh the element it saves.
  "use no memo";
  return (
    <MuiIconButton
      ref={elementRef}
      type="button"
      size="small"
      color={iconColor(tone)}
      disabled={disabled === true || busy === true}
      aria-busy={busy === true ? true : undefined}
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
  id,
  invalid,
  onBlur,
  ...data
}: Readonly<KitTextInputProps>) {
  // A pass-through: the compiler's cache would outweigh the element it saves.
  "use no memo";
  return (
    <TextField
      id={id}
      inputRef={elementRef}
      size="small"
      hiddenLabel
      error={invalid}
      type={type}
      value={value}
      placeholder={placeholder}
      className={className}
      fullWidth={fullWidth}
      disabled={disabled}
      style={style}
      data-adapttable-part={rootPart}
      onChange={(event) => onValueChange(event.target.value)}
      onBlur={onBlur}
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
  label: caption,
  style,
  ...data
}: Readonly<KitSelectProps>) {
  // A pass-through: the compiler's cache would outweigh the element it saves.
  "use no memo";
  return (
    <TextField
      select
      size="small"
      hiddenLabel={caption === undefined}
      label={caption}
      style={style}
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

/** A labelled checkbox on its own line, inset from the panel edge. */
const LABELLED = { display: "flex", mx: 1 } as const;

/** A checkbox, labelled when it has a label. @public */
export function Checkbox({
  checked,
  onCheckedChange,
  indeterminate,
  label,
  "aria-label": ariaLabel,
  disabled,
  className,
  rootPart,
  style,
  ...data
}: Readonly<KitCheckboxProps>) {
  // A pass-through: the compiler's cache would outweigh the element it saves.
  "use no memo";
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
      data-adapttable-part={rootPart}
      style={style}
      sx={style ? undefined : LABELLED}
      control={box}
    />
  );
}

/** Under the trigger, start edges aligned, free to reach the window edge. */
const BOTTOM_START = {
  anchorOrigin: { vertical: "bottom", horizontal: "left" },
  transformOrigin: { vertical: "top", horizontal: "left" },
  marginThreshold: 0,
} as const;
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
  placement,
  flush,
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
        {...(placement ? BOTTOM_START : undefined)}
        slotProps={{
          paper: paperWith(part, {
            className,
            style,
            sx: flush ? undefined : POPOVER_PAPER,
          }),
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
  title: "subtitle2",
  caption: "caption",
} as const;

const TEXT_TONE = {
  secondary: { color: "text.secondary" },
  disabled: { color: "text.disabled" },
  danger: { color: "error.main" },
} as const;

/** A run of text in one of MUI's type roles. @public */
export function Text({
  variant = "body",
  tone,
  as,
  color: _color,
  ...rest
}: Readonly<KitTextProps>) {
  // A pass-through: the compiler's cache would outweigh the element it saves.
  "use no memo";
  return (
    <Typography
      variant={TEXT_VARIANT[variant]}
      sx={tone ? TEXT_TONE[tone] : undefined}
      component={as ?? (variant === "title" ? "p" : "span")}
      {...rest}
    />
  );
}

/** A rule between groups. @public */
export function Divider({ style, ...data }: Readonly<KitDividerProps>) {
  // A pass-through: the compiler's cache would outweigh the element it saves.
  "use no memo";
  return <MuiDivider style={style} {...data} />;
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
  Divider,
} satisfies KitPrimitives;
