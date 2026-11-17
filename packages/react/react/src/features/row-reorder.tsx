/**
 * Row reordering — `@adapttable/<kit>/row-reorder`.
 *
 * The factory and the hook that implements it ship together on this entry, so
 * a table that never imports it never carries the drag state machine, its
 * keyboard handling or its announcements. Nothing in the base graph reaches
 * this module.
 */
import {
  type RowReorderOptions,
  rowReorderRuntimeOptions,
} from "@adapttable/core";
import { ROW_LABELS } from "@adapttable/core/binding";
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
  const state = useRowReorder<unknown>(
    rowReorderRuntimeOptions(runtime, onRowReorder, options)
  );
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
    labels: ROW_LABELS,
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
