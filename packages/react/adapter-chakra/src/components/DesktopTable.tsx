/** The desktop `<table>`, drawn by the binding with Chakra's table elements. */
import {
  createDesktopTable,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  type KitDesktopCellProps,
  type KitDesktopHeaderCellProps,
  type KitDesktopPaint,
  type KitDesktopRowProps,
  type KitSortLabelProps,
  PIN_Z,
  pinnedEdgeCellStyle,
  sortArrow,
} from "@adapttable/react/adapter";
import { Box, chakra, Table, Text } from "@chakra-ui/react";
import type {
  ComponentProps,
  CSSProperties,
  ReactElement,
  ReactNode,
} from "react";

import { Checkbox } from "./kitPrimitives";
import { RowActionButtons } from "./RowActionButtons";

/**
 * Opaque background for sticky and pinned cells: Chakra's body background, so
 * scrolled columns never show through the pinned ones.
 */
const PIN_BG = "var(--chakra-colors-bg)";

/**
 * A heading's caption row: a block of its own, so the column checkbox sits
 * under it, justified like the column's values.
 */
const CAPTION_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  flexWrap: "wrap",
};

const JUSTIFY = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
} as const;

/** A header that sticks over the rows, on the body background. */
function stickyHead(
  stickyHeader: boolean,
  top: number
): CSSProperties | undefined {
  if (!stickyHeader) return undefined;
  return { position: "sticky", top, zIndex: PIN_Z.header, background: PIN_BG };
}

/**
 * The paint: the body background behind every rail, pinned cell and pinned
 * row's rail, and Chakra's subtle background on a selected cell.
 */
function usePaint(stickyHeader: boolean): KitDesktopPaint {
  return {
    rail: (side, pinned, inset, row) => ({
      ...pinnedEdgeCellStyle(side, pinned, PIN_Z.body, PIN_BG, inset),
      ...(row.rowPinned ? { background: PIN_BG } : undefined),
    }),
    cell: (pin) =>
      pin ? { ...pin, background: pin.background ?? PIN_BG } : undefined,
    selectedCell: { background: "var(--chakra-colors-bg-subtle)" },
    headRail: (side, pinned, inset, pin) => ({
      ...stickyHead(stickyHeader, pin.headerStickTop),
      ...pinnedEdgeCellStyle(side, pinned, PIN_Z.headerPinned, PIN_BG, inset),
    }),
    leaf: (leaf, pin) => ({
      ...stickyHead(stickyHeader, pin.headerStickTop),
      textAlign: leaf.size.textAlign,
      ...leaf.style,
      ...leaf.size,
    }),
    group: (cell) => ({
      textAlign: groupedHeaderAlign(cell.cell.align),
      fontWeight: 600,
      textTransform: "none",
      ...groupedHeaderCellStyle(
        cell,
        "var(--chakra-colors-border, color-mix(in srgb, currentColor 22%, transparent))"
      ),
    }),
    resizeHandle: (style) => style,
    captionRow: (align) => ({
      ...CAPTION_ROW,
      justifyContent: JUSTIFY[align ?? "start"],
    }),
  };
}

/** A body row: a selected one takes Chakra's alpha tint. */
export function Row({
  kind,
  elementRef,
  selected,
  ...rest
}: Readonly<KitDesktopRowProps>) {
  "use no memo";
  if (kind !== "body") return <Table.Row ref={elementRef} {...rest} />;
  return (
    <Table.Row
      ref={elementRef}
      bg={selected ? "blackAlpha.100" : undefined}
      _dark={{ bg: selected ? "whiteAlpha.200" : undefined }}
      {...rest}
    />
  );
}

/** The parts of the rails that sit tight around their control. */
const TIGHT_RAILS = new Set([
  "expand-cell",
  "reorder-cell",
  "summary-cell",
  "expand-header",
  "reorder-header",
]);

/** A body or summary cell: tight rails, actions at the end. */
export function Cell({ kind, ...rest }: Readonly<KitDesktopCellProps>) {
  "use no memo";
  if (kind === "lead" && TIGHT_RAILS.has(rest["data-adapttable-part"] ?? ""))
    return <Table.Cell px={1} {...rest} />;
  if (kind === "actions" && rest["data-adapttable-part"] === "actions-cell")
    return <Table.Cell textAlign="end" {...rest} />;
  return <Table.Cell {...rest} />;
}

