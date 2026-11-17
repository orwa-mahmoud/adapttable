/** The desktop `<table>`, drawn by the binding with Radix Themes' table elements. */
import {
  createDesktopTable,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  type KitCheckboxProps,
  type KitDesktopCellProps,
  type KitDesktopHeaderCellProps,
  type KitDesktopPaint,
  type KitDesktopRowProps,
  type KitSortLabelProps,
  PIN_Z,
  pinnedEdgeCellStyle,
  sortArrow,
} from "@adapttable/react/adapter";
import { Box, Table, Text } from "@radix-ui/themes";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { Checkbox as UiCheckbox } from "./primitives";
import { RowActionButtons } from "./RowActionButtons";

type TableSize = "1" | "2" | "3";

/** Opaque background for sticky/pinned cells (the panel surface). */
const PIN_BG = "var(--color-background)";

/**
 * Make column pinning work inside Radix's `Table.Root`. Two Radix defaults
 * fight `position: sticky`:
 *
 *  1. the `surface` variant sets `overflow: hidden` on the inner `<table>`,
 *     turning the table into its own (non-scrolling) sticky scroll-context;
 *  2. `Table.Root` wraps the table in its OWN horizontal ScrollArea — so the
 *     scroll container is Radix's viewport, not our wrapper.
 *
 * So the table must be the element that overflows that viewport: we restore
 * `overflow: visible` on the table AND move the fixed-column `min-width` onto
 * it (via the `--adapttable-min-width` custom property the wrapper sets). The
 * pinned/edge cells then stick against Radix's scrolling viewport. The
 * two-class descendant selector outranks Radix's single-class rule, so no
 * `!important` is needed.
 */
const STICKY_FIX_CLASS = "adapttable-radix-scroll";

/**
 * Fifth Radix quirk: `Table.Root`'s ScrollArea is ALWAYS a sticky containing
 * block. The viewport writes `overflowX/Y: hidden|scroll` as *inline* styles,
 * and `.rt-ScrollAreaRoot` is `overflow: hidden`. A page-level `stickyTop`
 * (nav, plus the toolbar we pin with the header) is then an offset *inside*
 * that box — the header drops into the first rows, and scrolling the page
 * carries it away.
 *
 * Neutralize that ScrollArea on EVERY table, not only the page-stick path.
 * The wrapper is the scroller when the table is wide or pinned; leaving
 * Radix's viewport as a second scroller fights scrollbar gutters until
 * React throws "Maximum update depth exceeded" (Feature Lab Rows — the
 * extra reorder column is enough to sit on that edge). `!important` is
 * required: the viewport overflow is inline, not a class. The page-stick
 * class still marks "header uses the window offset"; it no longer owns
 * the overflow override.
 */
const PAGE_STICK_CLASS = "adapttable-radix-page-stick";

/**
 * Fourth quirk, and the reason `fitColumns` needs a class here: `Table.Root`
 * renders the real `<table>` inside a ScrollArea, so a style on the root lands
 * on the wrapper. The fitted layout has to reach the table itself.
 */
const FIT_CLASS = "adapttable-radix-fit";

const STICKY_FIX_CSS =
  `.${STICKY_FIX_CLASS} .rt-TableRootTable{overflow:visible;min-width:var(--adapttable-min-width,0)}` +
  `.${FIT_CLASS} .rt-TableRootTable{table-layout:fixed;width:100%}` +
  `.${STICKY_FIX_CLASS} .rt-ScrollAreaRoot{overflow:visible;height:auto}` +
  `.${STICKY_FIX_CLASS} .rt-ScrollAreaViewport{overflow:visible!important;height:auto}` +
  `.${STICKY_FIX_CLASS} .rt-ScrollAreaScrollbar{display:none}` +
  `.rt-TableRoot[dir="rtl"] .rt-ScrollAreaRoot,.rt-TableRoot[dir="rtl"] .rt-ScrollAreaViewport{direction:rtl}` +
  `.rt-TableRoot[dir="rtl"] .rt-r-ta-left{text-align:right}` +
  `.rt-TableRoot[dir="rtl"] .rt-r-ta-right{text-align:left}`;

