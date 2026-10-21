import type { CSSProperties, ReactElement, ReactNode } from "react";

const FRAME: CSSProperties = { display: "grid", minWidth: 0 };

// The idle cell keeps its size while the editor is open: it is still laid out,
// so the column and the row measure the same content they did a moment ago,
// and it is neither seen, heard nor reachable. A grid, so the idle control is
// laid out as a block, as it is in the cell, with no line box around it.
const HOLD: CSSProperties = {
  display: "grid",
  gridRow: "1",
  gridColumn: "1",
  visibility: "hidden",
  opacity: 0,
  pointerEvents: "none",
};

// The editor fills the space the display holds and adds no width of its own,
// so opening it never reflows the column.
const LAYER: CSSProperties = {
  gridRow: "1",
  gridColumn: "1",
  alignSelf: "center",
  minWidth: 0,
  contain: "inline-size",
};

/**
 * Let the editor's layer reach into its table cell's block padding, so an
 * editor taller than one line of text still fits the row it opened in. The
 * row grows only when the editor is taller than the whole cell.
 */
function bleedIntoCellPadding(layer: HTMLElement | null): void {
  const cell = layer?.closest("td, th");
  if (!layer || !cell) return;
  const padding = getComputedStyle(cell);
  layer.style.marginTop = `-${padding.paddingTop}`;
  layer.style.marginBottom = `-${padding.paddingBottom}`;
}

/**
 * The cell's geometry while an editor replaces its display.
 *
 * @param props - The idle display, and the editor with its messages.
 * @returns The two layers in one grid cell.
 */
export function EditingCellFrame(
  props: Readonly<{ display: ReactNode; children: ReactNode }>
): ReactElement {
  return (
    <span style={FRAME}>
      <span aria-hidden="true" style={HOLD}>
        {props.display}
      </span>
      <span ref={bleedIntoCellPadding} style={LAYER}>
        {props.children}
      </span>
    </span>
  );
}
