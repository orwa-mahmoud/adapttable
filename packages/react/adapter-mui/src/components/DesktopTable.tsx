/** The desktop `<table>`, drawn by the binding with MUI's table elements. */
import {
  createDesktopTable,
  groupedHeaderCellStyle,
  type KitCheckboxProps,
  type KitDesktopCellProps,
  type KitDesktopHeaderCellProps,
  type KitDesktopPaint,
  type KitDesktopRowProps,
  type KitSortLabelProps,
  PIN_Z,
  pinnedEdgeCellStyle,
  type SharedTableRenderProps,
} from "@adapttable/react/adapter";
import {
  Box,
  Checkbox as MuiCheckbox,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TableSortLabel,
  useTheme,
} from "@mui/material";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useRef,
} from "react";

import { RowActionButtons } from "./RowActionButtons";

/** Map a destructive colour token to MUI's `"error"` palette, else default. */
export function muiColor(color: string | undefined): "default" | "error" {
  return color === "danger" || color === "red" || color === "error"
    ? "error"
    : "default";
}

export interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
  /** The kit's size token for the table. */
  size: "small" | "medium";
  /** Class applied to every mobile card (merged before `rowClassName`). */
  cardClassName?: string;
  /** Text direction — flips the collapsed expand chevron under RTL. */
  dir?: "ltr" | "rtl";
  /**
   * End-pin the trailing actions column on its own (the reserved "actions"
   * layout key pinned right from the Columns menu) — independent of whether
   * any DATA column is pinned right. Desktop only; cards have no columns.
   */
  actionsPinned?: boolean;
}

/**
 * Identity-stable dispatcher for `selection.toggle` / `expansion.toggle`.
 * `selection.toggle` is recreated whenever the selection changes, so handing
 * it straight to a memoized row would either defeat the memo (if compared)
 * or go stale (if not — in the controlled mode it computes from the captured
 * set). This wrapper never changes identity and always dispatches to the
 * CURRENT target, so skipped rows still toggle against fresh state.
 */
export function useStableToggle(
  target: { toggle: (id: string) => void } | null | undefined
): (id: string) => void {
  const ref = useRef(target);
  ref.current = target;
  return useCallback((id: string) => ref.current?.toggle(id), []);
}

/**
 * A pinned body cell: the paper surface, with the row's hover or selected tint
 * laid over it through `--adapttable-pin-tint`, so the cell lights up with the
 * rest of its row.
 */
function pinnedBodyPaint(paper: string): string {
  return `linear-gradient(var(--adapttable-pin-tint, transparent), var(--adapttable-pin-tint, transparent)), ${paper}`;
}

const RESIZE_HANDLE: CSSProperties = {
  position: "absolute",
  insetInlineEnd: 0,
  top: 0,
  height: "100%",
  width: 8,
  cursor: "col-resize",
  touchAction: "none",
  userSelect: "none",
};

/**
 * The palette as values a style can use: CSS variables when the theme declares
 * them, the theme's own colours when it does not. A bare `var(--mui-palette-…)`
 * is undefined under a plain `createTheme`, and an undefined variable in an
 * inline background leaves a pinned cell transparent.
 */
function usePaint(stickyHeader: boolean): KitDesktopPaint {
  const theme = useTheme();
  const palette = (theme.vars ?? theme).palette;
  const paper = palette.background.paper;
  const pinBg = pinnedBodyPaint(paper);
  return {
    // The rails always sit on paper; a pinned one also sticks.
    rail: (side, pinned, inset) =>
      pinnedEdgeCellStyle(side, pinned, PIN_Z.body, pinBg, inset) ?? {
        backgroundColor: paper,
      },
    cell: (pin) => (pin ? { ...pin, background: pinBg } : undefined),
    selectedCell: { backgroundColor: palette.action.selected },
    headRail: (side, pinned, inset, pin) => ({
      ...(stickyHeader
        ? {
            position: "sticky",
            top: pin.headerStickTop,
            zIndex: PIN_Z.header,
            backgroundColor: paper,
          }
        : undefined),
      ...(pinned ? { backgroundColor: paper } : undefined),
      ...pinnedEdgeCellStyle(side, pinned, PIN_Z.headerPinned, paper, inset),
    }),
    leaf: (leaf, pin) => ({
      ...(stickyHeader
        ? {
            position: "sticky",
            top: pin.headerStickTop,
            zIndex: PIN_Z.header,
            backgroundColor: paper,
          }
        : undefined),
      ...(leaf.pinned ? { backgroundColor: paper } : undefined),
      textAlign: leaf.size.textAlign,
      ...(leaf.rowSpan > 1 ? { verticalAlign: "middle" } : undefined),
      ...leaf.style,
      ...leaf.size,
    }),
    group: (cell) => ({
      fontWeight: 600,
      ...groupedHeaderCellStyle(cell, palette.divider),
    }),
    resizeHandle: () => RESIZE_HANDLE,
  };
}

