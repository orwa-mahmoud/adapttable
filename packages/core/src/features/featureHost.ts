/**
 * Live {@link TableFeatureHost}: `setup(host)` registrations. The host is
 * stored on the resolved props ({@link featureHostOf}) and provided to the
 * tree by {@link FeatureHostProvider}. Chrome that runs in the same render
 * receives it as an argument; it is not left on a module stack.
 */
import { useLayoutEffect, useRef } from "react";

import type { Command } from "../actions/commandRegistry";
import type { Aggregator } from "../aggregate/aggregate";
import type { CustomCellEditorRender } from "../editing/cellEditing";
import type { ExportWriter } from "../export/exportWriter";
import type { FilterTypeSpec } from "../filters/filterRegistry";
import type { SidePanelEntry } from "../layout/SidePanelChrome";
import {
  appendByKey,
  type ColumnMenuActionFactory,
  type ContextMenuItemsFactory,
  type FeatureHostState,
  type FilterTypeExtend,
} from "./currentHost";
import {
  applyTableFeatures,
  getAppliedFeatures,
  rememberAppliedFeatures,
  type TableFeature,
  type TableFeatureHost,
} from "./tableFeature";

class LiveFeatureHost<TRow = unknown>
  implements TableFeatureHost<TRow>, FeatureHostState<TRow>
{
  readonly filterTypes: FilterTypeSpec[] = [];
  readonly filterExtends: FilterTypeExtend[] = [];
  readonly editors = new Map<string, CustomCellEditorRender>();
  readonly aggregators = new Map<string, Aggregator>();
  readonly writers: ExportWriter[] = [];
  readonly columnMenuActions: ColumnMenuActionFactory<TRow>[] = [];
  readonly panels: SidePanelEntry[] = [];
  readonly commands: Command[] = [];
  readonly contextMenuItems: ContextMenuItemsFactory<TRow>[] = [];
  private readonly disposers: (() => void)[] = [];
  private disposed = false;

  onDispose(cleanup: () => void): void {
    this.disposers.push(cleanup);
  }
  registerFilterType(spec: FilterTypeSpec): void {
    this.filterTypes.push(spec);
  }
  extendFilterType(type: string, patch: Partial<FilterTypeSpec>): void {
    this.filterExtends.push({ type, patch });
  }
  registerEditor(type: string, render: CustomCellEditorRender): void {
    this.editors.set(type, render);
  }
  registerAggregator(name: string, aggregator: Aggregator): void {
    this.aggregators.set(name, aggregator);
  }
  registerWriter(writer: ExportWriter): void {
    this.writers.push(writer);
  }
  registerColumnMenuAction(factory: ColumnMenuActionFactory<TRow>): void {
    this.columnMenuActions.push(factory);
  }
  registerPanel(panel: SidePanelEntry): void {
    this.panels.push(panel);
  }
  registerCommand(command: Command): void {
    this.commands.push(command);
  }
  registerContextMenuItems(items: ContextMenuItemsFactory<TRow>): void {
    this.contextMenuItems.push(items);
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const cleanup of this.disposers) cleanup();
  }
}

const EMPTY_HOST: FeatureHostState = new LiveFeatureHost();
const hostOf = new WeakMap<object, FeatureHostState>();

function sameFeatures(
  left: readonly TableFeature[] | undefined,
  right: readonly TableFeature[] | undefined
): boolean {
  if (left === right) return true;
  if (left?.length !== right?.length || !left || !right) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function createHost(
  list: readonly TableFeature[] | undefined
): FeatureHostState {
  if (!list?.some((feature) => feature.setup != null)) return EMPTY_HOST;
  const host = new LiveFeatureHost();
  for (const feature of list) {
    const extra = feature.setup?.(host);
    if (extra) host.onDispose(extra);
  }
  return host;
}

function overlayPanels<P extends object>(props: P, host: FeatureHostState): P {
  if (host.panels.length === 0) return props;
  const current = (props as { sidePanel?: unknown }).sidePanel;
  if (!current || typeof current !== "object") return props;
  const options = current as { panels: readonly SidePanelEntry[] };
  return {
    ...props,
    sidePanel: {
      ...options,
      panels: appendByKey(options.panels, host.panels, (panel) => panel.key),
    },
  };
}

/**
 * Apply `features`, run `setup(host)`, overlay side-panel panels onto props.
 *
 * Safe to call from an adapter and again from `useDataTableShell`:
 * the second call reuses the host and does not re-register.
 */
export function useTableFeatures<P extends object>(incoming: P): P {
  const reused = hostOf.get(incoming);
  const applied = reused ? incoming : applyTableFeatures(incoming);
  const list = getAppliedFeatures(applied);
  const cache = useRef<{
    list: readonly TableFeature[] | undefined;
    host: FeatureHostState;
  } | null>(null);

  let host: FeatureHostState;
  if (reused) {
    host = reused;
  } else if (cache.current && sameFeatures(cache.current.list, list)) {
    host = cache.current.host;
  } else {
    host = hostOf.get(applied) ?? createHost(list);
    cache.current = { list, host };
  }

  if (!reused) hostOf.set(applied, host);

  const props = reused ? incoming : overlayPanels(applied, host);
  if (!reused && props !== applied) {
    hostOf.set(props, host);
    rememberAppliedFeatures(props, getAppliedFeatures(applied) ?? []);
  }

  useLayoutEffect(() => {
    return () => {
      if (host !== EMPTY_HOST) (host as LiveFeatureHost).dispose();
    };
  }, [host]);

  return props;
}

/**
 * The host {@link useTableFeatures} created for these resolved props.
 *
 * @public
 */
export function featureHostOf(props: object): FeatureHostState | undefined {
  return hostOf.get(props);
}

/**
 * Attach a host to a derived props object (chrome spreads a new one).
 *
 * @public
 */
export function rememberFeatureHost(
  props: object,
  host: FeatureHostState | undefined
): void {
  if (host) hostOf.set(props, host);
}
