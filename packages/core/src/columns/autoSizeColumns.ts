/**
 * Sizing a column to what is actually in it.
 *
 * A width nobody chose is a width nobody likes: the default is the same for a
 * column of two-letter codes and one of email addresses, and the fix — dragging
 * every handle — is the kind of work a table should do for you. Double-clicking
 * a resize handle sizes that column to its content; a menu action does the lot.
 *
 * Measurement comes from the DOM rather than from the data, because the data is
 * not what has a width: a cell renders a badge, an avatar and a name, and the
 * only honest answer to "how wide is this column" is what the browser laid out.
 * That means auto-sizing measures the RENDERED rows — the page, or the window
 * under virtualization — which is the same set the reader is looking at.
 */
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from "./columnResize";

/** Breathing room added to the widest cell so text never touches the edge. */
const CONTENT_PADDING = 24;

/** Sub-pixel slack: `scrollWidth === clientWidth` is already a fit. */
const CLIP_EPSILON = 1;

/**
 * True content width of a cell that already fits in its box.
 *
 * `scrollWidth` equals the box once the column is wide enough, so using it
 * again would grow forever (`+ padding` on every click). A max-content probe
 * of the cell's children is the width a second click should keep.
 */
function intrinsicContentWidth(cell: HTMLElement): number {
  if (typeof document === "undefined" || !document.body) return 0;
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.height = "auto";
  probe.style.width = "max-content";
  probe.style.maxWidth = "none";
  probe.style.whiteSpace = "normal";
  probe.innerHTML = cell.innerHTML;
  document.body.appendChild(probe);
  const width = probe.scrollWidth;
  probe.remove();
  return width;
}

/** Width this cell needs, including breathing room when content was clipped. */
function cellNeededWidth(cell: HTMLElement): number {
  const scroll = cell.scrollWidth;
  const client = cell.clientWidth;
  if (scroll > client + CLIP_EPSILON) {
    return scroll + CONTENT_PADDING;
  }
  const intrinsic = intrinsicContentWidth(cell);
  if (intrinsic > 0) return intrinsic + CONTENT_PADDING;
  return scroll;
}

/**
 * The width a column needs for its widest rendered cell.
 *
 * Cells are found by the `data-column-key` every adapter's cells carry, so this
 * needs no per-kit knowledge and works the same in a table of divs.
 *
 * @param root - The table element (or any ancestor of its cells).
 * @param key - The column key to measure.
 * @returns The width in pixels, clamped to the resize bounds, or `null` when
 *   the column has no cells on screen to measure.
 *
 * @internal
 */
export function measureColumnWidth(
  root: Element | null,
  key: string
): number | null {
  if (!root) return null;
  const cells = root.querySelectorAll<HTMLElement>(
    `[data-column-key="${CSS.escape(key)}"]`
  );
  if (cells.length === 0) return null;
  let widest = 0;
  for (const cell of cells) {
    widest = Math.max(widest, cellNeededWidth(cell));
  }
  if (widest === 0) return null;
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, widest));
}

/**
 * Size every rendered column to its content.
 *
 * @param root - The table element.
 * @param keys - The columns to size, in any order.
 * @param setWidth - The layout mutator that persists each width.
 * @returns How many columns were sized — zero when nothing was measurable.
 *
 * @internal
 */
export function autoSizeColumns(
  root: Element | null,
  keys: readonly string[],
  setWidth: (key: string, width: number) => void
): number {
  let sized = 0;
  for (const key of keys) {
    const width = measureColumnWidth(root, key);
    if (width === null) continue;
    setWidth(key, width);
    sized++;
  }
  return sized;
}
