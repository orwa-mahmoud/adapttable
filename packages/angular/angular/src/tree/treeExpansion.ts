/**
 * Which tree nodes are open, as a signal — core's expansion actions over a
 * controllable id set.
 *
 * Separate state from row expansion (a detail panel) and from group collapse
 * (a derived bucket): a table can have all three at once. Expanded rather
 * than collapsed, unlike groups: a tree starts folded, so the open set is the
 * small one.
 */
import {
  createControllableStore,
  idSetReader,
  treeExpansionActions,
} from "@adapttable/core";
import type { TreeExpansionState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import { fromStore, type MaybeSignalOptional, readMaybe } from "../store";

export type { TreeExpansionState } from "@adapttable/core/binding";

/**
 * Options for {@link injectTreeExpansion}.
 *
 * @public
 */
export interface TreeExpansionOptions {
  /** The open node ids, when the host holds them. Omit to let the table. */
  readonly expandedIds?: MaybeSignalOptional<readonly string[]>;
  /** Told the next open ids whenever a node opens or closes. */
  readonly onExpandedIdsChange?: (ids: string[]) => void;
  /** The injector whose lifetime the state follows. */
  readonly injector?: Injector;
}

/**
 * Expansion state for a tree. Every node starts closed.
 *
 * @param options - See {@link TreeExpansionOptions}.
 * @returns The state, as a signal.
 *
 * @public
 */
export function injectTreeExpansion(
  options: TreeExpansionOptions = {}
): Signal<TreeExpansionState> {
  if (!options.injector) assertInInjectionContext(injectTreeExpansion);
  const injector = options.injector ?? inject(Injector);
  const readIds = idSetReader();
  const store = createControllableStore<ReadonlySet<string>>(new Set());
  const own = fromStore(store, { injector });
  const controlled = computed(() =>
    readIds(
      options.expandedIds === undefined
        ? undefined
        : readMaybe(options.expandedIds)
    )
  );
  const { onExpandedIdsChange } = options;
  const onChange =
    onExpandedIdsChange &&
    ((next: ReadonlySet<string>) => {
      onExpandedIdsChange([...next]);
    });
  // Every action hands the store the host's current value first, so a
  // controlled toggle computes from what the host holds now.
  const control = (): void => {
    store.control({ value: untracked(controlled), onChange });
  };
  const actions = treeExpansionActions(store);
  const toggle = (id: string): void => {
    control();
    actions.toggle(id);
  };
  const expand = (id: string): void => {
    control();
    actions.expand(id);
  };
  const expandAll = (ids: readonly string[]): void => {
    control();
    actions.expandAll(ids);
  };
  const collapseAll = (): void => {
    control();
    actions.collapseAll();
  };
  return computed((): TreeExpansionState => {
    const expandedIds = controlled() ?? own();
    return {
      expandedIds,
      isExpanded: (id) => expandedIds.has(id),
      toggle,
      expand,
      expandAll,
      collapseAll,
    };
  });
}
