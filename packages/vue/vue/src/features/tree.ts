import {
  buildTreeEntries,
  closeFailedTreeNode,
  toggleTreeNode,
  treeColumnKey,
  treeExportExpandedIds,
} from "@adapttable/core";
import { coreTree, hasLoadedChildren } from "@adapttable/core/binding";
import { computed, nextTick, onScopeDispose, watchEffect } from "vue";

import { type TableTree, treeModelKey } from "../hierarchy/models";
import { projectHeadlessRows } from "../rows/headlessRowsModel";
import { useLazyChildren } from "../tree/lazyChildren";
import {
  type TreeExpansionOptions,
  useTreeExpansion,
} from "../tree/treeExpansion";
import type { FeatureMountContext, TableFeature } from "./tableFeature";
export interface TreeFeatureOptions<TRow> extends Omit<
  TreeExpansionOptions,
  "enabled"
> {
  readonly getChildren?: (row: TRow) => readonly TRow[] | undefined;
  readonly getParentId?: (row: TRow) => string | undefined;
  readonly hasChildren?: (row: TRow) => boolean;
  readonly treeColumn?: string;
  readonly onLoadChildren?: (row: TRow) => void | Promise<void>;
}
function mount<TRow>(context: FeatureMountContext<TRow>): void {
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
  });
  const options = computed(
    () => context.options.value as TreeFeatureOptions<TRow>
  );
  const expansion = useTreeExpansion(() => ({
    ...options.value,
    enabled: context.active,
  }));
  const lazy = useLazyChildren(() => ({
    enabled: context.active,
    onLoadChildren: options.value.onLoadChildren,
    hasLoadedChildren: (row) =>
      hasLoadedChildren(row, context.source.value.rows, {
        ...options.value,
        rowKey: context.table.rowKey,
      }),
    getRowId: context.table.rowKey,
    onLoadFailed: (_row, id) => {
      void nextTick(() => {
        if (!disposed && context.active.value)
          closeFailedTreeNode(expansion.value, id);
      });
    },
  }));
  const entries = computed(() =>
    buildTreeEntries({
      ...options.value,
      rows: context.source.value.rows,
      getRowId: context.table.rowKey,
      expandedIds: expansion.value.expandedIds,
      loadingIds: lazy.value.loadingIds,
    })
  );
  const allEntries = computed(() =>
    buildTreeEntries({
      ...options.value,
      rows: context.source.value.rows,
      getRowId: context.table.rowKey,
      expandedIds: treeExportExpandedIds(entries.value),
    })
  );
  const model = computed((): TableTree<TRow> | undefined => {
    if (!options.value.getChildren && !options.value.getParentId)
      return undefined;
    return {
      entries: entries.value,
      allEntries: allEntries.value,
      expansion: {
        ...expansion.value,
        toggle: (id) => {
          if (!disposed && context.active.value)
            toggleTreeNode(entries.value, id, {
              loadIfNeeded: lazy.value.loadIfNeeded,
              toggle: expansion.value.toggle,
            });
        },
      },
      loadingIds: lazy.value.loadingIds,
      failedIds: lazy.value.failedIds,
      columnKey: treeColumnKey(
        context.table.columns.value,
        options.value.treeColumn
      ),
    };
  });
  watchEffect(() => context.state.set(treeModelKey<TRow>(), model.value), {
    flush: "sync",
  });
}
/** Walk nested or parent-id rows; lazy fetching remains host owned. @public */
export function tree<TRow>(
  options: TreeFeatureOptions<TRow> = {}
): TableFeature<TRow> {
  const base = coreTree<TRow>({ ...options });
  return {
    id: base.id,
    apply: (input) => ({
      ...base.apply?.(input),
      bodyModel: projectHeadlessRows,
    }),
    mount,
  };
}
export type { TableTree } from "../hierarchy/models";
export type { LazyChildrenVueOptions } from "../tree/lazyChildren";
export { useLazyChildren } from "../tree/lazyChildren";
export type { TreeExpansionOptions } from "../tree/treeExpansion";
export { useTreeExpansion } from "../tree/treeExpansion";
