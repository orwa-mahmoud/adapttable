/**
 * Row reorder wired to a live table: the controller options a binding hands
 * {@link createRowReorderController} when the feature sits above the table
 * and reads it through {@link TableRuntime}.
 *
 * The move menu and grouped or tree drops are resolved against the view at
 * the moment of the gesture, and a cross-boundary move is dispatched to the
 * host's group or tree handler. The table never writes to the rows.
 */
import type { TableRuntime, TableRuntimeView } from "../features/tableRuntime";
import type { RowMoveRequest, RowReorderOptions } from "./rowMove";
import {
  resolveRowMove,
  rowMoveMenu,
  type RowMoveView,
  rowReorderAnnouncements,
  type RowReorderControllerOptions,
  type RowReorderHandler,
} from "./rowReorderEngine";

/**
 * The runtime view, narrowed to the grouped and tree shapes a move reads.
 *
 * @typeParam TRow - The row type.
 * @param view - The live view.
 * @returns The move view.
 *
 * @public
 */
export function rowMoveView<TRow>(
  view: TableRuntimeView<TRow>
): RowMoveView<TRow> {
  return {
    getRowId: view.getRowId,
    rowLabel: view.rowLabel,
    sortBy: view.sortBy,
    grouping: view.grouping,
    tree: view.tree as RowMoveView<TRow>["tree"],
  };
}

/**
 * Hand a cross-boundary move to the host's handler for its kind: a group move
 * to `onGroupMove`, a tree move to `onTreeMove`.
 *
 * @typeParam TRow - The row type.
 * @param request - The confirmed move.
 * @param options - The host's reorder options.
 *
 * @public
 */
export function dispatchRowMove<TRow>(
  request: RowMoveRequest<TRow>,
  options: RowReorderOptions<TRow> | undefined
): void {
  if (request.kind === "group") {
    options?.onGroupMove?.(
      request.row,
      request.fromGroup,
      request.toGroup,
      request.position
    );
  } else {
    options?.onTreeMove?.(
      request.row,
      request.fromParent,
      request.toParent,
      request.position
    );
  }
}

/**
 * The reorder controller's options for a feature reading the table through
 * its runtime.
 *
 * @typeParam TRow - The row type.
 * @param runtime - The live table.
 * @param onRowReorder - The host's write for a reorder.
 * @param options - The host's move policy and cross-boundary handlers.
 * @returns Options for {@link createRowReorderController}.
 *
 * @public
 */
export function rowReorderRuntimeOptions<TRow>(
  runtime: TableRuntime<TRow>,
  onRowReorder: RowReorderHandler<TRow>,
  options?: RowReorderOptions<TRow>
): RowReorderControllerOptions<TRow> {
  const labels = rowReorderAnnouncements(() => runtime.labels());
  return {
    enabled: true,
    onRowReorder,
    movePolicy: options?.movePolicy,
    confirmMove: options?.confirmMove,
    onRowMove: (request) => {
      dispatchRowMove(request, options);
    },
    getMoveMenu: (row) => {
      const view = runtime.view();
      if (!view) return undefined;
      return rowMoveMenu(rowMoveView(view), row, options, labels);
    },
    resolveMove: (row, target, position) => {
      const view = runtime.view();
      if (!view) return undefined;
      return resolveRowMove(
        rowMoveView(view),
        { row, target, position },
        options,
        labels
      );
    },
    labels,
    rowAt: (localIndex) => runtime.rowAt(localIndex),
    getRowId: (row) => runtime.view()?.getRowId(row) ?? "",
  };
}
