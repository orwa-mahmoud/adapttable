/**
 * Build the live {@link TableRuntime} Angular Chrome reads from a table and
 * its source — published through core's {@link TableRuntimePublisher}, the
 * same path React's chrome extras gate uses.
 */
import {
  type BulkAction,
  type GroupedFlatEntry,
  type RowAction,
  type TableRuntime,
  type TableSource,
} from "@adapttable/core";
import {
  type RuntimeChromeInput,
  TableRuntimePublisher,
} from "@adapttable/core/binding";
import { computed, type Signal, untracked } from "@angular/core";

import type { DataTable } from "../dataTable";
import type { AdaptTableFeature } from "../featureHost";

/**
 * The chrome fields {@link TableRuntimePublisher} needs from an Angular
 * {@link DataTable} and its live source.
 */
function chromeFrom<TRow>(
  table: DataTable<TRow>,
  source: TableSource<TRow>,
  grouping: RuntimeGrouping<TRow> | undefined,
  options: RuntimeTableOptions<TRow>
): RuntimeChromeInput<TRow> {
  const layout = table.layout();
  return {
    source,
    grouping,
    tree: options.tree,
    filterDefs: options.filterDefs,
    filterRegistry: options.filterRegistry,
    columnLayoutLive: options.columnLayoutLive,
    rowPinning: options.rowPinning,
    editing: options.editing,
    getRowId: (row) => table.rowKey(row),
    allColumns: table.allColumns(),
    columnLayout: {
      visibleColumns: layout.visibleColumns,
      state: layout.state,
      setHidden: layout.setHidden,
      move: layout.move,
      setOrder: layout.setOrder,
      setPinned: layout.setPinned,
    },
    table: {
      selection: options.selection,
      labels: table.labels(),
    },
  };
}

/**
 * The grouped entries a table renders, when grouping is on.
 *
 * @public
 */
export interface RuntimeGrouping<TRow> {
  /** Group headers and leaves in render order. */
  readonly entries: readonly GroupedFlatEntry<TRow>[];
}

/**
 * The optional channels a kit publishes after assembling its live chrome.
 * Values are read reactively, so capabilities disappear when their owner does.
 *
 * @public
 */
export interface RuntimeTableOptions<TRow> extends Pick<
  RuntimeChromeInput<TRow>,
  | "filterDefs"
  | "filterRegistry"
  | "columnLayoutLive"
  | "tree"
  | "rowPinning"
  | "editing"
> {
  /** Live selection, only when the table owns a selection channel. */
  readonly selection?: Exclude<
    RuntimeChromeInput<TRow>["table"]["selection"],
    undefined
  >;
  /** Host actions, excluding the built-in pin and mutation controls. */
  readonly rowActions?: readonly RowAction<TRow>[];
  /** Host bulk actions, including when their bar is temporarily hidden. */
  readonly bulkActions?: readonly BulkAction[];
}

/**
 * Build the live {@link TableRuntime} a grouping panel or reorder controller
 * reads. One publisher per source engine keeps the neutral table stable across
 * ordinary updates. Replacing the engine starts a new reader lifecycle. With
 * `grouping`, the rows the runtime reads are the grouped leaves in render order.
 *
 * Pass `options` to project filters, selection, live column layout, tree
 * rows, pinning, editing and the host's actions. The publisher retains one
 * neutral table while each read observes the latest reactive channels.
 *
 * @public
 */
export function tableRuntimeFor<TRow>(
  table: DataTable<TRow>,
  source: Signal<TableSource<TRow>>,
  features: readonly AdaptTableFeature[],
  grouping?: Signal<RuntimeGrouping<TRow> | undefined>,
  options?: Signal<RuntimeTableOptions<TRow>>
): TableRuntime<TRow> {
  const featureIds = features.map(
    (feature, index) => feature.id ?? `feature-${String(index)}`
  );
  let publisher = new TableRuntimePublisher<TRow>();
  let publishedEngine: TableSource<TRow>["tableEngine"];
  const frame = computed(() => {
    const current: RuntimeTableOptions<TRow> = options?.() ?? {};
    return {
      chrome: chromeFrom(table, source(), grouping?.(), current),
      actions: {
        rowActions: current.rowActions,
        bulkActions: current.bulkActions,
      },
    };
  });
  const publish = () => {
    // Track only the assembled frame, not state read by downstream engine
    // listeners while the publisher refreshes its neutral view.
    const current = frame();
    return untracked(() => {
      const engine = current.chrome.source.tableEngine;
      if (engine !== publishedEngine) {
        // The neutral publisher belongs to the engine it first observes.
        // Release that binding when a host replaces its source, including
        // an intervening server source with no engine. The source itself
        // owns its engine; replacing the reader must never dispose it.
        publisher = new TableRuntimePublisher<TRow>();
        publishedEngine = engine;
      }
      return publisher.update(current.chrome, current.actions);
    });
  };
  return {
    rowAt: (index) => {
      const view = publish();
      return (view.visibleRows ?? view.rows)[index];
    },
    labels: () => table.labels(),
    featureIds: () => featureIds,
    view: () => publish(),
  };
}