/** A body row: MUI's hover tint and selected colour, carried onto pinned cells. */
export function Row({
  kind,
  elementRef,
  selected,
  ...rest
}: Readonly<KitDesktopRowProps>) {
  "use no memo";
  const palette = useTheme().palette;
  if (kind !== "body") return <TableRow ref={elementRef} {...rest} />;
  return (
    <TableRow
      ref={elementRef}
      hover
      selected={selected === true}
      sx={{
        "&.Mui-selected > td": {
          "--adapttable-pin-tint": palette.action.selected,
        },
        "&:hover > td": { "--adapttable-pin-tint": palette.action.hover },
      }}
      {...rest}
    />
  );
}

/** A table cell: the rails take MUI's checkbox padding, actions end-align. */
function tableCell(
  kind: KitDesktopCellProps["kind"] | KitDesktopHeaderCellProps["kind"],
  props: Omit<KitDesktopCellProps, "kind">
): ReactNode {
  if (kind === "lead") return <TableCell padding="checkbox" {...props} />;
  if (kind === "actions")
    return (
      <TableCell {...props} style={{ textAlign: "end", ...props.style }} />
    );
  return <TableCell {...props} />;
}

/** A body or summary cell. */
export function Cell({ kind, ...rest }: Readonly<KitDesktopCellProps>) {
  "use no memo";
  return tableCell(kind, rest);
}

/** A header cell; MUI sizes its rails through their padding. */
function HeaderCell({
  kind,
  railWidth: _railWidth,
  ...rest
}: Readonly<KitDesktopHeaderCellProps>) {
  "use no memo";
  return tableCell(kind, rest);
}

function Foot(
  props: Readonly<{ "data-adapttable-part": string; children: ReactNode }>
) {
  "use no memo";
  return <TableFooter {...props} />;
}

/** The selection checkbox at MUI's table size. */
export function Checkbox({
  checked,
  onCheckedChange,
  indeterminate,
  "aria-label": label,
  label: _label,
  disabled,
  className,
  ...data
}: Readonly<KitCheckboxProps>) {
  "use no memo";
  return (
    <MuiCheckbox
      {...data}
      className={className}
      disabled={disabled}
      slotProps={{ input: { "aria-label": label } }}
      checked={checked}
      indeterminate={indeterminate}
      onChange={(_, next) => onCheckedChange(next)}
    />
  );
}

function SortLabel({
  active,
  dir,
  index,
  title,
  buttonProps,
  children,
}: Readonly<KitSortLabelProps>) {
  "use no memo";
  return (
    <TableSortLabel
      active={active}
      direction={dir === "desc" ? "desc" : "asc"}
      aria-label={buttonProps["aria-label"]}
      onClick={buttonProps.onClick}
      title={title}
    >
      {children}
      {index !== undefined && (
        <Box component="span" sx={{ fontSize: 10, ml: 0.5 }}>
          {index}
        </Box>
      )}
    </TableSortLabel>
  );
}

/**
 * Stable element types. An inline host is a new component every render,
 * which remounts the table and retriggers scroll measurement.
 */
function MuiScrollHost(props: ComponentProps<typeof Box>) {
  "use no memo";
  return <Box {...props} />;
}

function MuiTableHost(props: ComponentProps<typeof Table>) {
  "use no memo";
  return <Table {...props} />;
}

function MuiHeadHost(props: ComponentProps<typeof TableHead>) {
  "use no memo";
  return <TableHead {...props} />;
}

function MuiBodyHost(props: ComponentProps<typeof TableBody>) {
  "use no memo";
  return <TableBody {...props} />;
}

function MuiRowHost(props: ComponentProps<typeof TableRow>) {
  "use no memo";
  return <TableRow {...props} />;
}

const HOSTS = {
  ScrollBox: MuiScrollHost,
  Table: MuiTableHost,
  Head: MuiHeadHost,
  Body: MuiBodyHost,
  Row: MuiRowHost,
};

/** Desktop MUI table. */
export const DesktopTable = /* @__PURE__ */ createDesktopTable<{
  readonly size: "small" | "medium";
}>({
  widths: { expansion: 48, selection: 48, actions: 120 },
  Row,
  Cell,
  HeaderCell,
  Foot,
  Checkbox,
  SortLabel,
  RowActions: RowActionButtons,
  usePaint,
  useChrome: ({ size }, { tableProps, gridProps, tableStyle }) => {
    const minWidth =
      typeof tableStyle?.minWidth === "number" ? tableStyle.minWidth : 0;
    return {
      hosts: HOSTS,
      applyHeaderRowProps: false,
      tableProps: {
        size,
        "aria-label": tableProps["aria-label"],
        role: gridProps?.role,
        dir: undefined,
        sx: minWidth > 0 ? { minWidth } : undefined,
        style: tableStyle
          ? { tableLayout: tableStyle.tableLayout, width: tableStyle.width }
          : undefined,
      },
    };
  },
});
