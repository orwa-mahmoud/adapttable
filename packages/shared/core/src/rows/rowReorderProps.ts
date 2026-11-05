/**
 * Attribute projection for a reorder drag.
 *
 * The session decides what is lifted and where the pointer is. This maps that
 * snapshot onto the row's data attributes.
 */
import type { RowDropPosition } from "./rowMove";
import type { RowReorderSnapshot } from "./rowReorderController";

/**
 * Indicator attributes for one row: `data-dragging` on the lifted row, and
 * `data-drop` with the insertion edge on the row under the drag.
 *
 * @param state - The lifted row and the hovered index and edge.
 * @param rowId - The row's stable id.
 * @param localIndex - The row's index in the rendered window.
 * @returns The attributes.
 *
 * @public
 */
export function rowReorderRowAttributes(
  state: Pick<
    RowReorderSnapshot<unknown>,
    "lifted" | "overIndex" | "overPosition"
  >,
  rowId: string,
  localIndex: number
): { "data-dragging"?: ""; "data-drop"?: RowDropPosition } {
  const { lifted, overIndex, overPosition } = state;
  const dragging = lifted?.rowId === rowId;
  const from = lifted?.from;
  const isTarget =
    overIndex === localIndex && from !== undefined && lifted?.rowId !== rowId;
  const dropSide = from !== undefined && localIndex > from ? "after" : "before";
  return {
    "data-dragging": dragging ? "" : undefined,
    "data-drop": isTarget ? (overPosition ?? dropSide) : undefined,
  };
}
