/**
 * Groups and totals over a query's sorted rows: the full evaluator's stage
 * after the query.
 *
 * Groups are partitioned again from the sorted rows on every change, so their
 * order is always the order a full build gives. Each row's group path is read
 * when it enters and kept beside the sorted rows; a group's cells are computed
 * again only when a row that left or entered sits under it. Grand totals from an aggregate spec are
 * running accumulators that a patch moves by the rows that left and entered.
 */
import { aggregate } from "../aggregate/aggregate";
import type { DisplayValue } from "../display";
import {
  type BuildGroupedFlatModelOptions,
  flattenGroupPartitions,
  type GroupedFlatEntry,
  groupingKeys,
  type GroupPartition,
  groupPathReader,
  type GroupPathStep,
  makeGroupRowKey,
  partitionGroupedRows,
} from "../grouping/groupRows";
import { stableKey } from "../utils/stableKey";
import { type Derivation, derivedRecord, type DerivedStage } from "./evaluator";
import type { IncrementalViewConfig } from "./incremental";
import {
  createIncrementalAggregate,
  type IncrementalAggregate,
  movedIncrementalAggregate,
  readIncrementalAggregate,
} from "./incrementalAggregate";

type Cells = Partial<Record<string, DisplayValue>>;

type GroupPath = readonly GroupPathStep[];

/** What one derivation carries into the next. */
interface DerivedState<TRow> {
  /** The sorted rows it was derived from, and each one's group path by position. */
  readonly sorted: readonly TRow[];
  readonly paths: readonly GroupPath[] | undefined;
  /** The buckets the groups were laid out from. */
  readonly partitions: readonly GroupPartition<TRow>[] | undefined;
  /** Cells of every group drawn, by group key. */
  readonly cells: ReadonlyMap<string, Cells>;
  readonly summary: IncrementalAggregate<TRow> | undefined;
}

/** The state each derivation was built from, for a layout-only re-derive. */
const derivedStates = /* @__PURE__ */ new WeakMap<
  object,
  DerivedState<never>
>();

/**
 * What only lays the groups out: folding, paging, footers, labels, order and
 * filter. A change to these alone keeps the partition and the totals.
 */
function layoutFingerprint<TRow>(config: IncrementalViewConfig<TRow>): string {
  return stableKey({
    groupFooters: Boolean(config.groupFooters),
    collapsed: config.collapsedGroupIds
      ? [...config.collapsedGroupIds].sort((a, b) => a.localeCompare(b))
      : [],
    groupPageSize: config.groupPageSize ?? null,
    rowPageSize: config.rowPageSize ?? null,
    paging: config.paging ?? null,
    blankLabel: config.blankLabel ?? null,
    // A named order is a value and is compared as one; a comparator is a
    // function, which a host that changes it signals through `derivedKey`.
    groupSort:
      typeof config.groupSort === "string"
        ? config.groupSort
        : config.groupSort !== undefined,
    hasGroupFilter: config.groupFilter !== undefined,
  });
}

/**
 * What the partition and the totals are made from. Callbacks a host rebuilds
 * on every render count by presence; `derivedKey` carries what they answer,
 * and any change to it derives the stage again from the rows.
 */
function contentFingerprint<TRow>(config: IncrementalViewConfig<TRow>): string {
  return stableKey({
    groupBy: groupingKeys(config.groupBy ?? []),
    hasGroupAggregates: config.groupAggregates !== undefined,
    derivedKey: config.derivedKey ?? null,
    groupAggregateOps: config.groupAggregateOps ?? null,
    hasSummaryRow: config.summaryRow !== undefined,
    aggregateSpec: config.aggregateSpec ?? null,
    aggregateOptions: config.aggregateOptions ?? null,
  });
}

/**
 * What a group's cells are computed with: the host's `groupAggregates`, else
 * the built-in `aggregateSpec`. The first build and every patch read the same
 * one, so a group's totals never depend on how the view was reached.
 */
function groupAggregator<TRow>(
  config: IncrementalViewConfig<TRow>
): ((rows: readonly TRow[]) => Cells) | undefined {
  if (config.groupAggregates) return config.groupAggregates;
  if (config.aggregateSpec) {
    return aggregate(config.aggregateSpec, config.aggregateOptions);
  }
  return undefined;
}

