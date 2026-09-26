/**
 * Row reordering — `@adapttable/<kit>/row-reorder`.
 *
 * The factory and the hook that implements it ship together on this entry, so
 * a table that never imports it never carries the drag state machine, its
 * keyboard handling or its announcements. Nothing in the base graph reaches
 * this module.
 */
import {
  resolveRowMove,
  rowMoveMenu,
  type RowMoveRequest,
  type RowMoveView,
  rowReorderAnnouncements,
  type RowReorderOptions,
} from "@adapttable/core";
import type { TableRuntimeView } from "@adapttable/core/binding";
import type { ReactNode } from "react";

import { type RowReorderHandler, useRowReorder } from "../rows/rowReorder";
import {
  type FeatureProviderProps,
  FeatureStateScope,
  useTableRuntime,
} from "./providers";
import { ROW_REORDER } from "./rowReorderKey";
import type { TableFeature } from "./tableFeature";

/** The composed feature, carrying the host's handler for its provider to read. */
interface RowReorderFeature<TRow> extends TableFeature<TRow> {
  readonly onRowReorder: RowReorderHandler<TRow>;
  readonly options?: RowReorderOptions<TRow>;
}

/** The runtime view, narrowed to the grouped and tree shapes a move reads. */
function moveView(view: TableRuntimeView<unknown>): RowMoveView<unknown> {
  return {
    getRowId: view.getRowId,
    rowLabel: view.rowLabel,
    sortBy: view.sortBy,
    grouping: view.grouping as RowMoveView<unknown>["grouping"],
    tree: view.tree as RowMoveView<unknown>["tree"],
  };
}

/**
 * One stable component for every `rowReorder(fn)` call — the handler arrives
 * on the feature, so calling the factory inline never remounts a drag.
 */
function RowReorderProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>): ReactNode {
  const { onRowReorder, options } = feature as RowReorderFeature<unknown>;
  const runtime = useTableRuntime();
  const labels = rowReorderAnnouncements(() => runtime.labels());
  const state = useRowReorder<unknown>({
    enabled: true,
    onRowReorder,
    movePolicy: options?.movePolicy,
    confirmMove: options?.confirmMove,
    onRowMove: (request: RowMoveRequest<unknown>) => {
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
    },
    getMoveMenu: (row) => {
      const view = runtime.view();
      if (!view) return undefined;
      return rowMoveMenu(moveView(view), row, options, labels);
    },
    resolveMove: (row, target, position) => {
      const view = runtime.view();
      if (!view) return undefined;
      return resolveRowMove(
        moveView(view),
        { row, target, position },
        options,
        labels
      );
    },
    labels,
    rowAt: (localIndex) => runtime.rowAt(localIndex),
    getRowId: (row) => runtime.view()?.getRowId(row) ?? "",
  });
  return (
    <FeatureStateScope stateKey={ROW_REORDER} value={state}>
      {children}
    </FeatureStateScope>
  );
}

/**
 * Let rows be dragged, or moved with the keyboard, into a new order.
 *
 * ```tsx
 * import { rowReorder } from "@adapttable/mantine/row-reorder";
 *
 * <DataTable features={[rowReorder((from, to) => reorder(from, to))]} … />
 * ```
 *
 * The table never writes to your rows: the handler is told what moved where
 * and the new order is yours to apply.
 *
 * @public
 */
export function rowReorder<TRow>(
  onRowReorder: RowReorderHandler<TRow>,
  options?: RowReorderOptions<TRow>
): TableFeature<TRow> {
  return {
    id: "row-reorder",
    onRowReorder,
    options,
    provider: { Provider: RowReorderProvider },
  } as RowReorderFeature<TRow>;
}

export type {
  RowReorderDecision,
  RowReorderHandler,
  RowReorderState,
} from "../rows/rowReorder";
export { ROW_REORDER } from "./rowReorderKey";
export type { RowGroupLevel, RowGroupRef } from "@adapttable/core";
export type {
  RowGroupMoveHandler,
  RowMoveConfirmHandler,
  RowMoveMenuModel,
  RowMovePolicy,
  RowMoveRequest,
  RowMoveTarget,
  RowReorderOptions,
  RowTreeMoveHandler,
  RowTreeParentRef,
} from "@adapttable/core";
export { rowDropPosition, treeMoveCreatesCycle } from "@adapttable/core";
