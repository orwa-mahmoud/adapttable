/**
 * Sticky header, pinned edges and table width.
 *
 * Placement only: the same edges and offsets every binding already paints.
 */

import {
  edgePinStyle,
  PIN_Z,
  type PinLeads,
  type PinnedCellStyle,
  type PinOffset,
} from "../columns/columnLayoutModel";
import { fittedTableStyle } from "../columns/columnSizing";
import { tableMinWidth } from "../columns/columnWidths";
import type { ColumnMetadata } from "../contracts/columns";
import type { CssProperties } from "../style/cssProperties";
import {
  desktopEdgeHeadPin,
  desktopHeadCellGeometry,
  desktopPinSignature,
  desktopScrollBoxStyle,
} from "./chromeModel";

/* ── Sticky, scroll and width rules ────────────────────────────────── */

/**
 * The sticky header style: at the top of the scroll box when the table
 * scrolls inside one, at `stickyTop` on the page otherwise.
 *
 * @public
 */
export interface DesktopStickyPlan {
  /** Whether the table scrolls inside a bounded box. */
  readonly inScrollBox: boolean;
  /** Where a sticky header sticks. */
  readonly headerStickTop: number;
  /** Where a pinned row sits, clearing a sticky header. */
  readonly rowPinOffset: number;
  /** The header's sticky style, absent when it does not stick. */
  readonly stickyStyle:
    { position: "sticky"; top: number; zIndex: number } | undefined;
  /** Present only when the header sticks. */
  readonly stickyAttr: true | undefined;
  /** The scroll box's overflow style. */
  readonly boxStyle: ReturnType<typeof desktopScrollBoxStyle>;
}

/**
 * Where the header sticks and how the scroll box overflows.
 *
 * A `maxHeight`, a pinned column or real horizontal overflow each put the
 * table in a scroll box; inside one, a sticky header sticks at 0 and a
 * pinned row sits under the header's measured height.
 *
 * @public
 */
export function desktopStickyPlan(input: {
  readonly maxHeight: number | undefined;
  readonly hasPinned: boolean;
  readonly overflowing: boolean;
  readonly stickyHeader: boolean;
  readonly stickyTop: number;
  readonly headerHeight: number;
}): DesktopStickyPlan {
  const inScrollBox =
    input.maxHeight != null || input.hasPinned || input.overflowing;
  const headerStickTop = inScrollBox ? 0 : input.stickyTop;
  return {
    inScrollBox,
    headerStickTop,
    rowPinOffset: input.stickyHeader ? headerStickTop + input.headerHeight : 0,
    stickyStyle: input.stickyHeader
      ? { position: "sticky", top: headerStickTop, zIndex: PIN_Z.header }
      : undefined,
    stickyAttr: input.stickyHeader || undefined,
    boxStyle: desktopScrollBoxStyle(
      input.maxHeight,
      input.hasPinned || input.overflowing
    ),
  };
}

/**
 * Which edges have a pinned data column, and the pin layout's memo key.
 *
 * @public
 */
export function desktopPinEdges(
  columns: readonly { readonly key: string }[],
  pinOffset: ((key: string) => PinOffset | undefined) | undefined
): { hasStartPin: boolean; hasEndPin: boolean; signature: string } {
  return {
    hasStartPin: columns.some(
      (column) => pinOffset?.(column.key)?.side === "start"
    ),
    hasEndPin: columns.some(
      (column) => pinOffset?.(column.key)?.side === "end"
    ),
    signature: desktopPinSignature(columns, pinOffset),
  };
}

/**
 * A header cell's style: the sticky header, its column pin, its width, and
 * a positioning box when it anchors a resize handle.
 *
 * @public
 */
export function desktopHeadCellStyle(
  column: { key: string; width?: number | string },
  options: {
    pinOffset?: (key: string) => PinOffset | undefined;
    leads: PinLeads;
    columnWidths?: Readonly<Record<string, number>>;
    setWidth?: (key: string, width: number) => void;
    stickyStyle?: object;
  }
): CssProperties | undefined {
  const { pin, width, anchorsResize } = desktopHeadCellGeometry(
    column,
    options
  );
  if (!options.stickyStyle && !pin && width == null && !anchorsResize) {
    return undefined;
  }
  const merged: CssProperties = {
    ...options.stickyStyle,
    ...pin,
    ...(width != null && { width }),
  };
  if (anchorsResize && !merged.position) merged.position = "relative";
  return merged;
}

/**
 * An injected header cell's style: the sticky header plus its edge pin.
 *
 * @public
 */
export function desktopEdgeHeadStyle(
  side: "start" | "end",
  active: boolean,
  stickyStyle: object | undefined
): CssProperties | undefined {
  const edge = desktopEdgeHeadPin(side, active);
  if (!stickyStyle && !edge) return undefined;
  return { ...stickyStyle, ...edge };
}

/**
 * An injected body cell's edge pin.
 *
 * @public
 */
export function desktopEdgeBodyStyle(
  side: "start" | "end",
  active: boolean
): PinnedCellStyle | undefined {
  return edgePinStyle(side, active, PIN_Z.body);
}

/**
 * The `<table>` style: a minimum width that holds every column plus the
 * injected chrome, and the fitted layout when `fitColumns` is on. Absent
 * when neither applies.
 *
 * @public
 */
export function desktopTableStyle(
  columns: readonly ColumnMetadata<never>[],
  options: {
    readonly columnWidths: Readonly<Record<string, number>> | undefined;
    readonly extraMinWidth: number;
    readonly fitColumns: boolean | undefined;
  }
): CssProperties | undefined {
  const minWidth = tableMinWidth(columns, {
    widths: options.columnWidths,
    extra: options.extraMinWidth,
  });
  const merged: CssProperties = {
    ...(minWidth > 0 ? { minWidth } : {}),
    ...fittedTableStyle(options.fitColumns),
  };
  return Object.keys(merged).length > 0 ? merged : undefined;
}