function flattenOptions<TRow>(
  config: IncrementalViewConfig<TRow>
): Omit<BuildGroupedFlatModelOptions<TRow>, "rows"> {
  return {
    groupBy: config.groupBy ?? [],
    columns: config.columns ?? [],
    getRowId: config.getRowId,
    collapsedGroupIds: config.collapsedGroupIds ?? new Set(),
    aggregateOps: config.groupAggregateOps,
    blankLabel: config.blankLabel,
    footers: config.groupFooters === true,
    sort: config.groupSort,
    filter: config.groupFilter,
    groupPageSize: config.groupPageSize,
    rowPageSize: config.rowPageSize,
    paging: config.paging,
  };
}

/**
 * Each row of `sorted`'s group path, carried over from `state` for a row that
 * stayed and read for one that entered, plus the paths of every row that left
 * or entered.
 * Rows that stayed keep their relative order, so one walk over both sorted
 * lists lines them up.
 */
function carriedPaths<TRow>(
  state: DerivedState<TRow> & { paths: readonly GroupPath[] },
  sorted: readonly TRow[],
  left: readonly TRow[],
  entered: readonly TRow[],
  read: (row: TRow) => GroupPath
): { paths: GroupPath[]; moved: GroupPath[] } {
  const leaving = new Set(left);
  const entering = new Set(entered);
  const paths: GroupPath[] = [];
  const moved: GroupPath[] = [];
  let at = 0;
  const skipLeft = () => {
    while (at < state.sorted.length && leaving.has(state.sorted[at]!)) {
      moved.push(state.paths[at]!);
      at += 1;
    }
  };
  for (const row of sorted) {
    if (entering.has(row)) {
      const path = read(row);
      paths.push(path);
      moved.push(path);
      continue;
    }
    skipLeft();
    paths.push(state.paths[at]!);
    at += 1;
  }
  skipLeft();
  return { paths, moved };
}

/** The keys of every group along `paths`. */
function groupKeysAlong(
  paths: readonly GroupPath[],
  keys: readonly string[]
): Set<string> {
  const touched = new Set<string>();
  for (const path of paths) {
    const valueKeys = path.map((step) => step.valueKey);
    for (let depth = 1; depth <= keys.length; depth++) {
      touched.add(
        makeGroupRowKey(keys.slice(0, depth), valueKeys.slice(0, depth))
      );
    }
  }
  return touched;
}

/**
 * Draw each group's cells: from `previous` for a group no change touched,
 * else computed. Returns the cells of every group drawn.
 */
function paintCells<TRow>(
  entries: GroupedFlatEntry<TRow>[],
  config: IncrementalViewConfig<TRow>,
  previous: ReadonlyMap<string, Cells>,
  touched: ReadonlySet<string> | undefined,
  keepPrevious = false
): Map<string, Cells> {
  const aggregator = groupAggregator(config);
  // A layout change keeps the cells of groups it folded away, so unfolding
  // them again reads no rows.
  const cells = new Map<string, Cells>(keepPrevious ? previous : undefined);
  for (const entry of entries) {
    if (entry.kind === "group") {
      const known = touched?.has(entry.key)
        ? undefined
        : previous.get(entry.key);
      const value = known ?? aggregator?.(entry.leafRows);
      if (value) cells.set(entry.key, value);
      entry.aggregateCells = value;
      entry.aggregateOps = config.groupAggregateOps;
    } else if (entry.kind === "groupFooter") {
      entry.aggregateCells = cells.get(entry.groupKey);
      entry.aggregateOps = config.groupAggregateOps;
    }
  }
  return cells;
}

function summaryOf<TRow>(
  sorted: readonly TRow[],
  config: IncrementalViewConfig<TRow>,
  summary: IncrementalAggregate<TRow> | undefined
): Cells | undefined {
  if (config.summaryRow) return config.summaryRow(sorted);
  if (summary) return readIncrementalAggregate(summary, sorted);
  return undefined;
}

