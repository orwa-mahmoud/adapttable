/**
 * antd's controls for the binding's primitives: every control the binding
 * draws for this kit is one of these, at antd's `small` size.
 */
import {
  type KitButtonProps,
  type KitCheckboxProps,
  type KitDividerProps,
  type KitIconButtonProps,
  type KitPopoverProps,
  type KitSelectProps,
  type KitTextInputProps,
  type KitTextProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import {
  Button as AntButton,
  Checkbox as AntCheckbox,
  Divider as AntDivider,
  Dropdown,
  Input,
  type InputRef,
  Select as AntSelect,
  Typography,
} from "antd";
import {
  type CSSProperties,
  forwardRef,
  type ReactElement,
  useState,
} from "react";

type AntButtonType = "default" | "link" | "text" | "primary";

/**
 * A captioned button of one antd size, a type for each emphasis: `text` is the type
 * a quiet caption takes (antd's `link` for most controls, `text` for a row's
 * edit buttons).
 */
export function buttonOfType(
  quiet: AntButtonType,
  size: "small" | "middle" = "small"
) {
  return forwardRef<HTMLButtonElement, KitButtonProps>(function Button(
    {
      elementRef,
      variant,
      tone,
      fullWidth,
      justify,
      busy,
      style,
      type: htmlType = "button",
      ...rest
    },
    ref
  ) {
    "use no memo";
    let type: AntButtonType = "default";
    if (variant === "text") type = quiet;
    else if (variant === "filled") type = "primary";
    return (
      <AntButton
        ref={mergeRefs(ref, elementRef)}
        htmlType={htmlType}
        size={size}
        type={type}
        danger={tone === "danger"}
        block={fullWidth}
        loading={busy}
        style={justify ? { justifyContent: "flex-start", ...style } : style}
        {...rest}
      />
    );
  });
}

/** The kit's captioned button: default, a quiet one as a link. */
export const Button = /* @__PURE__ */ buttonOfType("link");

/** A row's edit buttons: default, a quiet one as text. */
export const TextButton = /* @__PURE__ */ buttonOfType("text");

/** A glyph button: text type unless the binding asks otherwise. */
export const IconButton = forwardRef<HTMLButtonElement, KitIconButtonProps>(
  function IconButton(
    {
      elementRef,
      variant,
      tone,
      fullWidth: _fullWidth,
      justify: _justify,
      busy,
      type: htmlType = "button",
      ...rest
    },
    ref
  ) {
    "use no memo";
    let type: AntButtonType = "text";
    if (variant === "outlined") type = "default";
    else if (variant === "filled") type = "primary";
    return (
      <AntButton
        ref={mergeRefs(ref, elementRef)}
        htmlType={htmlType}
        size="small"
        type={type}
        danger={tone === "danger"}
        loading={busy}
        {...rest}
      />
    );
  }
);

/** A single-line input; the part lands on the input, which is its root. */
export function TextInput({
  value,
  onValueChange,
  elementRef,
  rootPart,
  fullWidth: _full,
  invalid,
  ...rest
}: Readonly<KitTextInputProps>): ReactElement {
  "use no memo";
  return (
    <Input
      ref={(input: InputRef | null) => {
        const node = input?.input ?? null;
        if (typeof elementRef === "function") elementRef(node);
        else if (elementRef) elementRef.current = node;
      }}
      size="small"
      value={value}
      status={invalid ? "error" : undefined}
      data-adapttable-part={rootPart}
      onChange={(event) => onValueChange(event.target.value)}
      {...rest}
    />
  );
}

const FULL_WIDTH: CSSProperties = { width: "100%" };

/** antd's select; its list opens inside the table's own tree. */
export function Select({
  value,
  options,
  onValueChange,
  rootPart,
  fullWidth,
  label: _label,
  style,
  ...rest
}: Readonly<KitSelectProps>): ReactElement {
  "use no memo";
  return (
    <AntSelect
      size="small"
      value={value}
      data-adapttable-part={rootPart}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      getPopupContainer={(trigger: HTMLElement) =>
        trigger.parentElement ?? trigger
      }
      style={fullWidth ? { ...FULL_WIDTH, ...style } : style}
      onChange={onValueChange}
      {...rest}
    />
  );
}

/** A checkbox, with its label beside it when it has one. */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  ...rest
}: Readonly<KitCheckboxProps>): ReactElement {
  "use no memo";
  return (
    <AntCheckbox
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
      {...rest}
    >
      {label}
    </AntCheckbox>
  );
}

/** antd's text type for each tone the binding asks for. */
const TEXT_TYPE = {
  secondary: "secondary",
  disabled: undefined,
  danger: "danger",
} as const;

const CAPTION: CSSProperties = { fontSize: 12 };

/** Text in antd's type: body unless the binding asks otherwise. */
export function Text({
  variant = "body",
  tone,
  as: _as,
  color: _color,
  style,
  ...rest
}: Readonly<KitTextProps>): ReactElement {
  "use no memo";
  return (
    <Typography.Text
      type={tone ? TEXT_TYPE[tone] : undefined}
      disabled={tone === "disabled"}
      strong={variant === "title"}
      style={variant === "caption" ? { ...CAPTION, ...style } : style}
      {...rest}
    />
  );
}

/** A horizontal rule. */
export function Divider({
  style,
  ...data
}: Readonly<KitDividerProps>): ReactElement {
  "use no memo";
  return <AntDivider style={style} {...data} />;
}

/** The surface of a panel the binding opens, in antd's raised colours. */
const PANEL: CSSProperties = {
  minWidth: 160,
  background: "var(--ant-color-bg-elevated, Canvas)",
  boxShadow: "var(--ant-box-shadow-secondary)",
  borderRadius: 8,
};

/** A panel opened from its trigger, as antd's dropdown. */
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  role,
  part,
  className,
  style,
  flush,
  dir,
  "aria-label": ariaLabel,
}: Readonly<KitPopoverProps>): ReactElement {
  const [own, setOwn] = useState(false);
  const shown = open ?? own;
  const setShown = (next: boolean) => {
    if (open === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  return (
    <Dropdown
      trigger={["click"]}
      open={shown}
      onOpenChange={setShown}
      popupRender={() => (
        <div
          role={role === "menu" ? undefined : "dialog"}
          dir={dir}
          aria-label={ariaLabel}
          className={className}
          data-adapttable-part={part}
          style={{ ...PANEL, padding: flush ? 0 : 8, ...style }}
        >
          {children}
        </div>
      )}
    >
      {/* antd toggles from its own trigger props; the binding's click
          handler has nothing left to do. */}
      {trigger({
        elementRef: noop,
        onClick: noop,
        "aria-expanded": shown,
        "aria-haspopup": role ?? "dialog",
      })}
    </Dropdown>
  );
}

const noop = (): void => undefined;
