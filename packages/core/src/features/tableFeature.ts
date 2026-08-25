/**
 * Feature composition — one registration surface for built-in modules and
 * host plugins.
 *
 * A bundler follows imports, not prop values, so an adapter `<DataTable>`
 * that statically imports every feature it *might* render ships them all.
 * The `features` array moves the enable-switch onto the consumer's import:
 * `features={[rowReorder(fn)]}` from `@adapttable/<kit>/row-reorder`.
 *
 * While the enabling props still work, DataTable keeps its internal imports
 * — there is no bundle saving yet. The drop lands at v3.
 *
 * The same {@link TableFeature} carries `setup(host)` so custom filter
 * types, editors, aggregators, exporters, menu items, panels and commands
 * register here rather than through a parallel API.
 */
import { devWarn } from "../utils/devWarn";

/** Props a feature may write. Keys match `<DataTable>` enabling props. */
export interface FeaturePatch<TRow = unknown> {
  readonly [key: string]: unknown;
  readonly __row?: TRow;
}

/** The table props a feature may read while applying. */
export type FeatureApplyInput<TRow = unknown> = object & {
  readonly __row?: TRow;
};

/**
 * One composed feature — a built-in factory or a host plugin.
 *
 * `apply` maps onto the existing prop surface so both enabling paths are
 * the same runtime. `setup` is live-host registration; built-ins and
 * plugins share it, on this same object, in the same array.
 */
export interface TableFeature<TRow = unknown> {
  /** Stable id (`"row-reorder"`, `"grouping"`, a host plugin's name). */
  readonly id: string;
  /**
   * Merge this feature's enabling props into the table. Later features win;
   * an explicit prop on the table still wins over either.
   */
  apply?(input: FeatureApplyInput<TRow>): FeaturePatch<TRow>;
  /**
   * Register against the live table. Built-in features and host plugins
   * share this method — custom filter types, editors, aggregators,
   * exporters, menu items, panels and commands all go through the host.
   *
   * Return a function to run when the table unmounts or `features` change.
   */
  setup?(host: TableFeatureHost<TRow>): void | (() => void);
}

/**
 * The live table a {@link TableFeature.setup} registers against.
 *
 * Every extension seam — filter types, editors, aggregators, exporters,
 * menu items, panels, commands — lands here so a built-in is not a
 * special case.
 */
export interface TableFeatureHost<TRow = unknown> {
  /** Forget a registration when the table unmounts or features change. */
  onDispose(cleanup: () => void): void;
  readonly __row?: TRow;
}

const applied = new WeakSet<object>();

function definedEntries(value: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined && key !== "__row") out[key] = entry;
  }
  return out;
}

function warnDeprecatedFeatureProps(props: object): void {
  // Bundlers inline NODE_ENV and drop this list from production.
  if (process.env.NODE_ENV === "production") return;
  const used = (
    "onRowReorder,pinnedRowIds,onPinnedRowIdsChange,getCellSpan,extraRows," +
    "rowStyle,rowHeight,rowClassName,renderRowDetail,nestedTable,onCellEdit," +
    "rowEditing,onRowEdit,batchEditing,onBatchEdit,editHistory,dirtyIndicators," +
    "getChildren,getParentId,groupBy,virtualize,virtualizeColumns," +
    "enableColumnMenu,resizableColumns,collapsibleColumnGroups,exportCsv," +
    "cellNavigation,findInTable,fullscreen,commandPalette,contextMenu," +
    "sidePanel,bulkActions,filters,filterTypes,headerFilters,savedViews," +
    "selectionStats,densityChooser,onPrint,statusBar,undoRedoButtons," +
    "multiSort,fitColumns,columnSelectionCheckbox"
  )
    .split(",")
    .filter((key) => (props as Record<string, unknown>)[key] !== undefined);
  if (used.length === 0) return;
  devWarn(
    `Enabling props (${used.join(", ")}) are deprecated. Import factories ` +
      `from an @adapttable/<kit>/<feature> subpath and pass ` +
      `features={[rowReorder(fn), …]}. The props still work until v3 — ` +
      `see https://orwa-mahmoud.github.io/adapttable/features/`
  );
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
 */
export function applyTableFeatures<P extends object>(props: P): P {
  if (applied.has(props)) {
    return props;
  }

  warnDeprecatedFeatureProps(props);

  const list = featuresOf(props);
  if (list == null) {
    applied.add(props);
    return props;
  }
  if (list.length === 0) {
    const rest = omitFeatures(props);
    applied.add(rest);
    return rest;
  }

  let fromFeatures: Record<string, unknown> = {};
  for (const next of list) {
    const patch = next.apply?.(fromFeatures);
    if (patch) fromFeatures = { ...fromFeatures, ...definedEntries(patch) };
  }

  const resolved = {
    ...fromFeatures,
    ...definedEntries(omitFeatures(props)),
  } as P;
  applied.add(resolved);
  return resolved;
}
