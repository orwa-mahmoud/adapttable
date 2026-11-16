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
      aria-invalid={invalid ? "true" : rest["aria-invalid"]}
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
  rootPart,
  style,
  className,
  ...rest
}: Readonly<KitCheckboxProps>): ReactElement {
  "use no memo";
  const rooted = rootPart !== undefined || style !== undefined;
  const box = (
    <AntCheckbox
      checked={checked}
      className={rooted ? undefined : className}
      onChange={(event) => onCheckedChange(event.target.checked)}
      {...rest}
    >
      {label}
    </AntCheckbox>
  );
  if (!rooted) return box;
  // antd routes loose props to the inner <input> and `className` to its own
  // wrapper; one span outside both keeps the part and the class together.
  return (
    <span data-adapttable-part={rootPart} className={className} style={style}>
      {box}
    </span>
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
  as: As,
  htmlFor,
  color: _color,
  style,
  ...rest
}: Readonly<KitTextProps>): ReactElement {
  "use no memo";
  const text = (
    <Typography.Text
      type={tone ? TEXT_TYPE[tone] : undefined}
      disabled={tone === "disabled"}
      strong={variant === "title"}
      style={variant === "caption" ? { ...CAPTION, ...style } : style}
      {...rest}
    />
  );
  // antd's text is a span; another element the binding asks for wraps it.
  if (!As || As === "span") return text;
  return As === "label" ? (
    <label htmlFor={htmlFor}>{text}</label>
  ) : (
    <As>{text}</As>
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

/**
 * The platform's own non-modal dialog element, with its default box reset so
 * the kit's popup draws it as before.
 */
export const INLINE_DIALOG: CSSProperties = {
  position: "static",
  inset: "auto",
  width: "auto",
  height: "auto",
  maxWidth: "none",
  maxHeight: "none",
  margin: 0,
  padding: 0,
  border: 0,
  background: "transparent",
  color: "inherit",
};

/** What a dropdown panel draws around its content. */
interface PanelOptions extends Pick<
  KitPopoverProps,
  "role" | "dir" | "className" | "part" | "style" | "flush" | "children"
> {
  readonly ariaLabel: string | undefined;
}

/**
 * The dropdown's popup: a menu's list as it is, any other panel as a dialog.
 *
 * @param options - The panel's role, direction, label, class, part and look.
 * @returns The dropdown's `popupRender`.
 */
function panelOf({
  role,
  dir,
  ariaLabel,
  className,
  part,
  style,
  flush,
  children,
}: PanelOptions): () => ReactElement {
  const box: CSSProperties = { ...PANEL, padding: flush ? 0 : 8, ...style };
  return function Panel() {
    return role === "menu" ? (
      <div
        dir={dir}
        aria-label={ariaLabel}
        className={className}
        data-adapttable-part={part}
        style={box}
      >
        {children}
      </div>
    ) : (
      <dialog
        open
        dir={dir}
        aria-label={ariaLabel}
        className={className}
        data-adapttable-part={part}
        style={{ ...INLINE_DIALOG, ...box }}
      >
        {children}
      </dialog>
    );
  };
}

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
      popupRender={panelOf({
        role,
        dir,
        ariaLabel,
        className,
        part,
        style,
        flush,
        children,
      })}
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
