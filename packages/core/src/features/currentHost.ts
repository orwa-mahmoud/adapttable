/**
 * The feature host for ONE table, looked up from that table — never from
 * "whoever rendered last".
 *
 * A module-level stack that is pushed during render and popped on unmount
 * leaves the last table on top for every later click, and lets an inner
 * table steal the rest of the outer tree. Readers take the host from
 * {@link FeatureHostContext} (hooks) or as an argument (plain functions).
 * `currentFeatureHost` is only valid inside `runWithFeatureHost`,
 * which is how a mapper created outside the table (e.g. `aggregate()`)
 * still resolves names for the table that is invoking it.
 */
import type { Command } from "../actions/commandRegistry";
import type {
  ContextMenuItem,
  ContextMenuTarget,
} from "../actions/contextMenuModel";
import type { Aggregator } from "../aggregate/aggregate";
import type {
  ColumnMenuAction,
  ColumnMenuActionContext,
  ColumnMenuRow,
} from "../columns/columnMenuModel";
import type { CustomCellEditorRender } from "../editing/cellEditing";
import type { ExportWriter } from "../export/exportWriter";
import {
  type FilterTypeRegistry,
  type FilterTypeSpec,
  withExtendedFilterType,
  withFilterType,
} from "../filters/filterRegistry";
import type { SidePanelEntry } from "../layout/SidePanelChrome";

/**
 * Extra column-menu actions a plugin appends after the built-ins.
 *
 * @public
 */
export type ColumnMenuActionFactory<TRow = unknown> = (
  row: ColumnMenuRow<TRow>,
  ctx: ColumnMenuActionContext<TRow>
) => ColumnMenuAction | readonly ColumnMenuAction[] | undefined;

/**
 * Extra context-menu entries a plugin appends after the built-ins.
 *
 * @public
 */
export type ContextMenuItemsFactory<TRow = unknown> = (
  target: ContextMenuTarget<TRow>
) => readonly ContextMenuItem[];

/**
 * A patch {@link TableFeatureHost.extendFilterType} queued for the registry.
 *
 * @public
 */
export interface FilterTypeExtend {
  /** The filter type being extended. */
  readonly type: string;
  /** Fields to merge onto that type's spec. */
  readonly patch: Partial<FilterTypeSpec>;
}

/**
 * Registrations collected during {@link TableFeature.setup}. The public host
 * only has `register*` methods; the table reads these bags.
 *
 * @public
 */
export interface FeatureHostState<TRow = unknown> {
  /** Filter types features registered. */
  readonly filterTypes: readonly FilterTypeSpec[];
  /** Patches queued against existing filter types. */
  readonly filterExtends: readonly FilterTypeExtend[];
  /** Custom cell editors, by editor name. */
  readonly editors: ReadonlyMap<string, CustomCellEditorRender>;
  /** Aggregators, by aggregate name. */
  readonly aggregators: ReadonlyMap<string, Aggregator>;
  /** Export writers features added. */
  readonly writers: readonly ExportWriter[];
  /** Factories that add entries to the column menu. */
  readonly columnMenuActions: readonly ColumnMenuActionFactory<TRow>[];
  /** Side-panel tabs features added. */
  readonly panels: readonly SidePanelEntry[];
  /** Commands features added to the palette. */
  readonly commands: readonly Command[];
  /** Factories that add entries to the right-click menus. */
  readonly contextMenuItems: readonly ContextMenuItemsFactory<TRow>[];
}

/** Later same-key wins, so a factory that both applies and registers is one copy. */
export function appendByKey<T>(
  first: readonly T[],
  second: readonly T[],
  keyOf: (item: T) => string
): T[] {
  if (second.length === 0) return first as T[];
  const map = new Map<string, T>();
  for (const item of first) map.set(keyOf(item), item);
  for (const item of second) map.set(keyOf(item), item);
  return [...map.values()];
}

const scoped: FeatureHostState[] = [];

/**
 * Run `fn` with `host` as `currentFeatureHost`. The stack is empty
 * again when `fn` returns, so a sibling or a later click cannot see it.
 */
export function runWithFeatureHost<T>(
  host: FeatureHostState | undefined,
  fn: () => T
): T {
  if (!host) return fn();
  scoped.push(host);
  try {
    return fn();
  } finally {
    scoped.pop();
  }
}

/**
 * The host bound by `runWithFeatureHost`. Empty outside that call, so a
 * sibling table or a later click resolves its own host and never this one.
 */
export function currentFeatureHost<TRow = unknown>():
  FeatureHostState<TRow> | undefined {
  return scoped.at(-1) as FeatureHostState<TRow> | undefined;
}

/**
 * Bind a callback so every invocation sees `host` via `currentFeatureHost`.
 *
 * @public
 */
export function bindFeatureHostFn<Args extends unknown[], R>(
  host: FeatureHostState | undefined,
  fn: ((...args: Args) => R) | undefined
): ((...args: Args) => R) | undefined {
  if (!fn) return fn;
  return (...args: Args) => runWithFeatureHost(host, () => fn(...args));
}

/** Apply host `registerFilterType` / `extendFilterType` onto a registry. */
export function applyFilterExtends(
  registry: FilterTypeRegistry,
  host: FeatureHostState | undefined
): FilterTypeRegistry {
  if (!host) return registry;
  let next = registry;
  for (const spec of host.filterTypes) {
    next = withFilterType(next, spec);
  }
  for (const { type, patch } of host.filterExtends) {
    next = withExtendedFilterType(next, type, patch);
  }
  return next;
}
