/**
 * The live feature host: what `setup(host)` registers against, and the
 * lifecycle around it.
 *
 * A table creates one host per composed feature list, runs every feature's
 * `setup` against it, reads the collected registrations as its
 * {@link FeatureHostState}, and disposes it when the table goes away or the
 * list changes. Every binding does exactly this, so the host is core's.
 */
import type { Command } from "../actions/commandRegistry";
import type { Aggregator } from "../aggregate/aggregate";
import type { CustomCellEditorRender } from "../editing/cellEditing";
import type { ExportWriter } from "../export/exportWriter";
import type { FilterTypeSpec } from "../filters/filterRegistry";
import type {
  ColumnMenuActionFactory,
  ContextMenuItemsFactory,
  FeatureHostState,
  FilterTypeExtend,
  SidePanelEntry,
} from "./currentHost";

/**
 * The registrations a feature's `setup(host)` makes, collected for one table.
 *
 * `TPanel` is the binding's side-panel entry: core knows a panel by its key,
 * and the binding adds what the panel shows.
 *
 * @typeParam TRow - The row type.
 * @typeParam TPanel - The binding's side-panel entry.
 *
 * @public
 */
export class LiveFeatureHost<
  TRow = unknown,
  TPanel extends SidePanelEntry = SidePanelEntry,
> implements FeatureHostState<TRow> {
  /** Filter types features registered. */
  readonly filterTypes: FilterTypeSpec[] = [];
  /** Patches queued against existing filter types. */
  readonly filterExtends: FilterTypeExtend[] = [];
  /** Custom cell editors, by editor name. */
  readonly editors = new Map<string, CustomCellEditorRender>();
  /** Aggregators, by aggregate name. */
  readonly aggregators = new Map<string, Aggregator>();
  /** Export writers features added. */
  readonly writers: ExportWriter[] = [];
  /** Factories that add entries to the column menu. */
  readonly columnMenuActions: ColumnMenuActionFactory<TRow>[] = [];
  /** Side-panel tabs features added. */
  readonly panels: TPanel[] = [];
  /** Commands features added to the palette. */
  readonly commands: Command[] = [];
  /** Factories that add entries to the right-click menus. */
  readonly contextMenuItems: ContextMenuItemsFactory<TRow>[] = [];
  private readonly disposers: (() => void)[] = [];
  private disposed = false;

  /** Run `cleanup` when the host is disposed. */
  onDispose(cleanup: () => void): void {
    this.disposers.push(cleanup);
  }
  /** Register a filter type for this table. */
  registerFilterType(spec: FilterTypeSpec): void {
    this.filterTypes.push(spec);
  }
  /** Extend a registered filter type for this table. */
  extendFilterType(type: string, patch: Partial<FilterTypeSpec>): void {
    this.filterExtends.push({ type, patch });
  }
  /** Register a named custom cell editor. */
  registerEditor(type: string, render: CustomCellEditorRender): void {
    this.editors.set(type, render);
  }
  /** Register a named aggregator. */
  registerAggregator(name: string, aggregator: Aggregator): void {
    this.aggregators.set(name, aggregator);
  }
  /** Register an export writer. */
  registerWriter(writer: ExportWriter): void {
    this.writers.push(writer);
  }
  /** Append entries to the column menu. */
  registerColumnMenuAction(factory: ColumnMenuActionFactory<TRow>): void {
    this.columnMenuActions.push(factory);
  }
  /** Add a side-panel tab. */
  registerPanel(panel: TPanel): void {
    this.panels.push(panel);
  }
  /** Add a command to the palette. */
  registerCommand(command: Command): void {
    this.commands.push(command);
  }
  /** Append entries to the right-click menus. */
  registerContextMenuItems(items: ContextMenuItemsFactory<TRow>): void {
    this.contextMenuItems.push(items);
  }
  /** Run every cleanup once. Later calls do nothing. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const cleanup of this.disposers) cleanup();
  }
}

/**
 * The host of a table whose features register nothing. Shared, and never
 * disposed.
 *
 * @public
 */
export const EMPTY_FEATURE_HOST: FeatureHostState = new LiveFeatureHost();

/**
 * Anything that can register against a {@link LiveFeatureHost}.
 *
 * @public
 */
export interface FeatureSetup<TRow, TPanel extends SidePanelEntry> {
  /**
   * Register against the live table. Return a function to run when the
   * table is disposed or its features change.
   */
  setup?(host: LiveFeatureHost<TRow, TPanel>): void | (() => void);
}

/**
 * Run every feature's `setup` against a fresh host.
 *
 * A list with no `setup` shares {@link EMPTY_FEATURE_HOST}, so a table that
 * composes nothing registrable allocates nothing.
 *
 * @param features - The composed features, in array order.
 * @returns The host the table reads registrations from.
 *
 * @public
 */
export function createFeatureHost<
  TPanel extends SidePanelEntry = SidePanelEntry,
>(
  features: readonly FeatureSetup<unknown, TPanel>[] | undefined
): FeatureHostState {
  if (!features?.some((feature) => feature.setup != null)) {
    return EMPTY_FEATURE_HOST;
  }
  const host = new LiveFeatureHost<unknown, TPanel>();
  for (const feature of features) {
    const cleanup = feature.setup?.(host);
    if (cleanup) host.onDispose(cleanup);
  }
  return host;
}

/**
 * Dispose a host {@link createFeatureHost} returned. The shared empty host
 * is left alone.
 *
 * @public
 */
export function disposeFeatureHost(host: FeatureHostState): void {
  if (host instanceof LiveFeatureHost && host !== EMPTY_FEATURE_HOST) {
    host.dispose();
  }
}
