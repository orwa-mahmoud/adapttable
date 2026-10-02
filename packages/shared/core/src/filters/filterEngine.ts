/**
 * The filter-tree / facet / registry engine.
 *
 * Lives on `@adapttable/<kit>/filters`. The DataTable root never imports
 * this module — only the filters feature's provider does.
 */
import type { ColumnMetadata } from "../columnModel";
import {
  applyFilterExtends,
  type FeatureHostState,
} from "../features/currentHost";
import type { QueryFilterGroup } from "../source/queryContract";
import type { ExtraFilters } from "../types";
import { stableKey } from "../utils/stableKey";
import { computeFilterFacets, type FacetMap } from "./facets";
import { resolveFilterRegistry } from "./filterBuiltins";
import {
  buildFilterRuntime,
  type FilterDef,
  type FilterRuntime,
  materializeAutoOptions,
  resolveFilterDefs,
} from "./filterDefs";
import type { FilterTypeRegistry, FilterTypeSpec } from "./filterRegistry";
import { evaluateFilterTree } from "./filterTree";

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
const references = new WeakMap<object, number>();
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
 * The real engine. Imported only from the filters feature.
 *
 * @public
 */
export const FILTER_ENGINE_IMPL: FilterEngine = {
  buildRuntime(input) {
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
        applyFilterExtends(resolveFilterRegistry(filterTypes), featureHost)
      ),
      filterKey,
    };
  },
  evaluateTree: evaluateFilterTree,
  computeFacets: computeFilterFacets,
};
