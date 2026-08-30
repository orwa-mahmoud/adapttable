/**
 * Row reordering — `@adapttable/<kit>/row-reorder`.
 *
 * The factory and the hook that implements it ship together on this entry, so
 * a table that never imports it never carries the drag state machine, its
 * keyboard handling or its announcements. Nothing in the base graph reaches
 * this module.
 */
import type { ReactNode } from "react";

import {
  type RowReorderHandler,
  type RowReorderLabels,
  useRowReorder,
} from "../rows/rowReorder";
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
}

/** What the state machine speaks, before the table has resolved its labels. */
type Announcements = Pick<
  RowReorderLabels,
  "rowLifted" | "rowMoved" | "rowReorderCancelled"
>;

const FALLBACK: Announcements = {
  rowLifted: (position) => `Row lifted, position ${String(position)}`,
  rowMoved: (from, to) => `Row moved from ${String(from)} to ${String(to)}`,
  rowReorderCancelled: "Reorder cancelled",
};

/**
 * Read the announcement labels off whatever the table resolved.
 *
 * They are only ever used to speak — inside a commit, a lift or a cancel — so
 * they are read at that moment rather than captured at mount, which is what
 * lets this provider sit above the chrome that resolves them.
 */
function labelsFrom(
  read: () => Readonly<Record<string, unknown>> | undefined
): Announcements {
  const of = <K extends keyof Announcements>(key: K): Announcements[K] =>
    (read()?.[key] ?? FALLBACK[key]) as Announcements[K];
  return {
    rowLifted: (position) => of("rowLifted")(position),
    rowMoved: (from, to) => of("rowMoved")(from, to),
    get rowReorderCancelled() {
      return of("rowReorderCancelled");
    },
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
  const { onRowReorder } = feature as RowReorderFeature<unknown>;
  const runtime = useTableRuntime();
  const state = useRowReorder<unknown>({
    enabled: true,
    onRowReorder,
    labels: labelsFrom(() => runtime.labels()),
    rowAt: (localIndex) => runtime.rowAt(localIndex),
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
  onRowReorder: RowReorderHandler<TRow>
): TableFeature<TRow> {
  return {
    id: "row-reorder",
    onRowReorder,
    provider: { Provider: RowReorderProvider },
  } as RowReorderFeature<TRow>;
}

export type { RowReorderHandler, RowReorderState } from "../rows/rowReorder";
export { ROW_REORDER } from "./rowReorderKey";
