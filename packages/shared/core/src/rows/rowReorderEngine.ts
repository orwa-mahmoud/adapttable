/**
 * Row reordering — the asking, never the data.
 *
 * Legality lives in `rowReorderPolicy`. The session and the host callbacks
 * live in `rowReorderController`. Attribute projection lives in
 * `rowReorderProps`. This file is the compatible facade: the public names
 * stay here, and `onRowReorder` is still the host write.
 *
 * The table never mutates the array. `from` / `to` are dataset-relative.
 */
export {
  createRowReorderController,
  isRowMovePending,
  ROW_DND_MIME,
  type RowDragEvent,
  type RowKeyEvent,
  type RowReorderActions,
  type RowReorderController,
  type RowReorderControllerOptions,
  type RowReorderSlot,
  type RowReorderSnapshot,
} from "./rowReorderController";
export {
  applyRowReorder,
  datasetIndex,
  defaultRowReorderAnnouncements,
  resolveRowMove,
  type RowMoveDrop,
  rowMoveMenu,
  type RowMoveView,
  type RowReorderAnnouncements,
  rowReorderAnnouncements,
  type RowReorderDecision,
  type RowReorderHandler,
  type RowReorderLabels,
} from "./rowReorderPolicy";
export { rowReorderRowAttributes } from "./rowReorderProps";
