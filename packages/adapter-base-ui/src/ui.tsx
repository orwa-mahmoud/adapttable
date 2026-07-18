import { Button as BaseButton } from "@base-ui/react/button";
import { Input as BaseInput } from "@base-ui/react/input";
import {
  createElement,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";

/** Join class tokens, dropping falsy values. */
function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type Size = "1" | "2" | "3";
type Variant = "solid" | "soft" | "ghost" | "outline";

/** Convert a Themes-style space token (`"2"` / `2`) to rem. */
function space(value: string | number | undefined): string | undefined {
  if (value == null) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(n)) return `${n * 0.25}rem`;
  return String(value);
}

/** Layout flex box mirroring the spacing surface used by other adapters. */
export function Flex({
  asChild,
  direction = "row",
  gap,
  wrap,
  justify,
  align,
  py,
  mt,
  className,
  style,
  children,
  ref,
  ...rest
}: Readonly<
  {
    asChild?: boolean;
    direction?: "row" | "column";
    gap?: string | number;
    wrap?: "wrap" | "nowrap";
    justify?: CSSProperties["justifyContent"] | "between" | "end" | "start";
    align?: CSSProperties["alignItems"] | "center" | "start";
    py?: string | number;
    mt?: string | number;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
    ref?: Ref<HTMLElement>;
  } & HTMLAttributes<HTMLElement>
>) {
  const justifyMap: Record<string, CSSProperties["justifyContent"]> = {
    between: "space-between",
    end: "flex-end",
    start: "flex-start",
  };
  const alignMap: Record<string, CSSProperties["alignItems"]> = {
    center: "center",
    start: "flex-start",
  };
  const merged: CSSProperties = {
    flexDirection: direction,
    gap: space(gap),
    justifyContent:
      justify == null ? undefined : (justifyMap[justify] ?? justify),
    alignItems: align == null ? undefined : (alignMap[align] ?? align),
    paddingBlock: space(py),
    marginTop: space(mt),
    ...style,
  };
  if (asChild) {
    return <>{children}</>;
  }
  return (
    <div
      ref={ref as Ref<HTMLDivElement>}
      className={cx("adapttable-flex", className)}
      data-wrap={wrap === "wrap" ? "true" : undefined}
      style={merged}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Generic box / div wrapper with common spacing tokens. */
export function Box({
  className,
  style,
  p,
  pt,
  mb,
  mt,
  children,
  ref,
  ...rest
}: Readonly<
  {
    className?: string;
    style?: CSSProperties;
    p?: string | number;
    pt?: string | number;
    mb?: string | number;
    mt?: string | number;
    children?: ReactNode;
    ref?: Ref<HTMLDivElement>;
  } & HTMLAttributes<HTMLDivElement>
>) {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        padding: space(p),
        paddingTop: space(pt),
        marginBottom: space(mb),
        marginTop: space(mt),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Props for {@link Text}. */
export interface TextProps {
  as?: "span" | "div" | "label" | "p";
  size?: Size;
  weight?: "bold" | "regular";
  color?: string;
  align?: "center" | "start" | "end";
  ml?: string | number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  id?: string;
  role?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "data-sort-index"?: number;
}

/** Text span/paragraph helper. */
export function Text({
  as = "span",
  size,
  weight,
  color,
  align,
  ml,
  className,
  style,
  children,
  ...rest
}: Readonly<TextProps>): React.ReactElement {
  return createElement(
    as,
    {
      className: cx("adapttable-text", className),
      "data-size": size,
      "data-weight": weight,
      "data-color": color,
      "data-muted": color === "gray" ? "true" : undefined,
      "data-align": align,
      style: { marginInlineStart: space(ml), ...style },
      ...rest,
    },
    children
  );
}

/** Primary / ghost / outline button. */
export function Button({
  size = "2",
  variant = "outline",
  color,
  loading,
  className,
  style,
  children,
  disabled,
  ...rest
}: Readonly<
  {
    size?: Size;
    variant?: Variant;
    color?: string;
    loading?: boolean;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
  } & React.ComponentProps<typeof BaseButton>
>) {
  return (
    <BaseButton
      className={cx("adapttable-btn", className)}
      data-size={size}
      data-variant={variant}
      data-color={color}
      disabled={disabled === true || loading === true}
      style={style}
      {...rest}
    >
      {loading ? "…" : null}
      {children}
    </BaseButton>
  );
}

/** Icon-only button. */
export function IconButton({
  size = "2",
  variant = "ghost",
  color,
  radius: _radius,
  className,
  children,
  ...rest
}: Readonly<
  {
    size?: Size;
    variant?: Variant;
    color?: string;
    radius?: string;
    className?: string;
    children?: ReactNode;
  } & React.ComponentProps<typeof BaseButton>
>) {
  return (
    <BaseButton
      className={cx("adapttable-icon-btn", className)}
      data-size={size}
      data-variant={variant}
      data-color={color}
      {...rest}
    >
      {children}
    </BaseButton>
  );
}

/** Badge / chip. */
export function Badge({
  size: _size,
  radius: _radius,
  color,
  variant: _variant,
  className,
  children,
  ...rest
}: Readonly<
  {
    size?: Size;
    radius?: string;
    color?: string;
    variant?: string;
    className?: string;
    children?: ReactNode;
  } & HTMLAttributes<HTMLSpanElement>
>) {
  return (
    <span
      className={cx("adapttable-badge", className)}
      data-color={color}
      {...rest}
    >
      {children}
    </span>
  );
}

type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "color"
> & {
  size?: Size;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/** Text field root with optional left slot (search icon). */
export function TextFieldRoot({
  size = "2",
  className,
  style,
  children,
  ...rest
}: Readonly<TextFieldProps>) {
  if (children != null) {
    return (
      <div className={cx("adapttable-input-wrap", className)} style={style}>
        {children}
        <BaseInput className="adapttable-input" data-size={size} {...rest} />
      </div>
    );
  }
  return (
    <BaseInput
      className={cx("adapttable-input", className)}
      data-size={size}
      style={style}
      {...rest}
    />
  );
}

/** Left/right adornment for {@link TextFieldRoot}. */
export function TextFieldSlot({
  side: _side,
  children,
}: Readonly<{ side?: "left" | "right"; children?: ReactNode }>) {
  return <span aria-hidden="true">{children}</span>;
}

export const TextField = {
  Root: TextFieldRoot,
  Slot: TextFieldSlot,
};

/** Card surface for mobile rows. */
export function Card({
  className,
  size: _size,
  children,
  ref,
  ...rest
}: Readonly<
  {
    className?: string;
    size?: Size;
    children?: ReactNode;
    ref?: Ref<HTMLDivElement>;
  } & HTMLAttributes<HTMLDivElement>
>) {
  return (
    <div ref={ref} className={cx("adapttable-card", className)} {...rest}>
      {children}
    </div>
  );
}

/** Horizontal rule. */
export function Separator({
  my: _my,
  size: _size,
  className,
}: Readonly<{ my?: string; size?: string; className?: string }>) {
  return <hr className={cx("adapttable-separator", className)} />;
}

/** Loading skeleton bar. */
export function Skeleton({
  height,
  width,
  className,
}: Readonly<{ height?: string; width?: string | number; className?: string }>) {
  return (
    <span
      className={cx("adapttable-skeleton", className)}
      style={{ height, width }}
    />
  );
}

/** Indeterminate (or determinate) progress bar. */
export function Progress({
  size: _size,
  duration: _duration,
  value,
  className,
  ...rest
}: Readonly<
  {
    size?: Size;
    duration?: string;
    value?: number;
    className?: string;
  } & Omit<HTMLAttributes<HTMLProgressElement>, "value">
>) {
  return (
    <progress
      className={cx("adapttable-progress", className)}
      value={value}
      max={100}
      {...rest}
    />
  );
}

/** Small spinner. */
export function Spinner({
  size: _size,
  className,
}: Readonly<{ size?: Size; className?: string }>) {
  return (
    <output
      className={cx("adapttable-spinner", className)}
      aria-label="Loading"
    />
  );
}

/** Screen-reader-only text. */
export function VisuallyHidden({
  children,
}: Readonly<{ children?: ReactNode }>) {
  return <span className="adapttable-visually-hidden">{children}</span>;
}

/** Error callout surface. */
export const Callout = {
  Root({
    color: _color,
    role,
    children,
    className,
  }: Readonly<{
    color?: string;
    role?: string;
    children?: ReactNode;
    className?: string;
  }>) {
    return (
      <div className={cx("adapttable-callout", className)} role={role}>
        {children}
      </div>
    );
  },
  Text({ children }: Readonly<{ children?: ReactNode }>) {
    return <div>{children}</div>;
  },
};

type Justify = "start" | "center" | "end";

/** Semantic HTML table namespace matching other adapters' Table usage. */
export const Table = {
  Root({
    size = "2",
    variant: _variant,
    className,
    children,
    ...rest
  }: Readonly<
    {
      size?: Size;
      variant?: string;
      className?: string;
      children?: ReactNode;
    } & HTMLAttributes<HTMLDivElement>
  >) {
    return (
      <div
        className={cx("adapttable-table-root", className)}
        data-size={size}
        {...rest}
      >
        <table>{children}</table>
      </div>
    );
  },
  Header({ children }: Readonly<{ children?: ReactNode }>) {
    return <thead>{children}</thead>;
  },
  Body({ children }: Readonly<{ children?: ReactNode }>) {
    return <tbody>{children}</tbody>;
  },
  Row({
    children,
    className,
    style,
    ref,
    ...rest
  }: Readonly<
    {
      children?: ReactNode;
      className?: string;
      style?: CSSProperties;
      ref?: Ref<HTMLTableRowElement>;
    } & HTMLAttributes<HTMLTableRowElement>
  >) {
    return (
      <tr ref={ref} className={className} style={style} {...rest}>
        {children}
      </tr>
    );
  },
  Cell({
    children,
    justify,
    colSpan,
    style,
    className,
    ...rest
  }: Readonly<
    {
      children?: ReactNode;
      justify?: Justify;
      colSpan?: number;
      style?: CSSProperties;
      className?: string;
    } & HTMLAttributes<HTMLTableCellElement>
  >) {
    return (
      <td
        className={className}
        data-justify={justify}
        colSpan={colSpan}
        style={style}
        {...rest}
      >
        {children}
      </td>
    );
  },
  ColumnHeaderCell({
    children,
    justify,
    colSpan,
    style,
    className,
    ...rest
  }: Readonly<
    {
      children?: ReactNode;
      justify?: Justify;
      colSpan?: number;
      style?: CSSProperties;
      className?: string;
    } & HTMLAttributes<HTMLTableCellElement>
  >) {
    return (
      <th
        className={className}
        data-justify={justify}
        colSpan={colSpan}
        style={style}
        scope="col"
        {...rest}
      >
        {children}
      </th>
    );
  },
};