/** A header cell: the tight rails take their reserved width. */
function HeaderCell({
  kind,
  railWidth,
  ...rest
}: Readonly<KitDesktopHeaderCellProps>) {
  "use no memo";
  if (kind === "lead" && TIGHT_RAILS.has(rest["data-adapttable-part"] ?? ""))
    return <Table.ColumnHeader width={`${railWidth}px`} px={1} {...rest} />;
  if (kind === "actions")
    return <Table.ColumnHeader textAlign="end" {...rest} />;
  return <Table.ColumnHeader {...rest} />;
}

function Foot(
  props: Readonly<{ "data-adapttable-part": string; children: ReactNode }>
) {
  "use no memo";
  return <Table.Footer {...props} />;
}

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

/** The caption as a bare button with an arrow and a level badge. */
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
    <chakra.button
      type="button"
      cursor="pointer"
      aria-label={buttonProps["aria-label"]}
      onClick={buttonProps.onClick}
      title={title}
    >
      {children}
      <Text as="span" aria-hidden>
        {sortArrow(active && dir ? ARIA_SORT[dir] : "none")}
      </Text>
      {index !== undefined && (
        <Text
          as="span"
          aria-hidden
          data-sort-index={index}
          fontSize="0.7em"
          fontWeight="bold"
          borderRadius="full"
          px={1.5}
          ms={1}
          bg="blackAlpha.200"
          _dark={{ bg: "whiteAlpha.300" }}
        >
          {index}
        </Text>
      )}
    </chakra.button>
  );
}

/**
 * Stable element types. An inline host is a new component every render,
 * which remounts the table and retriggers scroll measurement.
 */
function ChakraScrollHost(props: ComponentProps<typeof Box>) {
  "use no memo";
  return <Box {...props} />;
}

function ChakraTableHost(props: ComponentProps<typeof Table.Root>) {
  "use no memo";
  return <Table.Root {...props} />;
}

function ChakraHeadHost(props: ComponentProps<typeof Table.Header>) {
  "use no memo";
  return <Table.Header {...props} />;
}

function ChakraBodyHost(props: ComponentProps<typeof Table.Body>) {
  "use no memo";
  return <Table.Body {...props} />;
}

function ChakraRowHost(props: ComponentProps<typeof Table.Row>) {
  "use no memo";
  return <Table.Row {...props} />;
}

const HOSTS = {
  ScrollBox: ChakraScrollHost,
  Table: ChakraTableHost,
  Head: ChakraHeadHost,
  Body: ChakraBodyHost,
  Row: ChakraRowHost,
};

function gridFrame(scrollBox: ReactNode, role: unknown): ReactElement {
  return (
    <Box
      data-adapttable-part={role === "grid" ? "grid" : undefined}
      style={{ display: "contents" }}
    >
      {scrollBox}
    </Box>
  );
}

/** Desktop Chakra table. */
export const DesktopTable = /* @__PURE__ */ createDesktopTable<{
  readonly size: "sm" | "md" | "lg";
  readonly className?: string;
}>({
  widths: { expansion: 32, selection: 48, actions: 120 },
  Row,
  Cell,
  HeaderCell,
  Foot,
  Checkbox,
  SortLabel,
  RowActions: RowActionButtons,
  usePaint,
  useChrome: (
    { size, className, maxHeight },
    { tableProps, gridProps, tableStyle, pin, scroll }
  ) => {
    const minWidth =
      typeof tableStyle?.minWidth === "number" ? tableStyle.minWidth : 0;
    return {
      hosts: HOSTS,
      applyHeaderRowProps: false,
      frame: (scrollBox) => gridFrame(scrollBox, gridProps?.role),
      scrollBoxProps: {
        maxH: maxHeight == null ? undefined : `${maxHeight}px`,
        overflowX:
          maxHeight != null || pin.hasPinned || scroll.overflowing
            ? "auto"
            : undefined,
        overflowY: maxHeight == null ? undefined : "auto",
        style: undefined,
      },
      tableProps: {
        size,
        "data-size": size,
        className,
        minW: minWidth > 0 ? `${minWidth}px` : undefined,
        "aria-label": tableProps["aria-label"],
        role: gridProps?.role,
        dir: undefined,
        style: tableStyle
          ? { tableLayout: tableStyle.tableLayout, width: tableStyle.width }
          : undefined,
      },
    };
  },
});
