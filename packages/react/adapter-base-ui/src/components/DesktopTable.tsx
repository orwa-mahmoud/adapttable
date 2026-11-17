/** The desktop `<table>`, drawn by the binding with Base UI's table elements. */
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
import type { CSSProperties, ReactNode } from "react";

import { Table, Text } from "../ui";
import { Checkbox } from "./kitPrimitives";
import { RowActionButtons } from "./RowActionButtons";

type TableSize = "1" | "2" | "3";

/** Opaque background for sticky/pinned cells (the panel surface). */
const PIN_BG = "var(--adapttable-surface, #ffffff)";

/**
 * Ensure pinned columns stick against our scroll wrapper via a min-width
 * custom property on the wrapper.
 */
const STICKY_FIX_CLASS = "adapttable-base-ui-scroll";

const STICKY_FIX_CSS = `.${STICKY_FIX_CLASS} table{overflow:visible;min-width:var(--adapttable-min-width,0)}`;

/** A header that sticks over the rows, on the panel surface. */
function stickify(
  base: CSSProperties | undefined,
  stickyHeader: boolean,
  top: number
): CSSProperties | undefined {
  if (!stickyHeader) return base;
  if (base?.position === "sticky") return { ...base, top, background: PIN_BG };
  return {
    ...base,
    position: "sticky",
    top,
    zIndex: PIN_Z.header,
    background: PIN_BG,
  };
}

/**
 * The paint: the panel surface behind every rail, pinned cell and pinned
 * row's rail, and the kit's tint on a selected cell.
 */
function usePaint(stickyHeader: boolean): KitDesktopPaint {
  return {
    rail: (side, pinned, inset, row) => ({
      ...pinnedEdgeCellStyle(side, pinned, PIN_Z.body, PIN_BG, inset),
      ...(row.rowPinned ? { background: PIN_BG } : undefined),
    }),
    cell: (pin) =>
      pin ? { ...pin, background: pin.background ?? PIN_BG } : undefined,
    selectedCell: {
      background: "var(--adapttable-cell-selected, rgba(59, 130, 246, 0.14))",
    },
    headRail: (side, pinned, inset, pin) =>
      stickify(
        pinnedEdgeCellStyle(side, pinned, PIN_Z.headerPinned, PIN_BG, inset),
        stickyHeader,
        pin.headerStickTop
      ),
    leaf: (leaf, pin) =>
      stickify(
        { ...leaf.style, ...leaf.size },
        stickyHeader,
        pin.headerStickTop
      ),
    group: (cell) => ({
      textAlign: groupedHeaderAlign(cell.cell.align),
      ...groupedHeaderCellStyle(
        cell,
        "var(--gray-a6, color-mix(in srgb, currentColor 22%, transparent))"
      ),
    }),
    resizeHandle: (style) => style,
    // The caption sits in the header cell's own flow.
    captionRow: () => CAPTION_IN_FLOW,
  };
}

const CAPTION_IN_FLOW: CSSProperties = { display: "contents" };

/** A body row: a selected one takes the kit's grey tint. */
export function Row({
  kind,
  elementRef,
  selected,
  style,
  ...rest
}: Readonly<KitDesktopRowProps>) {
  "use no memo";
  if (kind === "summary")
    return (
      <Table.Row ref={elementRef} data-summary="" style={style} {...rest} />
    );
  if (kind !== "body")
    return <Table.Row ref={elementRef} style={style} {...rest} />;
  return (
    <Table.Row
      ref={elementRef}
      style={{
        background: selected ? "var(--gray-a3)" : undefined,
        ...style,
      }}
      {...rest}
    />
  );
}

/** The kit's justify hook for a cell aligned by its column. */
function justifyOf(
  align: CSSProperties["textAlign"]
): "start" | "center" | "end" | undefined {
  return align === "start" || align === "center" || align === "end"
    ? align
    : undefined;
}

/** A body or summary cell, justified as its column; actions end the row. */
export function Cell({ kind, ...rest }: Readonly<KitDesktopCellProps>) {
  "use no memo";
  if (kind === "actions" && rest["data-adapttable-part"] === "actions-cell")
    return <Table.Cell justify="end" {...rest} />;
  return <Table.Cell justify={justifyOf(rest.style?.textAlign)} {...rest} />;
}

/** A header cell, justified as its column; the actions header ends its row. */
function HeaderCell({
  kind,
  railWidth: _railWidth,
  ...rest
}: Readonly<KitDesktopHeaderCellProps>) {
  "use no memo";
  if (kind === "actions")
    return <Table.ColumnHeaderCell justify="end" {...rest} />;
  return (
    <Table.ColumnHeaderCell
      justify={justifyOf(rest.style?.textAlign)}
      {...rest}
    />
  );
}

const SUMMARY_FOOT: CSSProperties = { verticalAlign: "inherit" };

function Foot(
  props: Readonly<{ "data-adapttable-part": string; children: ReactNode }>
) {
  "use no memo";
  return <tfoot style={SUMMARY_FOOT} {...props} />;
}

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

const SORT_BUTTON: CSSProperties = {
  cursor: "pointer",
  font: "inherit",
  color: "inherit",
  background: "none",
  border: 0,
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
};

const SORT_INDEX: CSSProperties = {
  borderRadius: "9999px",
  padding: "0 0.4em",
  background: "var(--gray-a3)",
};

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
    <button
      type="button"
      className="adapttable-sort-btn"
      style={SORT_BUTTON}
      aria-label={buttonProps["aria-label"]}
      onClick={buttonProps.onClick}
      title={title}
    >
      {children}
      <Text as="span" aria-hidden>
        {sortArrow(active && dir ? ARIA_SORT[dir] : "none") + "︎"}
      </Text>
      {index !== undefined && (
        <Text
          as="span"
          aria-hidden
          data-sort-index={index}
          size="1"
          weight="bold"
          ml="1"
          style={SORT_INDEX}
        >
          {index}
        </Text>
      )}
    </button>
  );
}

/** Desktop Base UI table. */
export const DesktopTable = /* @__PURE__ */ createDesktopTable<{
  readonly size: TableSize;
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
    { tableProps, tableStyle, pin, scroll }
  ) => {
    const minWidth =
      typeof tableStyle?.minWidth === "number" ? tableStyle.minWidth : 0;
    return {
      hosts: { Table: Table.Root, Row: Table.Row },
      applyHeaderRowProps: false,
      scrollBoxProps: {
        ref: (node: HTMLDivElement | null) => {
          scroll.bindScrollBox(node);
          node?.style.setProperty(
            "--adapttable-min-width",
            minWidth > 0 ? `${minWidth}px` : "0"
          );
        },
        "data-adapttable-part": undefined,
        className: STICKY_FIX_CLASS,
        style: {
          maxHeight: maxHeight == null ? undefined : `${maxHeight}px`,
          overflowX:
            maxHeight != null || pin.hasPinned || scroll.overflowing
              ? "auto"
              : undefined,
          overflowY: maxHeight == null ? undefined : "auto",
        },
      },
      beforeTable: <style>{STICKY_FIX_CSS}</style>,
      tableProps: {
        size,
        variant: "surface",
        "data-size": size,
        className,
        "aria-label": tableProps["aria-label"],
        dir: undefined,
        style: undefined,
        tableStyle: tableStyle
          ? { tableLayout: tableStyle.tableLayout, width: tableStyle.width }
          : undefined,
      },
    };
  },
});
