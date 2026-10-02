/**
 * Which row groups are closed, as a signal — core's collapse actions over a
 * controllable id set.
 */
import {
  createControllableStore,
  groupCollapseActions,
  idSetReader,
} from "@adapttable/core";
import type { GroupCollapseState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  inject,
  Injector,
  type Signal,
  untracked,
} from "@angular/core";

import { fromStore, type MaybeSignalOptional, readMaybe } from "../store";

export type { GroupCollapseState } from "@adapttable/core/binding";

/**
 * Options for {@link injectGroupCollapse}.
 *
 * @public
 */
export interface GroupCollapseOptions {
  /**
   * The collapsed group ids, when the host holds them. Omit to let the table
   * hold them.
   */
  readonly collapsedGroupIds?: MaybeSignalOptional<readonly string[]>;
  /** Told the next collapsed ids whenever a group opens or closes. */
  readonly onCollapsedGroupIdsChange?: (ids: string[]) => void;
  /** The injector whose lifetime the state follows. */
  readonly injector?: Injector;
}

/**
 * Collapse state for row groups, at any depth. Groups start expanded; the
 * state is ephemeral and never written to the URL.
 *
 * @param options - See {@link GroupCollapseOptions}.
 * @returns The state, as a signal.
 *
 * @public
 */
export function injectGroupCollapse(
  options: GroupCollapseOptions = {}
): Signal<GroupCollapseState> {
  if (!options.injector) assertInInjectionContext(injectGroupCollapse);
  const injector = options.injector ?? inject(Injector);
  const readIds = idSetReader();
  const store = createControllableStore<ReadonlySet<string>>(new Set());
  const own = fromStore(store, { injector });
  const controlled = computed(() =>
    readIds(
      options.collapsedGroupIds === undefined
        ? undefined
        : readMaybe(options.collapsedGroupIds)
    )
  );
  const { onCollapsedGroupIdsChange } = options;
  const onChange =
    onCollapsedGroupIdsChange &&
    ((next: ReadonlySet<string>) => {
      onCollapsedGroupIdsChange([...next]);
    });
  // Every action hands the store the host's current value first, so a
  // controlled toggle computes from what the host holds now.
  const control = (): void => {
    store.control({ value: untracked(controlled), onChange });
  };
  const actions = groupCollapseActions(store);
  const toggle = (groupKey: string): void => {
    control();
    actions.toggle(groupKey);
  };
  const expandAll = (): void => {
    control();
    actions.expandAll();
  };
  const collapseAll = (groupKeys: readonly string[]): void => {
    control();
    actions.collapseAll(groupKeys);
  };
  const collapseToDepth = (
    depth: number,
    groups: readonly { key: string; level: number }[]
  ): void => {
    control();
    actions.collapseToDepth(depth, groups);
  };
  return computed((): GroupCollapseState => {
    const collapsedGroupIds = controlled() ?? own();
    return {
      collapsedGroupIds,
      isCollapsed: (groupKey) => collapsedGroupIds.has(groupKey),
      toggle,
      expandAll,
      collapseAll,
      collapseToDepth,
    };
  });
}
