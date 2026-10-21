import type { CSSProperties, ReactElement, ReactNode } from "react";

const FRAME: CSSProperties = { display: "grid", minWidth: 0 };

// The display keeps the cell's size while the editor is open: it is still laid
// out, so the column and the row measure the same content they did a moment
// ago, and it is neither seen, heard nor reachable.
const HOLD: CSSProperties = {
  gridRow: "1",
  gridColumn: "1",
  visibility: "hidden",
  opacity: 0,
  pointerEvents: "none",
};

// The editor fills the space the display holds and adds no width of its own,
// so opening it never reflows the column. It can still grow the row when it is
// taller than the display, rather than spill over the row below.
const LAYER: CSSProperties = {
  gridRow: "1",
  gridColumn: "1",
  alignSelf: "center",
  minWidth: 0,
  contain: "inline-size",
};

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
      <span style={LAYER}>{props.children}</span>
    </span>
  );
}