function derivation<TRow>(
  sorted: readonly TRow[],
  config: IncrementalViewConfig<TRow>,
  state: DerivedState<TRow> | undefined,
  moved: { left: readonly TRow[]; entered: readonly TRow[] } | undefined,
  layoutOnly = false
): Derivation<TRow> {
  const keys = groupingKeys(config.groupBy ?? []);
  let paths: readonly GroupPath[] | undefined;
  let partitions: readonly GroupPartition<TRow>[] | undefined;
  let cells: ReadonlyMap<string, Cells> = new Map();
  let groups: GroupedFlatEntry<TRow>[] | undefined;
  if (keys.length > 0 && layoutOnly && state?.partitions) {
    // Same rows, same totals, new layout: lay the kept buckets out again.
    paths = state.paths;
    partitions = state.partitions;
    groups = flattenGroupPartitions(partitions, flattenOptions(config));
    cells = paintCells(groups, config, state.cells, undefined, true);
  } else if (keys.length > 0) {
    const read = groupPathReader(keys, config.columns ?? [], config.locale);
    let touched: Set<string> | undefined;
    if (state?.paths && moved) {
      const carried = carriedPaths(
        { ...state, paths: state.paths },
        sorted,
        moved.left,
        moved.entered,
        read
      );
      paths = carried.paths;
      touched = groupKeysAlong(carried.moved, keys);
    } else {
      paths = sorted.map(read);
    }
    partitions = partitionGroupedRows(
      sorted,
      keys,
      config.columns ?? [],
      config.locale,
      paths
    );
    groups = flattenGroupPartitions(partitions, flattenOptions(config));
    cells = paintCells(groups, config, state?.cells ?? new Map(), touched);
  }
  let summary = state?.summary;
  if (config.aggregateSpec && !layoutOnly) {
    summary =
      summary && moved
        ? movedIncrementalAggregate(summary, moved.left, moved.entered)
        : createIncrementalAggregate(
            config.aggregateSpec,
            sorted,
            config.aggregateOptions
          );
  }
  const next: DerivedState<TRow> = {
    sorted,
    paths,
    partitions,
    cells,
    summary,
  };
  const result: Derivation<TRow> = {
    groups,
    aggregates: summaryOf(sorted, config, summary),
    patch: (nextSorted, left, entered, nextConfig) =>
      derivation(nextSorted, nextConfig, next, { left, entered }),
  };
  derivedStates.set(result, next as DerivedState<never>);
  return result;
}

/** The state a derivation was built from, when this stage built it. */
function stateOf<TRow>(
  built: Derivation<TRow> | undefined
): DerivedState<TRow> | undefined {
  return built ? derivedStates.get(built) : undefined;
}

/** The full evaluator's stage: groups, group cells and grand totals. */
export function groupsAndTotals<TRow>(): DerivedStage<TRow> {
  const derive = (
    sorted: readonly TRow[],
    config: IncrementalViewConfig<TRow>
  ) =>
    groupingKeys(config.groupBy ?? []).length > 0 ||
    config.summaryRow !== undefined ||
    config.aggregateSpec !== undefined
      ? derivation(sorted, config, undefined, undefined)
      : undefined;
  return {
    derive,
    rederive: (view, evaluation, config, mode) => {
      const sameContent =
        contentFingerprint(evaluation.config) === contentFingerprint(config);
      if (
        sameContent &&
        layoutFingerprint(evaluation.config) === layoutFingerprint(config)
      ) {
        return undefined;
      }
      // A new record gets its own row arrays, so the snapshot attached to
      // the arrays `view` shows keeps describing `view`.
      let { filtered, sorted } = view;
      if (mode === "new record") {
        filtered = [...view.filtered];
        sorted = view.sorted === view.filtered ? filtered : [...view.sorted];
      }
      // A new record's copies hold the same rows in the same order, so the
      // kept buckets still describe them.
      const previous = sameContent ? stateOf(evaluation.derivation) : undefined;
      return derivedRecord(view.rows, filtered, sorted, {
        ...evaluation,
        config,
        derivation: previous?.partitions
          ? derivation(sorted, config, previous, undefined, true)
          : derive(sorted, config),
      });
    },
  };
}
