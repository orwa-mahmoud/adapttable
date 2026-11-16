/**
 * antd's Columns menu: the binding's composition, drawn with antd's small
 * buttons, input and select in antd's popover, on antd's spacing.
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
  type KitTextProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import {
  Button as AntButton,
  Divider as AntDivider,
  Flex,
  Input,
  type InputRef,
  Popover as AntPopover,
  Select as AntSelect,
  theme,
} from "antd";
import {
  type CSSProperties,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from "react";

import { Text as KitText, TextInput } from "./kitPrimitives";

/** The shared Columns-menu contract, declared once in core. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow>;

/** The parts whose button is antd's default type at its middle size. */
const TRIGGER_PARTS = new Set(["column-menu-button", "views-button"]);

/** The parts whose button is antd's default type at the small size. */
const DEFAULT_PARTS = new Set(["views-save"]);

/**
 * The menus' buttons: a trigger antd's default button, a saved view's save
 * small and default, a rename's save primary, the rest small text buttons at
 * their own width (a saved view fills its row, starting at its edge).
 */
export const Button = forwardRef<HTMLButtonElement, KitButtonProps>(
  function Button(
    {
      elementRef,
      variant,
      tone: _tone,
      fullWidth: _fullWidth,
      justify: _justify,
      busy,
      style,
      type: htmlType = "button",
      ...rest
    },
    ref
  ) {
    "use no memo";
    const part = rest["data-adapttable-part"] ?? "";
    const trigger = TRIGGER_PARTS.has(part);
    let type: "default" | "primary" | "text" = "text";
    if (trigger || DEFAULT_PARTS.has(part)) type = "default";
    else if (variant === "filled") type = "primary";
    return (
      <AntButton
        ref={mergeRefs(ref, elementRef)}
        htmlType={htmlType}
        size={trigger ? undefined : "small"}
        type={type}
        loading={busy}
        style={part === "views-item" ? { ...VIEW_ITEM, ...style } : style}
        {...rest}
      />
    );
  }
);

const VIEW_ITEM: CSSProperties = { flex: 1, justifyContent: "flex-start" };

const GRIP: CSSProperties = { display: "inline-flex" };

/** The toggles whose glyph is antd's icon; the others carry a caption. */
const ICON_PARTS = new Set(["column-menu-visibility", "column-menu-pin"]);

/**
 * A row's glyph buttons: the eye a link while its column shows, the pin
 * primary while pinned, the rest text. The grip is a handle, faded while its
 * column can move and more while it cannot.
 */
export function IconButton({
  elementRef,
  variant,
  tone,
  fullWidth: _fullWidth,
  justify: _justify,
  busy: _busy,
  style,
  disabled,
  children,
  type: htmlType = "button",
  ...rest
}: Readonly<KitIconButtonProps>) {
  "use no memo";
  if (rest["data-adapttable-part"] === "column-menu-grip") {
    return (
      <span
        aria-disabled={disabled === true || undefined}
        style={{ ...GRIP, ...style, opacity: disabled ? 0.3 : 0.55 }}
        {...rest}
      >
        {children}
      </span>
    );
  }
  const icon = ICON_PARTS.has(rest["data-adapttable-part"] ?? "");
  let type: "link" | "primary" | "text" = "text";
  if (variant === "filled") type = "primary";
  else if (tone === "primary") type = "link";
  return (
    <AntButton
      ref={elementRef}
      htmlType={htmlType}
      size="small"
      type={type}
      disabled={disabled}
      icon={icon ? children : undefined}
      style={style}
      {...rest}
    >
      {icon ? undefined : children}
    </AntButton>
  );
}

const LABEL: CSSProperties = { flex: 1, fontSize: 14 };

/** A row's name, faded and struck through while its column is hidden. */
function Text(props: Readonly<KitTextProps>) {
  "use no memo";
  const { tone, style, ...rest } = props;
  if (rest["data-adapttable-part"] === "column-menu-label") {
    return (
      <span
        style={{ ...LABEL, ...style, opacity: tone === "disabled" ? 0.5 : 1 }}
        {...rest}
      />
    );
  }
  return <KitText {...props} />;
}

/** A plugin-owned choice: its caption over antd's small select. */
function Select({
  value,
  options,
  onValueChange,
  rootPart,
  label,
  disabled,
  fullWidth: _fullWidth,
  style,
  "aria-label": ariaLabel,
}: Readonly<KitSelectProps>) {
  "use no memo";
  return (
    <Flex vertical gap={4} data-adapttable-part={rootPart} style={style}>
      <span style={{ fontSize: 12 }}>{label}</span>
      <AntSelect
        size="small"
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        options={options.map((option) => ({ ...option }))}
        getPopupContainer={(trigger: HTMLElement) =>
          trigger.parentElement ?? document.body
        }
        onClick={(event: MouseEvent) => event.stopPropagation()}
        onChange={onValueChange}
      />
    </Flex>
  );
}

