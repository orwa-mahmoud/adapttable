/**
 * Native controls for the binding's primitives: native is this kit's look, so
 * every control the binding draws here is a plain element, styled by the
 * host's classes and parts.
 */
import {
  type KitButtonProps,
  type KitCheckboxProps,
  type KitDividerProps,
  type KitIconButtonProps,
  type KitSelectProps,
  type KitTextInputProps,
  type KitTextProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import {
  type ChangeEvent,
  type CSSProperties,
  forwardRef,
  type ReactElement,
} from "react";

const FULL_WIDTH: CSSProperties = { width: "100%" };
const AT_START: CSSProperties = { textAlign: "start" };

/** A native button; a quiet one is marked for the host's styles. */
export const Button = forwardRef<HTMLButtonElement, KitButtonProps>(
  function Button(
    {
      elementRef,
      variant,
      tone,
      fullWidth,
      justify,
      busy,
      disabled,
      style,
      type = "button",
      ...rest
    },
    ref
  ) {
    "use no memo";
    return (
      <button
        ref={mergeRefs(ref, elementRef)}
        type={type}
        data-variant={variant === "text" ? "quiet" : undefined}
        data-tone={tone === "danger" ? "danger" : undefined}
        disabled={disabled === true || busy === true}
        aria-busy={busy === true ? true : undefined}
        style={{
          ...(fullWidth ? FULL_WIDTH : undefined),
          ...(justify ? AT_START : undefined),
          ...style,
        }}
        {...rest}
      />
    );
  }
);

const LINK: CSSProperties = {
  font: "inherit",
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textDecoration: "underline",
  color: "inherit",
};

/** A button that reads as a link: the "show more" of a group. */
export function LinkButton({
  elementRef,
  variant: _variant,
  tone: _tone,
  fullWidth: _fullWidth,
  justify: _justify,
  busy: _busy,
  style,
  type = "button",
  ...rest
}: Readonly<KitButtonProps>): ReactElement {
  "use no memo";
  return (
    <button
      ref={elementRef}
      type={type}
      style={{ ...LINK, ...style }}
      {...rest}
    />
  );
}

const ICON_BUTTON: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "1.5em",
  height: "1.5em",
  flexShrink: 0,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};

const OUTLINED_ICON_BUTTON: CSSProperties = {
  border: "1px solid currentColor",
  borderRadius: "0.25em",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  lineHeight: 1,
  padding: "0.25em 0.5em",
};

/** A native glyph button of one base style, outlined when asked. */
export function iconButtonOf(base: CSSProperties) {
  return forwardRef<HTMLButtonElement, KitIconButtonProps>(function IconButton(
    {
      elementRef,
      variant,
      tone: _tone,
      fullWidth: _fullWidth,
      justify: _justify,
      busy,
      disabled,
      style,
      type = "button",
      ...rest
    },
    ref
  ) {
    "use no memo";
    return (
      <button
        ref={mergeRefs(ref, elementRef)}
        type={type}
        disabled={disabled === true || busy === true}
        style={{
          ...(variant === "outlined" ? OUTLINED_ICON_BUTTON : base),
          ...style,
        }}
        {...rest}
      />
    );
  });
}

/** The kit's glyph button. */
export const IconButton = /* @__PURE__ */ iconButtonOf(ICON_BUTTON);

/** A column group's toggle: a glyph button set off from the caption. */
export const GroupToggleButton = /* @__PURE__ */ iconButtonOf({
  ...ICON_BUTTON,
  marginInlineEnd: "0.25em",
});

/** The style of a row's reorder controls: a larger glyph button. */
export const REORDER_BUTTON: CSSProperties = {
  ...ICON_BUTTON,
  width: "1.75em",
  height: "1.75em",
  cursor: "grab",
};

/** A row's reorder controls. */
export const ReorderButton = /* @__PURE__ */ iconButtonOf(REORDER_BUTTON);

/** A native input; the part lands on it, as it is its own root. */
export function TextInput({
  value,
  onValueChange,
  elementRef,
  rootPart,
  fullWidth: _fullWidth,
  invalid,
  ...rest
}: Readonly<KitTextInputProps>): ReactElement {
  "use no memo";
  return (
    <input
      ref={elementRef}
      value={value}
      data-adapttable-part={rootPart}
      aria-invalid={invalid ? "true" : rest["aria-invalid"]}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onValueChange(event.target.value)
      }
      {...rest}
    />
  );
}

const FIND_INPUT: CSSProperties = { font: "inherit", padding: "0.25em 0.5em" };

/** The find bar's field, in the text's own font. */
export function FindInput(props: Readonly<KitTextInputProps>): ReactElement {
  "use no memo";
  return <TextInput {...props} style={{ ...FIND_INPUT, ...props.style }} />;
}

/** A native select; the part and the host's class land on it. */
export function Select({
  value,
  options,
  onValueChange,
  rootPart,
  fullWidth: _fullWidth,
  label: _label,
  ...rest
}: Readonly<KitSelectProps>): ReactElement {
  "use no memo";
  return (
    <select
      value={value}
      data-adapttable-part={rootPart}
      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
        onValueChange(event.target.value)
      }
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

const LABELLED: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

/** A native checkbox, inside its label when it has one. */
export function Checkbox({
  checked,
  onCheckedChange,
  indeterminate,
  label,
  className,
  rootPart,
  style,
  ...rest
}: Readonly<KitCheckboxProps>): ReactElement {
  "use no memo";
  const box = (
    <input
      type="checkbox"
      ref={(node) => {
        if (node) node.indeterminate = indeterminate === true;
      }}
      checked={checked}
      className={label == null ? className : undefined}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onCheckedChange(event.target.checked)
      }
      {...rest}
    />
  );
  if (label == null) return box;
  return (
    <label
      data-adapttable-part={rootPart}
      className={className}
      style={style ?? LABELLED}
    >
      {box}
      {label}
    </label>
  );
}

/** Plain text in its element. */
export function Text({
  variant: _variant,
  tone: _tone,
  as: As = "span",
  ...rest
}: Readonly<KitTextProps>): ReactElement {
  "use no memo";
  return <As {...rest} />;
}

/** A horizontal rule. */
export function Divider({
  style,
  ...data
}: Readonly<KitDividerProps>): ReactElement {
  "use no memo";
  return <hr style={style} {...data} />;
}
