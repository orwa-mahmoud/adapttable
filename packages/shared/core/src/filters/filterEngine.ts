/**
 * The filter-tree / facet / registry engine.
 *
 * Lives on `@adapttable/<kit>/filters`. The DataTable root never imports
 * this module — only the filters feature's provider does.
 */

import type { ColumnMetadata, ExtraFilters } from "../contracts/columns";
import type { FacetMap, QueryFilterGroup } from "../contracts/query";
import {
  applyFilterExtends,
  type FeatureHostState,
} from "../features/currentHost";
import { stableKey } from "../utils/stableKey";
import { computeFilterFacets } from "./facets";
import { defaultFilterRegistry } from "./filterBuiltins";
import {
  buildFilterRuntime,
  type FilterDef,
  type FilterRuntime,
  materializeAutoOptions,
  resolveFilterDefs,
} from "./filterDefs";
import {
  createFilterRegistry,
  type FilterTypeRegistry,
  type FilterTypeSpec,
  withFilterType,
} from "./filterRegistry";
import { evaluatePreparedFilterTree } from "./filterTree";

/**
 * Functions the lean data hook calls only when filters are composed.
 *
 * @public
 */
export interface FilterEngine {
  buildRuntime<TRow>(input: {
    columns: readonly ColumnMetadata<TRow>[];
    declaredFilters: readonly FilterDef<TRow>[] | undefined;
    locale: string | undefined;
    data: readonly TRow[];
    loadedOptions: Record<string, readonly { value: string; label: string }[]>;
    filterTypes: readonly FilterTypeSpec[] | undefined;
    featureHost: FeatureHostState | undefined;
    optionCache: Map<
      string,
      () => Promise<readonly { value: string; label: string }[]>
    >;
  }): FilterRuntime<TRow>;
  evaluateTree<TRow>(
    tree: QueryFilterGroup,
    row: TRow,
    defs: readonly FilterDef<TRow>[],
    registry: FilterTypeRegistry
  ): boolean;
  computeFacets<TRow>(
    defs: readonly FilterDef<TRow>[],
    rows: readonly TRow[],
    extra: ExtraFilters,
    keep: (row: TRow, extra: ExtraFilters) => boolean,
    registry: FilterTypeRegistry
  ): FacetMap;
}

// Callback identities belong to the optional engine, so plain tables do not
// carry the authored-filter encoder. Weak keys never keep a callback alive.
const references = /* @__PURE__ */ new WeakMap<object, number>();
let nextReference = 0;

function reference(value: object): number {
  const existing = references.get(value);
  if (existing !== undefined) return existing;
  const next = ++nextReference;
  references.set(value, next);
  return next;
}

/** Encode authored callbacks by identity without confusing them with data values. */
function filterSemanticValue(value: unknown): unknown {
  if (typeof value === "function") return ["function", reference(value)];
  if (Array.isArray(value)) {
    return ["array", value.map((entry) => filterSemanticValue(entry))];
  }
  if (value !== null && typeof value === "object") {
    return [
      "object",
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          filterSemanticValue(entry),
        ])
      ),
    ];
  }
  return value === undefined ? ["undefined"] : ["value", value];
}

/** Fingerprint declarations before row-dependent options or closures exist. */
function filterSemanticKey<TRow>(
  input: Parameters<typeof FILTER_ENGINE_IMPL.buildRuntime<TRow>>[0]
): string {
  const declared = input.declaredFilters ?? [];
  const overridden = new Set(declared.map((def) => def.key));
  return stableKey(
    filterSemanticValue({
      filters: declared,
      columns: input.columns
        .filter((column) => column.filter && !overridden.has(column.key))
        .map((column) => ({
          key: column.key,
          filter: column.filter,
          i18n: column.i18n,
          label: typeof column.header === "string" ? column.header : undefined,
        })),
      locale: input.locale,
      types: input.filterTypes ?? [],
      registered: input.featureHost?.filterTypes ?? [],
      extended: input.featureHost?.filterExtends ?? [],
      loadedOptions: input.loadedOptions,
    })
  );
}

/**
 * A filter engine whose built-in types are `builtIns`. Host `filterTypes` and
 * feature registrations layer on top, as on the full engine.
 *
 * @param builtIns - The built-in types the table's widgets carry.
 * @returns The engine.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function createFilterEngine(builtIns: FilterTypeRegistry): FilterEngine {
  return {
    buildRuntime: (input) => buildRuntimeOn(builtIns, input),
    evaluateTree: evaluatePreparedFilterTree,
    computeFacets: computeFilterFacets,
  };
}

/**
 * The engine for a filters feature's widgets: the built-in types those
 * widgets carry, nothing else. A widget that names no rules adds no type.
 *
 * @param widgets - The widgets the filters form draws with.
 * @returns The engine.
 *
 * @public
 */
/* @__NO_SIDE_EFFECTS__ */
export function filterEngineForWidgets(
  widgets: readonly { readonly specs?: readonly FilterTypeSpec[] }[]
): FilterEngine {
  return createFilterEngine(
    createFilterRegistry(widgets.flatMap((widget) => widget.specs ?? []))
  );
}

function buildRuntimeOn<TRow>(
  builtIns: FilterTypeRegistry,
  input: Parameters<FilterEngine["buildRuntime"]>[0] & {
    readonly columns: readonly ColumnMetadata<TRow>[];
  }
): FilterRuntime<TRow> {
  const {
    columns,
    declaredFilters,
    locale,
    data,
    loadedOptions,
    filterTypes,
    featureHost,
    optionCache,
  } = input;
  const filterKey = filterSemanticKey(input);
  const materialized = materializeAutoOptions(
    resolveFilterDefs(columns, declaredFilters, locale),
    data
  );
  const withAsync = materialized.map((def) => {
    if (typeof def.options !== "function") return def;
    const loaded = loadedOptions[def.key];
    if (loaded) return { ...def, options: loaded };
    let cached = optionCache.get(def.key);
    if (!cached) {
      const original = def.options;
      let inFlight: Promise<
        readonly { value: string; label: string }[]
      > | null = null;
      cached = () => (inFlight ??= original());
      optionCache.set(def.key, cached);
    }
    return { ...def, options: cached };
  });
  return {
    ...buildFilterRuntime(
      withAsync,
      applyFilterExtends(
        (filterTypes ?? []).reduce(
          (registry, spec) => withFilterType(registry, spec),
          builtIns
        ),
        featureHost
      )
    ),
    filterKey,
  };
}

/**
 * The full engine: every built-in type. Imported only from the filters
 * feature that draws every widget.
 *
 * @public
 */
export const FILTER_ENGINE_IMPL: FilterEngine =
  /* @__PURE__ */ createFilterEngine(defaultFilterRegistry);
