/**
 * Feature composition — one registration surface for built-in modules and
 * host plugins.
 *
 * A bundler follows imports, not prop values, so an adapter `<DataTable>`
 * that statically imports every feature it *might* render ships them all.
 * The `features` array moves the enable-switch onto the consumer's import:
 * `features={[rowReorder(fn)]}` from `@adapttable/<kit>/row-reorder`, and
 * that import is the only way in — a table pays for what it names.
 *
 * The same {@link TableFeature} carries `setup(host)` so custom filter
 * types, editors, aggregators, exporters, menu items, panels and commands
 * register here rather than through a parallel API.
 */
import {
  type Aggregator,
  type ColumnMenuActionContext,
  type ColumnMenuItem,
  type ColumnMenuRow,
  type Command,
  type ContextMenuItem,
  type ContextMenuTarget,
  type CustomCellEditorRender,
  type ExportWriter,
  type FeatureRegistration,
  type FilterTypeSpec,
  type NeutralFeatureHost,
} from "@adapttable/core";

import type { SidePanelEntry } from "../layout/SidePanelChrome";
import type { FeatureProviderContribution, FeatureRender } from "./providers";

export type { SidePanelEntry } from "../layout/SidePanelChrome";
export type { Command } from "@adapttable/core";
export type { ContextMenuItem, ContextMenuTarget } from "@adapttable/core";
export type { Aggregator } from "@adapttable/core";
export type {
  ColumnMenuAction,
  ColumnMenuActionContext,
  ColumnMenuItem,
  ColumnMenuRow,
} from "@adapttable/core";
export type { CustomCellEditorRender } from "@adapttable/core";
export type { ExportWriter } from "@adapttable/core";
export type { FilterTypeSpec } from "@adapttable/core";

/**
 * Internal table configuration a composed feature may write.
 *
 * @public
 */
export interface FeaturePatch<TRow = unknown> {
  /** Any other prop a feature wants to set on the table. */
  readonly [key: string]: unknown;
  /**
   * Phantom marker that pins the row type; never read at runtime.
   *
   * A FUNCTION of the row rather than the row itself, and that is the whole
   * of why `features={[grouping("team")]}` compiles. A feature whose
   * configuration says nothing about rows produces `TRow = unknown`, and a
   * marker in a return position would make that patch incompatible with the
   * table's own row type — the reason every documented example used to need
   * an explicit `grouping("team")`. Read contravariantly instead,
   * `unknown` is the row type that fits every table, while a genuinely wrong
   * one (`TableFeature<Other>` into a `DataTable<Row>`) still fails, and the
   * error still names the feature.
   */
  readonly __row?: (row: TRow) => void;
}

/**
 * The table props a feature may read while applying.
 *
 * @public
 */
export type FeatureApplyInput<TRow = unknown> = object & {
  /** Phantom marker that pins the row type; never read at runtime. */
  readonly __row?: TRow;
};

/**
 * One composed feature — a built-in factory or a host plugin.
 *
 * `apply` maps factory options into internal table configuration. `setup` is
 * live-host registration; built-ins and plugins share it, on this same
 * object, in the same array.
 *
 * @public
 */
export interface TableFeature<
  TRow = unknown,
> extends FeatureRegistration<TRow> {
  /** Stable id (`"row-reorder"`, `"grouping"`, a host plugin's name). */
  readonly id: string;
  /** Merge this feature's configuration into the table. Later features win. */
  apply?(input: FeatureApplyInput<TRow>): FeaturePatch<TRow>;
  /**
   * Register against the live table. Built-in features and host plugins
   * share this method — custom filter types, editors, aggregators,
   * exporters, menu items, panels and commands all go through the host.
   *
   * Return a function to run when the table unmounts or `features` change.
   */
  setup?(host: TableFeatureHost<TRow>): void | (() => void);
  /**
   * The React component this feature needs in the tree.
   *
   * `apply` and `setup` run inside a render that has already happened, so
   * neither can add a hook. A feature whose behaviour IS a hook contributes a
   * provider instead: mounting it is the legal way to add hooks, and not
   * importing it is what keeps them out of the graph.
   */
  readonly provider?: FeatureProviderContribution;
  /**
   * Named positions this feature draws into, built with `slotRender`.
   *
   * The table computes each slot's props and asks; what appears there is the
   * feature's own kit components, which is what keeps a kit's pixels out of a
   * table that never imported the feature.
   */
  readonly renders?: readonly FeatureRender<never>[];
}

/**
 * What a feature can register when it knows nothing about the rows.
 *
 * The full host's column-menu and context-menu registrations are shaped by
 * `TRow` and are what makes {@link TableFeatureHost} invariant; a feature that
 * needs neither is genuinely row-independent, and this is the host it sees.
 *
 * @public
 */
export type StaticFeatureHost = Omit<
  TableFeatureHost<never>,
  "registerColumnMenuAction" | "registerContextMenuItems" | "__row"
>;

/**
 * A feature that says nothing about the row type.
 *
 * `grouping("team")`, `virtualize()` and `columnMenu()` are the same feature
 * whatever the table holds, so they carry no `TRow` at all and compose into
 * any `<DataTable>` with no annotation — which is what the documented
 * `features={[grouping("team"), virtualize()]}` needs in order to compile.
 * A row-AWARE factory (`rowReorder(fn)`, `editing(save)`) still returns
 * {@link TableFeature} and still infers its row type from its own callback,
 * so putting one in the wrong table remains an error that names the feature.
 *
 * @public
 */
