/** The desktop `<table>`, drawn by the binding with Mantine's table elements. */
import {
  createDesktopTable,
  edgePinStyle,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  type KitCheckboxProps,
  type KitDesktopCellProps,
  type KitDesktopHeaderCellProps,
  type KitDesktopPaint,
  type KitDesktopRowProps,
  type KitSortLabelProps,
  PIN_Z,
  pinnedCellStyle,
} from "@adapttable/react/adapter";
import {
  Badge,
  Checkbox as MantineCheckbox,
  Group,
  Table,
} from "@mantine/core";
import type {
  ComponentProps,
  CSSProperties,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

import { type Density, DENSITY_SPACING } from "../density";
import { ChevronDownIcon, ChevronUpIcon, SelectorIcon } from "../icons";
import {
  HAIRLINE,
  PIN_HOVER_CLASS,
  PIN_HOVER_CSS,
  PINNED_BODY_PAINT,
  SELECTED_CELL_STYLE,
  SURFACE,
} from "../surface";
import { RowActionButtons } from "./RowActionButtons";

/**
 * Sticky style for a leading rail cell pinned `inset` px past the
 * inline-start edge, active only while a data column is pinned on that side.
 * Body cells pass a `background` so scrolled data never shows through.
 */
function leadingPinStyle(
  active: boolean,
  inset: number,
  zIndex: number,
  background?: string
): CSSProperties | undefined {
  if (!active) return undefined;
  const style = pinnedCellStyle({ side: "start", inset }, zIndex);
  return background ? { ...style, background } : style;
}

/** A rail's sticky style on its side. */
function railPinStyle(
  side: "start" | "end",
  pinned: boolean,
  inset: number,
  zIndex: number,
  background?: string
): CSSProperties | undefined {
  return side === "start"
    ? leadingPinStyle(pinned, inset, zIndex, background)
    : edgePinStyle("end", pinned, zIndex);
}

/**
 * The paint: Mantine's surface behind every pinned or sticking cell, the
 * row's hover tint carried onto it, and a hairline under each row and the
 * header while the header sticks.
 */
function usePaint(stickyHeader: boolean): KitDesktopPaint {
  const rowSeparator = `inset 0 -1px 0 ${HAIRLINE}`;
  const headerHairline: CSSProperties = stickyHeader
    ? { boxShadow: `0 1px 0 ${HAIRLINE}` }
    : {};
  // A pinned row sticks as well, so every one of its cells takes the opaque
  // paint: the rows scrolling beneath it must not show through.
  const paintPin = (
    style: CSSProperties | undefined,
    rowPinned: boolean
  ): CSSProperties | undefined => {
    const painted =
      style || rowPinned
        ? { ...style, background: PINNED_BODY_PAINT }
        : undefined;
    if (!stickyHeader) return painted;
    if (!painted) return { boxShadow: rowSeparator };
    return {
      ...painted,
      boxShadow: painted.boxShadow
        ? `${String(painted.boxShadow)}, ${rowSeparator}`
        : rowSeparator,
    };
  };
  return {
    rail: (side, pinned, inset, row) =>
      paintPin(
        railPinStyle(side, pinned, inset, PIN_Z.body, SURFACE),
        row.rowPinned
      ),
    cell: (pin, row) => paintPin(pin, row.rowPinned),
    selectedCell: SELECTED_CELL_STYLE,
    headRail: (side, pinned, inset, pin) => ({
      background: SURFACE,
      ...pin.stickyStyle,
      ...headerHairline,
      ...railPinStyle(side, pinned, inset, PIN_Z.headerPinned),
    }),
    leaf: (leaf) => ({
      ...leaf.style,
      background: SURFACE,
      ...headerHairline,
    }),
    // A group cell keeps its child rule (a background image), so it takes
    // only the colour. A collapsed group spans to the bottom of the header,
    // where the header's own hairline belongs.
    group: (cell) => ({
      textAlign: groupedHeaderAlign(cell.cell.align),
      fontWeight: 600,
      ...groupedHeaderCellStyle(cell, HAIRLINE),
      backgroundColor: SURFACE,
      ...(cell.rowSpan > 1 ? headerHairline : undefined),
    }),
    resizeHandle: (style) => style,
  };
}

export function Row({
  kind: _kind,
  selected: _selected,
  elementRef,
  ...rest
}: Readonly<KitDesktopRowProps>) {
  "use no memo";
  return <Table.Tr ref={elementRef} {...rest} />;
}

/** A body or summary cell: rails centre, actions end, totals read semibold. */
export function Cell({ kind, ...rest }: Readonly<KitDesktopCellProps>) {
  "use no memo";
  if (kind === "lead") return <Table.Td ta="center" {...rest} />;
  if (kind === "actions") return <Table.Td ta="end" {...rest} />;
  if (kind === "summary") return <Table.Td fw={600} c="dimmed" {...rest} />;
  return <Table.Td {...rest} />;
}

/** A header cell; the rails take their reserved width. */
function HeaderCell({
  kind,
  railWidth,
  ...rest
}: Readonly<KitDesktopHeaderCellProps>) {
  "use no memo";
  if (kind === "lead") return <Table.Th w={railWidth} ta="center" {...rest} />;
  if (kind === "actions") return <Table.Th ta="end" w={railWidth} {...rest} />;
  return <Table.Th {...rest} />;
}

function Foot(
  props: Readonly<{ "data-adapttable-part": string; children: ReactNode }>
) {
  "use no memo";
  return <Table.Tfoot {...props} />;
}

export function Checkbox({
  checked,
  onCheckedChange,
  indeterminate,
  "aria-label": label,
  label: _label,
  ...rest
}: Readonly<KitCheckboxProps>) {
  "use no memo";
  return (
    <MantineCheckbox
      {...rest}
      aria-label={label}
      checked={checked}
      indeterminate={indeterminate}
      onChange={(event) => onCheckedChange(event.currentTarget.checked)}
    />
  );
}

function SortIcon({
  active,
  dir,
}: Readonly<{ active: boolean; dir: "asc" | "desc" | undefined }>) {
  if (!active) return <SelectorIcon size={12} />;
  return dir === "asc" ? (
    <ChevronUpIcon size={12} />
  ) : (
    <ChevronDownIcon size={12} />
  );
}

const SORT_BUTTON: CSSProperties = {
  background: "none",
  border: 0,
  cursor: "pointer",
  font: "inherit",
  padding: 0,
};

/** The caption as a bare button with Mantine's sort icon and a level badge. */
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
    <Group
      component="button"
      gap={6}
      wrap="nowrap"
      display="inline-flex"
      title={title}
      style={{
        ...SORT_BUTTON,
        color: active ? "var(--mantine-primary-color-filled)" : "inherit",
      }}
      {...buttonProps}
    >
      <span>{children}</span>
      <SortIcon active={active} dir={dir} />
      {typeof index === "number" && (
        <Badge component="span" size="xs" variant="light">
          {index}
        </Badge>
      )}
    </Group>
  );
}

