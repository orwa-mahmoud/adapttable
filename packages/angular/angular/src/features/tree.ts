/**
 * Tree rows: the `tree()` feature and its live model — which nodes are open,
 * which are fetching their children, and the hierarchy walked from the rows.
 */
import {
  buildTreeEntries,
  closeFailedTreeNode,
  type TableSource,
  toggleTreeNode,
  treeColumnKey,
  type TreeEntry,
  treeExportExpandedIds,
} from "@adapttable/core";
import {
  coreTree,
  hasLoadedChildren,
  type TreeExpansionState,
} from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import type { DataTable } from "../dataTable";
import { type AdaptTableFeature, featureOptionsOf } from "../featureHost";
import type { MaybeSignal } from "../store";
import { injectLazyChildren } from "../tree/lazyChildren";
import { injectTreeExpansion } from "../tree/treeExpansion";

/**
 * Options for {@link tree}.
 *
 * @public
 */
export interface TreeFeatureOptions<TRow> {
  /** A row's nested children, when the rows arrive nested. */
  readonly getChildren?: (row: TRow) => readonly TRow[] | undefined;
  /** A row's parent id, when the rows arrive flat. */
  readonly getParentId?: (row: TRow) => string | undefined;
  /** Whether a row has children, loaded or not — for lazy trees. */
  readonly hasChildren?: (row: TRow) => boolean;
  /** The column that carries the chevron. Defaults to the first one shown. */
  readonly treeColumn?: string;
  /**
   * Fetch a node's children when it opens. Resolve once they are in the rows
   * the table reads.
   */
  readonly onLoadChildren?: (row: TRow) => void | Promise<void>;
  /**
   * The host's open node ids. Pass a signal to follow changes; clear with `[]`.
   */
  readonly expandedIds?: MaybeSignal<readonly string[]>;
  /** Told the next open ids whenever a node opens or closes. */
  readonly onExpandedIdsChange?: (ids: string[]) => void;
}

/**
 * Render rows as an expandable tree.
 *
 * @param options - See {@link TreeFeatureOptions}.
 * @returns The feature.
 *
 * @public
 */
export function tree<TRow>(
  options: TreeFeatureOptions<TRow> = {}
): AdaptTableFeature {
  return coreTree<unknown>({ ...options });
}

/**
 * The live tree while `tree()` is composed.
 *
 * @public
 */
export interface TableTree<TRow> {
  /** The walked hierarchy the reader sees, in render order. */
  readonly entries: readonly TreeEntry<TRow>[];
  /** Every loaded node open — what an export of the whole tree walks. */
  readonly allEntries: readonly TreeEntry<TRow>[];
  /** Which nodes are open; `toggle` fetches a node's children as it opens. */
  readonly expansion: TreeExpansionState;
  /** Nodes fetching their children. */
  readonly loadingIds: ReadonlySet<string>;
  /** Nodes whose last fetch failed. */
  readonly failedIds: ReadonlySet<string>;
  /** The column that carries the chevron. */
  readonly columnKey: string | undefined;
}

/**
 * Options for {@link injectTree}.
 *
 * @public
 */
export interface TreeOptions<TRow> {
  /** The headless table: its shown columns and row identity. */
  readonly table: Pick<DataTable<TRow>, "columns" | "rowKey">;
  /** The live source. */
  readonly source: Signal<TableSource<TRow>>;
  /** The composed features; the tree arms on `tree`. */
  readonly features: readonly AdaptTableFeature[];
  /** The injector to run in. */
  readonly injector?: Injector;
}

/**
 * The live tree while `tree()` is composed, `undefined` when it is not. The
 * signal holds `undefined` while the rows are not tree-shaped — neither
 * `getChildren` nor `getParentId` given.
 *
 * @param options - See {@link TreeOptions}.
 * @returns The model as a signal, or `undefined` when the tree is not composed.
 *
 * @public
 */
export function injectTree<TRow>(
  options: TreeOptions<TRow>
): Signal<TableTree<TRow> | undefined> | undefined {
  const { features, table, source } = options;
  if (!features.some((feature) => feature.id === "tree")) return undefined;
  if (!options.injector) assertInInjectionContext(injectTree);
  const injector = options.injector ?? inject(Injector);
  const declared = featureOptionsOf(features) as TreeFeatureOptions<TRow>;
  const { getChildren, getParentId, hasChildren } = declared;
  const rowKey = (row: TRow): string => table.rowKey(row);

  const expansion = injectTreeExpansion({
    expandedIds: declared.expandedIds,
    onExpandedIdsChange: declared.onExpandedIdsChange,
    injector,
  });
  const lazy = injectLazyChildren<TRow>({
    onLoadChildren: declared.onLoadChildren,
    hasLoadedChildren: (row) =>
      hasLoadedChildren(row, untracked(source).rows, {
        getChildren,
        getParentId,
        rowKey,
      }),
    getRowId: rowKey,
    // A node whose children failed to arrive closes, so the next click is a
    // retry rather than a close followed by an open.
    onLoadFailed: (_row, id) => {
      closeFailedTreeNode(untracked(expansion), id);
    },
    injector,
  });
  if (getChildren === undefined && getParentId === undefined) {
    return computed(() => undefined);
  }

  const rows = computed(() => source().rows);
  const entries = computed(() =>
    buildTreeEntries({
      rows: rows(),
      getRowId: rowKey,
      expandedIds: expansion().expandedIds,
      loadingIds: lazy().loadingIds,
      getChildren,
      getParentId,
      hasChildren,
    })
  );
  const allEntries = computed(() =>
    buildTreeEntries({
      rows: rows(),
      getRowId: rowKey,
      expandedIds: treeExportExpandedIds(entries()),
      getChildren,
      getParentId,
      hasChildren,
    })
  );
  const columnKey = computed(() =>
    treeColumnKey(table.columns(), declared.treeColumn)
  );
  return computed((): TableTree<TRow> => {
    const open = expansion();
    const { loadingIds, failedIds, loadIfNeeded } = lazy();
    return {
      entries: entries(),
      allEntries: allEntries(),
      expansion: {
        ...open,
        toggle: (id) => {
          toggleTreeNode(untracked(entries), id, {
            loadIfNeeded,
            toggle: open.toggle,
          });
        },
      },
      loadingIds,
      failedIds,
      columnKey: columnKey(),
    };
  });
}