/** A header that sticks over the rows, on the page background. */
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
    selectedCell: { background: "var(--accent-a3)" },
    // A pinned total reads in the theme's bold weight.
    summaryCell: { fontWeight: "var(--font-weight-bold)" },
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
export function Cell({
  kind,
  width: _width,
  ...rest
}: Readonly<KitDesktopCellProps>) {
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
      className="rt-reset"
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

/**
 * Stable element types. An inline host is a new component every render,
 * which remounts the table and retriggers scroll measurement.
 */
function RadixScrollHost(props: ComponentProps<typeof Box>) {
  "use no memo";
  return <Box {...props} />;
}

function RadixTableHost(props: ComponentProps<typeof Table.Root>) {
  "use no memo";
  return <Table.Root {...props} />;
}

function RadixHeadHost(props: ComponentProps<typeof Table.Header>) {
  "use no memo";
  return <Table.Header {...props} />;
}

function RadixBodyHost(props: ComponentProps<typeof Table.Body>) {
  "use no memo";
  return <Table.Body {...props} />;
}

function RadixRowHost(props: ComponentProps<typeof Table.Row>) {
  "use no memo";
  return <Table.Row {...props} />;
}

const HOSTS = {
  ScrollBox: RadixScrollHost,
  Table: RadixTableHost,
  Head: RadixHeadHost,
  Body: RadixBodyHost,
  Row: RadixRowHost,
};

/** The selection checkboxes, at Radix's default size. */
function Checkbox({
  checked,
  onCheckedChange,
  label: _label,
  ...rest
}: Readonly<KitCheckboxProps>) {
  "use no memo";
  return (
    <UiCheckbox
      checked={checked}
      onToggle={() => onCheckedChange(!checked)}
      {...rest}
    />
  );
}

/** Desktop Radix Themes table. */
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
    { size, className, maxHeight, stickyHeader, fitColumns, dir },
    { tableProps, gridProps, tableStyle, pin, scroll }
  ) => {
    const minWidth =
      typeof tableStyle?.minWidth === "number" ? tableStyle.minWidth : 0;
    const pageStick = Boolean(stickyHeader) && !pin.inScrollBox;
    const tableRootRef = useRef<HTMLDivElement | null>(null);
    const nameTableElement = useCallback((node: HTMLDivElement | null) => {
      tableRootRef.current = node;
      node
        ?.querySelector("table")
        ?.setAttribute("data-adapttable-part", "table");
    }, []);
    // Radix's `Table.Root` spreads every prop it does not recognise onto its
    // own scroll wrapper, so the grid semantics would land on a div with no
    // role. There is no prop route to the inner element, so they are mirrored
    // onto the `<table>` the wrapper owns and kept in step as the window
    // moves. The focus container ref is withheld too: Radix takes a single
    // ref, which reaches the inner element here, so the effect hands core the
    // same node.
    const {
      role: gridRole,
      "aria-rowcount": gridRowCount,
      "aria-colcount": gridColCount,
      ref: focusContainerRef,
      ...wrapperGridProps
    } = gridProps as Record<string, unknown> & {
      role?: string;
      "aria-rowcount"?: number;
      "aria-colcount"?: number;
      ref?: (node: HTMLElement | null) => void;
    };
    const gridLabel = tableProps["aria-label"];
    useEffect(() => {
      const root = tableRootRef.current;
      focusContainerRef?.(root);
      const element = root?.querySelector("table");
      if (!element) return;
      const apply = (
        name: string,
        value: string | number | undefined
      ): void => {
        if (value === undefined) element.removeAttribute(name);
        else element.setAttribute(name, String(value));
      };
      apply("role", gridRole);
      apply("aria-rowcount", gridRowCount);
      apply("aria-colcount", gridColCount);
      apply("aria-label", gridLabel);
    }, [focusContainerRef, gridRole, gridRowCount, gridColCount, gridLabel]);
    return {
      hosts: HOSTS,
      applyHeaderRowProps: false,
      beforeTable: <style>{STICKY_FIX_CSS}</style>,
      scrollBoxProps: {
        ref: (node: HTMLDivElement | null) => {
          scroll.bindScrollBox(node);
          node?.style.setProperty(
            "--adapttable-min-width",
            minWidth > 0 ? `${minWidth}px` : "0"
          );
        },
        className: [STICKY_FIX_CLASS, pageStick ? PAGE_STICK_CLASS : ""]
          .filter(Boolean)
          .join(" "),
        style: {
          maxHeight: maxHeight == null ? undefined : `${maxHeight}px`,
          overflowX:
            maxHeight != null || pin.hasPinned || scroll.overflowing
              ? "auto"
              : undefined,
          overflowY: maxHeight == null ? undefined : "auto",
        },
      },
      tableProps: {
        ...wrapperGridProps,
        size,
        variant: "ghost",
        dir,
        "data-size": size,
        className: [className, fitColumns === true ? FIT_CLASS : ""]
          .filter(Boolean)
          .join(" "),
        ref: nameTableElement,
        role: undefined,
        "aria-rowcount": undefined,
        "aria-colcount": undefined,
        "aria-label": undefined,
        style: undefined,
        "data-adapttable-part": gridRole === "grid" ? "grid" : undefined,
      },
    };
  },
});
