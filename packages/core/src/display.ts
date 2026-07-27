import type { CSSProperties } from "react";

import {
  edgePinStyle,
  type PinLeads,
  pinnedCellStyle,
  type PinOffset,
  type PinSide,
} from "./columns/useColumnLayout";
import type { ColumnDef } from "./types";

/**
 * Kit-independent display helpers shared by every adapter's table chrome —
 * logical alignment, the sort-indicator glyph, sticky pinned-cell styles, and
 * the row-memo guard. Centralising them keeps the adapters' render files from
 * duplicating the same pure logic.
 */

/**
 * Pinned data-cell sticky style with an opaque `background` so scrolled columns
 * don't bleed through the pinned ones. Adapters pass their kit's surface
 * background token as `bg`; a raw `style` object keeps the pixel insets the
 * core layout computes from being mangled by a kit's prop-to-spacing scale.
 */
export function pinnedDataCellStyle(
  pin: PinOffset | undefined,
  z: number,
  leads: PinLeads,
  bg: string
): CSSProperties | undefined {
  const style = pinnedCellStyle(pin, z, leads);
  return style ? { ...style, background: bg } : undefined;
}

/**
 * Sticky style for a non-data edge cell (expand chevron, selection, actions):
 * flush to its side when a data column on that side is pinned. `shift` insets a
 * left-edge cell past the leading expansion column so the chevron and the
 * selection checkbox pin side by side.
 */
export function pinnedEdgeCellStyle(
  side: PinSide,
  active: boolean,
  z: number,
  bg: string,
  shift = 0
): CSSProperties | undefined {
  const pin = edgePinStyle(side, active, z);
  if (!pin) return undefined;
  const style: CSSProperties = { ...pin, background: bg };
  if (shift > 0) style.insetInlineStart = shift;
  return style;
}

/**
 * The row-prop keys (other than the kit's own accent token) that change a
 * desktop row's visuals — the memo guard re-renders a row only when one of
 * these differs. Each adapter appends its theming key (`accentColor`)
 * to this shared base.
 */
export const SHARED_DESKTOP_ROW_KEYS = [
  "row",
  "id",
  "index",
  "selected",
  "expanded",
  "size",
  "dir",
  "columns",
  "columnWidths",
  "pinSignature",
  "className",
  "labels",
  "hasSelection",
  "expandable",
  "showActions",
  "hasRowClick",
  "columnSpan",
] as const;

/** Shallow-equal two objects across a fixed key set (the row-memo guard). */
export function shallowEqualByKeys<T>(
  keys: readonly (keyof T)[],
  prev: Readonly<T>,
  next: Readonly<T>
): boolean {
  return keys.every((key) => prev[key] === next[key]);
}

/**
 * Map a column's logical alignment onto the `"start" | "center" | "end"`
 * value every kit's cell/justify prop accepts. `undefined` defaults to start.
 */
export function logicalAlign(
  align: ColumnDef<unknown>["align"]
): "start" | "center" | "end" {
  if (align === "center") return "center";
  if (align === "end") return "end";
  return "start";
}

/**
 * Header sort indicator text derived from a cell's computed sort state
 * (`aria-sort` value): `↑` ascending, `↓` descending, `↕` unsorted. Kits that
 * render the bare arrows as emoji (e.g. Radix Themes' font) append a
 * text-presentation selector on top of this base string.
 */
export function sortArrow(sort: unknown): string {
  if (sort === "ascending") return " ↑";
  if (sort === "descending") return " ↓";
  return " ↕";
}
