/**
 * Filter, sort, and search only.
 *
 * Grouping and aggregates are not evaluated. A patch evaluates only the rows
 * it inserted or changed: every other row is the same object it was, so it
 * keeps its result. This model has no group tree or running totals to update.
 */
import type { RowPatchLog } from "../contracts/rows";
import type {
  IncrementalView,
  IncrementalViewConfig,
} from "../rows/incremental";
import {
  definedConfigPatch,
  hasFilter,
  hasSort,
  queryConfigFingerprint,
  rowMatches,
  sortMatchedRows,
} from "../rows/rowQuery";
import type { RowModel } from "./rowModelContract";

const CONFIGS = new WeakMap<object, object>();

function remember<TRow>(
  view: IncrementalView<TRow>,
  config: IncrementalViewConfig<TRow>
): IncrementalView<TRow> {
  CONFIGS.set(view, config);
  return view;
}

function configOf<TRow>(
  view: IncrementalView<TRow>
): IncrementalViewConfig<TRow> | undefined {
  return CONFIGS.get(view) as IncrementalViewConfig<TRow> | undefined;
}

function viewOf<TRow>(
  rows: readonly TRow[],
  filtered: readonly TRow[],
  config: IncrementalViewConfig<TRow>
): IncrementalView<TRow> {
  const sorted = hasSort(config) ? sortMatchedRows(filtered, config) : filtered;
  return remember(
    { rows, filtered, sorted, groups: undefined, aggregates: undefined },
    config
  );
}

function createBasicView<TRow>(
  rows: readonly TRow[],
  config: IncrementalViewConfig<TRow>
): IncrementalView<TRow> {
  const filtered = hasFilter(config)
    ? rows.filter((row) => rowMatches(row, config))
    : [...rows];
  return viewOf(rows, filtered, config);
}

/** The row objects a patch inserted or replaced: the only ones to evaluate. */
function patchedRows<TRow>(log: RowPatchLog<TRow>): ReadonlySet<TRow> {
  const touched = new Set<TRow>();
  for (const event of log.events) {
    if (event.type === "insert") touched.add(event.row);
    else if (event.type === "update") touched.add(event.next);
  }
  return touched;
}

/** Filter, sort, and search. No grouping and no aggregates. */
export function createBasicRowModel<TRow>(): RowModel<TRow> {
  return {
    create: createBasicView,
    reconfigure(view, patch, cleared) {
      const current = configOf(view);
      if (!current)
        return createBasicView(view.rows, patch as IncrementalViewConfig<TRow>);
      const merged: IncrementalViewConfig<TRow> = {
        ...current,
        ...definedConfigPatch(patch),
      };
      for (const key of cleared) delete merged[key];
      if (queryConfigFingerprint(current) === queryConfigFingerprint(merged)) {
        return remember(view, merged);
      }
      return createBasicView(view.rows, merged);
    },
    applyPatch(view, log) {
      if (log.events.length === 0) return view;
      const config = configOf(view);
      if (!config) return view;
      if (!hasFilter(config)) return viewOf(log.rows, [...log.rows], config);
      const touched = patchedRows(log);
      const matched = new Set(view.filtered);
      const filtered = log.rows.filter((row) =>
        touched.has(row) ? rowMatches(row, config) : matched.has(row)
      );
      return viewOf(log.rows, filtered, config);
    },
    fork(view) {
      const config = configOf(view);
      const filtered = view.filtered.slice();
      const sorted =
        view.sorted === view.filtered ? filtered : view.sorted.slice();
      const copy: IncrementalView<TRow> = {
        rows: view.rows,
        filtered,
        sorted,
        groups: undefined,
        aggregates: undefined,
      };
      return config ? remember(copy, { ...config }) : copy;
    },
  };
}
