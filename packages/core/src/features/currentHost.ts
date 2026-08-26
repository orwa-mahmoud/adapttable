/**
 * The live feature host for the table currently rendering.
 *
 * First-render compute (filters, summary rows, column menus) runs before
 * layout effects, so the host is assigned during render. Nested tables push
 * and pop a stack — a single slot would let the inner table steal the outer
 * one's registrations.
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

/** Extra column-menu actions a plugin appends after the built-ins. */
export type ColumnMenuActionFactory<TRow = unknown> = (
  row: ColumnMenuRow<TRow>,
  ctx: ColumnMenuActionContext<TRow>
) => ColumnMenuAction | readonly ColumnMenuAction[] | undefined;

/** Extra context-menu entries a plugin appends after the built-ins. */
export type ContextMenuItemsFactory<TRow = unknown> = (
  target: ContextMenuTarget<TRow>
) => readonly ContextMenuItem[];

/** A patch {@link TableFeatureHost.extendFilterType} queued for the registry. */
export interface FilterTypeExtend {
  readonly type: string;
  readonly patch: Partial<FilterTypeSpec>;
}

/**
 * Registrations collected during {@link TableFeature.setup}. The public host
 * only has `register*` methods; the table reads these bags.
 */
export interface FeatureHostState<TRow = unknown> {
  readonly filterTypes: readonly FilterTypeSpec[];
  readonly filterExtends: readonly FilterTypeExtend[];
  readonly editors: ReadonlyMap<string, CustomCellEditorRender>;
  readonly aggregators: ReadonlyMap<string, Aggregator>;
  readonly writers: readonly ExportWriter[];
  readonly columnMenuActions: readonly ColumnMenuActionFactory<TRow>[];
  readonly panels: readonly SidePanelEntry[];
  readonly commands: readonly Command[];
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

const stack: FeatureHostState[] = [];

/** The host for the table whose render (or whose child's) is running. */
export function currentFeatureHost<TRow = unknown>():
  | FeatureHostState<TRow>
  | undefined {
  return stack.at(-1) as FeatureHostState<TRow> | undefined;
}

/** Replace this hook's previous host on the stack, then push `next`. */
export function replaceFeatureHost(
  previous: FeatureHostState | null,
  next: FeatureHostState
): void {
  if (previous) {
    const index = stack.lastIndexOf(previous);
    if (index >= 0) stack.splice(index, 1);
  }
  stack.push(next);
}

/** Remove this table's host (unmount, or the host identity changed). */
export function popFeatureHost(host: FeatureHostState): void {
  const index = stack.lastIndexOf(host);
  if (index >= 0) stack.splice(index, 1);
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