/** The rule above the injected rows, and a wider one above the footer. */
export function Divider({ style, ...data }: Readonly<KitDividerProps>) {
  "use no memo";
  const injected = data["data-adapttable-part"] === "column-menu-separator";
  return (
    <AntDivider
      style={{ margin: injected ? "6px 0" : "8px 0", ...style }}
      {...data}
    />
  );
}

/**
 * The rename field: a small caption, antd's input and the error under it.
 * Inside antd's table header, whose cell sorts on a click and moves focus on
 * its keys, the input keeps its clicks and keys to itself.
 */
export function renameFieldOf(
  containEvents: boolean
): (props: Readonly<KitRenameFieldProps>) => ReactElement {
  return function RenameField({
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
  }) {
    "use no memo";
    const { token } = theme.useToken();
    return (
      <>
        <label
          htmlFor={id}
          data-adapttable-part={parts.label}
          style={{ display: "block", fontSize: 12, marginBottom: 4 }}
        >
          {label}
        </label>
        <Input
          ref={(input: InputRef | null) => {
            const node = input?.input ?? null;
            if (typeof elementRef === "function") elementRef(node);
            else if (elementRef) elementRef.current = node;
          }}
          id={id}
          size="small"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          data-adapttable-part={parts.input}
          onClick={
            containEvents
              ? (event: MouseEvent) => event.stopPropagation()
              : undefined
          }
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={onBlur}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (containEvents) event.stopPropagation();
            onKeyDown(event);
          }}
        />
        {error ? (
          <div
            id={errorId}
            role="alert"
            data-adapttable-part={parts.error}
            style={{ color: token.colorError, fontSize: 12, marginTop: 4 }}
          >
            {error}
          </div>
        ) : null}
      </>
    );
  };
}

/** The Columns menu's rename field. */
export const RenameField = /* @__PURE__ */ renameFieldOf(false);

const noop = (): void => undefined;

/** antd's own panel padding goes: the menu's panel brings its spacing. */
const NO_PADDING = { content: { padding: 0 } } as const;

/**
 * antd's popover under its trigger's end edge, mirrored in a right-to-left
 * page, flipping above it only where `flips`. antd has no Escape of its own;
 * the binding's closes it.
 */
export function panelPopover(
  flips: boolean
): (props: Readonly<KitPopoverProps>) => ReactElement {
  const overflow: { readonly adjustX: 1; readonly adjustY: 0 | 1 } = {
    adjustX: 1,
    adjustY: flips ? 1 : 0,
  };
  return function Popover({
    trigger,
    children,
    open,
    onOpenChange,
    dir,
    "aria-label": label,
  }) {
    "use no memo";
    return (
      <AntPopover
        trigger="click"
        open={open}
        onOpenChange={onOpenChange}
        placement={dir === "rtl" ? "bottomLeft" : "bottomRight"}
        autoAdjustOverflow={overflow}
        content={
          <div role="dialog" aria-label={label} dir={dir}>
            {children}
          </div>
        }
        styles={NO_PADDING}
      >
        {/* antd toggles from its own trigger props. */}
        {trigger({
          elementRef: noop,
          onClick: noop,
          "aria-expanded": open === true,
          "aria-haspopup": "dialog",
        })}
      </AntPopover>
    );
  };
}

const Popover = /* @__PURE__ */ panelPopover(true);

const ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 0",
};

const useLook = (): KitColumnMenuLook => {
  const { token } = theme.useToken();
  return {
    panel: {
      padding: 8,
      minWidth: "min(260px, calc(100vw - 48px))",
      boxSizing: "border-box",
    },
    heading: {
      display: "block",
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      opacity: 0.6,
      padding: "0 4px 6px",
    },
    search: { marginBottom: 8 },
    bulk: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 },
    row: ROW,
    // The width of the grip the row has none of, so its controls line up.
    rowSpacer: { display: "inline-flex", width: 14, flexShrink: 0 },
    grip: {},
    divider: {},
    submenu: {},
    choice: { padding: "4px 7px" },
    renameForm: { padding: "4px 7px" },
    renameActions: { display: "flex", gap: 4, marginTop: 4 },
    accent: token.colorPrimary,
    // antd's popover pads the panel 12px a side and stands off its trigger.
    panelInset: 40,
  };
};

/**
 * Column-management popover: per-column drag grip (reorder), eye
 * (show/hide), pin toggle and a list of column actions.
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
  },
  useLook
);
