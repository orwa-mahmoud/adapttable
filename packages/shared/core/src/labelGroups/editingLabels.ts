/**
 * The strings row and batch editing draw.
 */
import type { TableLabels } from "../types";

/**
 * The strings row and batch editing draw.
 *
 * @public
 */
export const EDITING_LABELS: Pick<
  Required<TableLabels>,
  | "pendingRows"
  | "saveAll"
  | "cancelAll"
  | "editConflict"
  | "keepMine"
  | "takeTheirs"
  | "theirsValue"
  | "noticeEditWithoutWriter"
> = {
  pendingRows: (count) =>
    count === 1 ? "1 unsaved row" : `${String(count)} unsaved rows`,
  saveAll: "Save all",
  cancelAll: "Cancel all",
  editConflict: "This row changed while you were editing",
  keepMine: "Keep mine",
  takeTheirs: "Take theirs",
  theirsValue: (value) => `Theirs: ${value}`,
  noticeEditWithoutWriter: "Editing is off — no write handler is wired.",
};