/**
 * Stable element types. An inline host is a new component every render,
 * which remounts the table and retriggers scroll measurement.
 */
function MantineTableHost(props: ComponentProps<typeof Table>) {
  "use no memo";
  return <Table {...props} />;
}

function MantineHeadHost(props: ComponentProps<typeof Table.Thead>) {
  "use no memo";
  return <Table.Thead {...props} />;
}

function MantineBodyHost(props: ComponentProps<typeof Table.Tbody>) {
  "use no memo";
  return <Table.Tbody {...props} />;
}

function MantineRowHost(props: ComponentProps<typeof Table.Tr>) {
  "use no memo";
  return <Table.Tr {...props} />;
}

const HOSTS = {
  Table: MantineTableHost,
  Head: MantineHeadHost,
  Body: MantineBodyHost,
  Row: MantineRowHost,
};

function gridFrame(scrollBox: ReactNode, role: unknown): ReactElement {
  return (
    <div
      data-adapttable-part={role === "grid" ? "grid" : undefined}
      style={{ display: "contents" }}
    >
      {scrollBox}
    </div>
  );
}

/** Desktop table rendering driven by core prop-getters. */
export const DesktopTable = /* @__PURE__ */ createDesktopTable<{
  readonly bodyRef: RefObject<HTMLTableSectionElement | null>;
  readonly className?: string;
  readonly density?: Density;
}>({
  widths: { expansion: 36, selection: 40, actions: 120 },
  Row,
  Cell,
  HeaderCell,
  Foot,
  Checkbox,
  SortLabel,
  RowActions: RowActionButtons,
  usePaint,
  useChrome: (
    { bodyRef, className, density = "comfortable", stickyHeader = false },
    { gridProps, scroll, tableStyle }
  ) => {
    const { verticalSpacing, horizontalSpacing } = DENSITY_SPACING[density];
    const minWidth =
      typeof tableStyle?.minWidth === "number" ? tableStyle.minWidth : 0;
    return {
      hosts: HOSTS,
      frame: (scrollBox) => gridFrame(scrollBox, gridProps?.role),
      scrollBoxProps: { style: { width: "100%", ...scroll.boxStyle } },
      beforeTable: <style>{PIN_HOVER_CSS}</style>,
      headProps: { style: { background: SURFACE } },
      bodyProps: { ref: bodyRef },
      tableProps: {
        className: className
          ? `${PIN_HOVER_CLASS} ${className}`
          : PIN_HOVER_CLASS,
        highlightOnHover: true,
        verticalSpacing,
        horizontalSpacing,
        style: {
          minWidth: Math.max(480, minWidth),
          ...(stickyHeader
            ? { borderCollapse: "separate" as const, borderSpacing: 0 }
            : {}),
          ...(tableStyle?.tableLayout
            ? { tableLayout: tableStyle.tableLayout }
            : {}),
          ...(tableStyle?.width ? { width: tableStyle.width } : {}),
        },
      },
    };
  },
});