export interface StaticTableFeature {
  /** Stable id, exactly as {@link TableFeature.id}. */
  readonly id: string;
  /** Merge internal configuration, exactly as {@link TableFeature.apply}. */
  apply?(input: FeatureApplyInput<never>): FeaturePatch<unknown>;
  /** Register against the live table, minus the row-shaped seams. */
  setup?(host: StaticFeatureHost): void | (() => void);
  /** The React component this feature needs, as {@link TableFeature.provider}. */
  readonly provider?: FeatureProviderContribution;
  /** Named positions this feature draws into, as {@link TableFeature.renders}. */
  readonly renders?: readonly FeatureRender<never>[];
}

/**
 * The live table a {@link TableFeature.setup} registers against.
 *
 * Every extension seam — filter types, editors, aggregators, exporters,
 * menu items, panels, commands — lands here so a built-in is not a
 * special case.
 *
 * @public
 */
export interface TableFeatureHost<
  TRow = unknown,
> extends NeutralFeatureHost<TRow> {
  /** Forget a registration when the table unmounts or features change. */
  onDispose(cleanup: () => void): void;
  /** Register a filter type for this table. */
  registerFilterType(spec: FilterTypeSpec): void;
  /** Extend a registered filter type for this table. */
  extendFilterType(type: string, patch: Partial<FilterTypeSpec>): void;
  /**
   * Named custom editor. `column.editor` as that string resolves to
   * `{ type: "custom", render }` through the same `resolveCellEditor`
   * path built-ins use.
   */
  registerEditor(type: string, render: CustomCellEditorRender): void;
  /**
   * Named aggregator. `aggregate` looks this up after the built-in
   * names, so a plugin `"distinct"` is not a second API beside `Aggregator`.
   */
  registerAggregator(name: string, aggregator: Aggregator): void;
  /** Same `ExportWriter` as `exportCsv.writer`. */
  registerWriter(writer: ExportWriter): void;
  /**
   * Extra Columns-menu actions, appended after the built-ins. The factory
   * sees the same row and context the built-in actions do.
   */
  registerColumnMenuAction(
    factory: (
      row: ColumnMenuRow<TRow>,
      ctx: ColumnMenuActionContext<TRow>
    ) => ColumnMenuItem | readonly ColumnMenuItem[] | undefined
  ): void;
  /** Same `SidePanelEntry` as `sidePanel.panels`. */
  registerPanel(panel: SidePanelEntry): void;
  /** Same `Command` as `commandPalette.commands`. */
  registerCommand(command: Command): void;
  /** Same extra-items factory as `contextMenu.items`. */
  registerContextMenuItems(
    items: (target: ContextMenuTarget<TRow>) => readonly ContextMenuItem[]
  ): void;
  /**
   * Phantom marker that pins the row type; never read at runtime. Read
   * contravariantly, for the same reason {@link FeaturePatch.__row} is: a
   * feature that registers nothing row-shaped fits any table, and one built
   * for the wrong row still does not.
   */
  readonly __row?: (row: TRow) => void;
}

const applied = new WeakSet<object>();
const appliedFeatures = new WeakMap<object, readonly TableFeature[]>();

/** Features that produced this resolved props object, if any. */
export function getAppliedFeatures(
  props: object
): readonly TableFeature[] | undefined {
  return appliedFeatures.get(props);
}

/** Remember the feature list on a resolved (or overlaid) props object. */
export function rememberAppliedFeatures(
  props: object,
  list: readonly TableFeature[]
): void {
  appliedFeatures.set(props, list);
}

function definedEntries(value: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined && key !== "__row") out[key] = entry;
  }
  return out;
}

function omitFeatures<P extends object>(props: P): P {
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key !== "features") rest[key] = value;
  }
  return rest as P;
}

function featuresOf(props: object): readonly TableFeature[] | undefined {
  if (!("features" in props)) return undefined;
  const list = props.features;
  if (!Array.isArray(list)) return [];
  return list as readonly TableFeature[];
}

/**
 * Resolve `features` onto the existing prop surface.
 *
 * Later features win; defined host props win over both. `features` is
 * stripped from the result. Calling twice on the same object is a no-op
 * so adapters and `useDataTableShell` can both apply.
 *
 * @public
 */
export function applyTableFeatures<P extends object>(props: P): P {
  if (applied.has(props)) {
    return props;
  }

  const list = featuresOf(props);
  if (list == null) {
    applied.add(props);
    return props;
  }
  if (list.length === 0) {
    const rest = omitFeatures(props);
    applied.add(rest);
    rememberAppliedFeatures(rest, list);
    return rest;
  }

  let fromFeatures: Record<string, unknown> = {};
  for (const next of list) {
    const patch = next.apply?.(fromFeatures);
    if (!patch) continue;
    const entries = definedEntries(patch);
    const prevAssembly = fromFeatures.assembly;
    const nextAssembly = entries.assembly;
    fromFeatures = { ...fromFeatures, ...entries };
    if (
      prevAssembly &&
      nextAssembly &&
      typeof prevAssembly === "object" &&
      typeof nextAssembly === "object"
    ) {
      fromFeatures.assembly = {
        ...prevAssembly,
        ...nextAssembly,
      };
    }
  }

  const resolved = {
    ...fromFeatures,
    ...definedEntries(omitFeatures(props)),
  } as P;
  applied.add(resolved);
  rememberAppliedFeatures(resolved, list);
  return resolved;
}
