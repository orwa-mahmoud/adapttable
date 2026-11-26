/**
 * The row evaluator both table engines run.
 *
 * A view is an immutable record: the rows, the rows the query keeps in
 * source order, their sorted order, and — when a derived stage is installed —
 * the groups and totals. Evaluating never writes a record that exists. A
 * patch, a new configuration or a callback refresh returns a new record, so a
 * committed table and a staged candidate share rows without sharing state.
 *
 * A patch batch is netted per row id before anything runs. Only the rows it
 * brings in are matched and keyed. Which earlier rows stay is read from the
 * previous record, and the new rows are placed in the sorted order by binary
 * search over the sort values the record keeps with its sorted rows, then
 * copied in one pass.
 */
import type { SortableValue } from "../contracts/columns";
import type { SortLevel } from "../contracts/query";
import type { RowPatchLog } from "../contracts/rows";
import { compareSortEntries, compareSortLevel } from "../sort/compare";
import type { IncrementalView, IncrementalViewConfig } from "./incremental";
import { attachIncrementalView } from "./incrementalView";
import { rowPatchLogStartsAt } from "./patch";
import {
  definedConfigPatch,
  hasFilter,
  queryConfigFingerprint,
  rowMatcher,
  sortLevels,
  sortValueReader,
} from "./rowQuery";

/**
 * What a stage after the query adds to a record: groups and totals, and how
 * to continue them.
 */
export interface Derivation<TRow> {
  readonly groups: IncrementalView<TRow>["groups"];
  readonly aggregates: IncrementalView<TRow>["aggregates"];
  /**
   * The derivation after `left` rows left the sorted rows and `entered` rows
   * entered them, leaving `sorted`. Never writes this one.
   */
  readonly patch: (
    sorted: readonly TRow[],
    left: readonly TRow[],
    entered: readonly TRow[],
    config: IncrementalViewConfig<TRow>
  ) => Derivation<TRow>;
}

/** The stage after the query: groups and totals. */
export interface DerivedStage<TRow> {
  /** Groups and totals for `sorted`, from nothing; `undefined` when none are configured. */
  readonly derive: (
    sorted: readonly TRow[],
    config: IncrementalViewConfig<TRow>
  ) => Derivation<TRow> | undefined;
  /**
   * `view` with its groups and totals derived again under `config`, when the
   * stage reads `config` differently from the one `view` was built with;
   * `undefined` when the groups and totals stand.
   */
  readonly rederive: (
    view: IncrementalView<TRow>,
    evaluation: Evaluation<TRow>,
    config: IncrementalViewConfig<TRow>,
    mode: ReconfigureMode
  ) => IncrementalView<TRow> | undefined;
}

/** How a record was evaluated. */
export interface Evaluation<TRow> {
  /** Written only by the public in-place configure, never by an engine. */
  config: IncrementalViewConfig<TRow>;
  /** The sorted rows with their sort values, in order; absent when nothing sorts. */
  readonly entries: readonly SortEntry<TRow>[] | undefined;
  readonly stage: DerivedStage<TRow> | undefined;
  readonly derivation: Derivation<TRow> | undefined;
}

const EVALUATION = /* @__PURE__ */ Symbol("adapttable.evaluation");

interface EvaluatedView<TRow> extends IncrementalView<TRow> {
  [EVALUATION]: Evaluation<TRow>;
}

function isEvaluated<TRow>(
  view: IncrementalView<TRow>
): view is EvaluatedView<TRow> {
  return EVALUATION in view;
}

/** How `view` was evaluated, or `undefined` for a record this module did not build. */
export function evaluationOf<TRow>(
  view: IncrementalView<TRow>
): Evaluation<TRow> | undefined {
  return isEvaluated(view) ? view[EVALUATION] : undefined;
}

/** How `view` was evaluated; `caller` names who refused a foreign record. */
export function evaluated<TRow>(
  view: IncrementalView<TRow>,
  caller: string
): Evaluation<TRow> {
  const evaluation = evaluationOf(view);
  if (!evaluation) {
    throw new Error(`${caller} needs a snapshot from createIncrementalView`);
  }
  return evaluation;
}

/**
 * A record over `fields`. Its evaluation is not enumerable, so a record
 * compares, spreads and serializes as its five public fields.
 */
function record<TRow>(
  fields: IncrementalView<TRow>,
  evaluation: Evaluation<TRow>
): EvaluatedView<TRow> {
  const view: EvaluatedView<TRow> = { ...fields, [EVALUATION]: evaluation };
  Object.defineProperty(view, EVALUATION, { enumerable: false });
  return view;
}

/**
 * A record over fresh row arrays, with what the stage derived from them. The
 * arrays point back at it.
 */
export function derivedRecord<TRow>(
  rows: readonly TRow[],
  filtered: readonly TRow[],
  sorted: readonly TRow[],
  evaluation: Evaluation<TRow>
): IncrementalView<TRow> {
  const { derivation } = evaluation;
  const view = record(
    {
      rows,
      filtered,
      sorted,
      groups: derivation?.groups,
      aggregates: derivation?.aggregates,
    },
    evaluation
  );
  attachIncrementalView(rows, view);
  attachIncrementalView(filtered, view);
  attachIncrementalView(sorted, view);
  return view;
}

/**
 * A sorted row and its sort values. The first level's value sits apart, so a
 * one-level sort reads no array.
 */
interface SortEntry<TRow> {
  readonly row: TRow;
  /** The first level's value. */
  readonly value: SortableValue;
  /** The values of the levels after the first, when there are any. */
  readonly rest?: readonly SortableValue[];
  /** Position in the rows the entry was read from, for ties while they sort. */
  readonly index: number;
}

/** Each level's reader, prepared once per sort. */
function sortReaders<TRow>(
  levels: readonly SortLevel[],
  config: IncrementalViewConfig<TRow>
): ((row: TRow) => SortableValue)[] {
  return levels.map((level) => sortValueReader(level.key, config));
}

function entryOf<TRow>(
  row: TRow,
  index: number,
  readers: readonly ((row: TRow) => SortableValue)[]
): SortEntry<TRow> {
  const value = readers[0]!(row);
  if (readers.length === 1) return { row, index, value };
  const rest: SortableValue[] = [];
  for (let level = 1; level < readers.length; level++) {
    rest.push(readers[level]!(row));
  }
  return { row, index, value, rest };
}

/** Order two entries level by level; `0` is a tie. */
function compareEntries<TRow>(
  levels: readonly SortLevel[],
  a: SortEntry<TRow>,
  b: SortEntry<TRow>
): number {
  const first = compareSortLevel(a.value, b.value, levels[0]!.dir);
  if (first !== undefined) return first;
  // An indexed loop: this runs n·log n times in a build, and an iterator per
  // comparison is most of what the sort would cost.
  for (let level = 1; level < levels.length; level++) {
    const decided = compareSortLevel(
      a.rest?.[level - 1],
      b.rest?.[level - 1],
      levels[level]!.dir
    );
    if (decided !== undefined) return decided;
  }
  return 0;
}

/**
 * `filtered` in sorted order, as entries; ties in source order. A one-level
 * sort compares entries as the shared single-key comparator does.
 */
function sortedEntries<TRow>(
  filtered: readonly TRow[],
  levels: readonly SortLevel[],
  config: IncrementalViewConfig<TRow>
): SortEntry<TRow>[] {
  const [only] = levels;
  const compare =
    levels.length === 1 && only
      ? (a: SortEntry<TRow>, b: SortEntry<TRow>) =>
          compareSortEntries(a, b, only.dir)
      : (a: SortEntry<TRow>, b: SortEntry<TRow>) =>
          compareEntries(levels, a, b) || a.index - b.index;
  const readers = sortReaders(levels, config);
  return filtered
    .map((row, index) => entryOf(row, index, readers))
    .sort(compare);
}

/**
 * Where a row sits in `filtered`, read only when two rows tie on every sort
 * level. A few rows placed into a large table look themselves up; a batch
 * large enough to tie often indexes the rows once.
 */
function sourcePositions<TRow>(
  filtered: readonly TRow[],
  batch: number
): (row: TRow) => number {
  if (batch <= SCAN_POSITIONS_UP_TO) {
    return (row) => filtered.indexOf(row);
  }
  let positions: Map<TRow, number> | undefined;
  return (row) => {
    positions ??= new Map(filtered.map((item, index) => [item, index]));
    return positions.get(row) ?? -1;
  };
}

/** The batch size up to which a tie scans for a row's position. */
const SCAN_POSITIONS_UP_TO = 16;

/**
 * `previous` without `leaving`, with `entered` placed by binary search: a
 * comparison count that grows with the batch, not the rows, and one copy.
 * Ties fall back to source order, read from `filtered` on the first one.
 */
function mergedEntries<TRow>(
  previous: readonly SortEntry<TRow>[],
  leaving: ReadonlySet<TRow>,
  entered: readonly TRow[],
  levels: readonly SortLevel[],
  config: IncrementalViewConfig<TRow>,
  filtered: readonly TRow[]
): SortEntry<TRow>[] {
  const kept =
    leaving.size > 0
      ? previous.filter((entry) => !leaving.has(entry.row))
      : previous;
  const positionOf = sourcePositions(filtered, entered.length);
  const order = (a: SortEntry<TRow>, b: SortEntry<TRow>) =>
    compareEntries(levels, a, b) || positionOf(a.row) - positionOf(b.row);
  const readers = sortReaders(levels, config);
  const incoming = entered
    .map((row, index) => entryOf(row, index, readers))
    .sort(order);
  const merged: SortEntry<TRow>[] = [];
  let from = 0;
  for (const entry of incoming) {
    let lo = from;
    let hi = kept.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (order(kept[mid]!, entry) <= 0) lo = mid + 1;
      else hi = mid;
    }
    while (from < lo) merged.push(kept[from++]!);
    merged.push(entry);
  }
  while (from < kept.length) merged.push(kept[from++]!);
  return merged;
}

/** Evaluate `rows` under `config` from nothing. */
export function evaluateRows<TRow>(
  rows: readonly TRow[],
  config: IncrementalViewConfig<TRow>,
  stage: DerivedStage<TRow> | undefined
): IncrementalView<TRow> {
  const filtered = hasFilter(config)
    ? rows.filter(rowMatcher(config))
    : [...rows];
  const levels = sortLevels(config);
  const entries =
    levels.length > 0 ? sortedEntries(filtered, levels, config) : undefined;
  const sorted = entries ? entries.map((entry) => entry.row) : filtered;
  return derivedRecord(rows, filtered, sorted, {
    config,
    entries,
    stage,
    derivation: stage?.derive(sorted, config),
  });
}

/** One row's net change over a batch. */
interface NetChange<TRow> {
  /** The object the record held before the batch; absent for an insert. */
  readonly before: TRow | undefined;
  /** The object the batch leaves; absent for a remove. */
  readonly after: TRow | undefined;
  /** An insert or a remove ran, so the row may have moved. */
  readonly moved: boolean;
}

function eventRows<TRow>(
  event: RowPatchLog<TRow>["events"][number]
): [before: TRow | undefined, after: TRow | undefined] {
  if (event.type === "update") return [event.prev, event.next];
  if (event.type === "remove") return [event.row, undefined];
  return [undefined, event.row];
}

/**
 * Each touched row's first and last object. Events chain by the object they
 * replace — an update or a remove names the object the previous event left —
 * so a row that a patch renamed, and a later patch updates, renames again or
 * removes under its new id, nets to one change. A row that comes back as the
 * same object after an insert or a remove may have moved, so it still counts.
 */
function netChanges<TRow>(log: RowPatchLog<TRow>): NetChange<TRow>[] {
  const changes: {
    before: TRow | undefined;
    after: TRow | undefined;
    moved: boolean;
  }[] = [];
  const current = new Map<TRow, number>();
  for (const event of log.events) {
    const [before, after] = eventRows(event);
    const at = before === undefined ? undefined : current.get(before);
    const moved = event.type !== "update";
    if (at === undefined) {
      changes.push({ before, after, moved });
    } else {
      const known = changes[at]!;
      current.delete(before!);
      known.after = after;
      known.moved ||= moved;
    }
    if (after !== undefined) current.set(after, at ?? changes.length - 1);
  }
  return changes.filter(
    (change) => change.moved || change.before !== change.after
  );
}

/**
 * The objects a batch replaced, the ones it left, and those of the latter
 * that `matches` keeps (all of them without a filter).
 */
function changedRows<TRow>(
  changes: readonly NetChange<TRow>[],
  matches: ((row: TRow) => boolean) | undefined
): { before: Set<TRow>; after: Set<TRow>; entered: TRow[] } {
  const before = new Set<TRow>();
  const after = new Set<TRow>();
  const entered: TRow[] = [];
  for (const change of changes) {
    if (change.before !== undefined) before.add(change.before);
    if (change.after === undefined) continue;
    after.add(change.after);
    if (!matches || matches(change.after)) entered.push(change.after);
  }
  return { before, after, entered };
}

/**
 * A batch of more than one event in this many rows is evaluated from
 * nothing: placing that many rows one by one costs more than sorting them
 * all, and a patch is never slower than a build.
 */
const PATCH_SHARE = 16;

/**
 * Below this many rows a patch and a build both take microseconds, so a
 * patch always runs and keeps to the rows it changed.
 */
const SHARE_FROM_ROWS = 1024;

/**
 * Continue `view` from a patch log whose base is `view.rows`. A log over
 * other rows, or a batch that changes a large share of them, is evaluated
 * from nothing.
 */
export function applyPatchLog<TRow>(
  view: IncrementalView<TRow>,
  log: RowPatchLog<TRow>
): IncrementalView<TRow> {
  const evaluation = evaluated(view, "applyRowPatchLogToView");
  if (log.events.length === 0) return view;
  const { config, stage } = evaluation;
  if (!rowPatchLogStartsAt(log, view.rows)) {
    return evaluateRows(log.rows, config, stage);
  }
  const rows = log.rows.length;
  if (rows >= SHARE_FROM_ROWS && log.events.length * PATCH_SHARE > rows) {
    return evaluateRows(log.rows, config, stage);
  }
  const changes = netChanges(log);
  const filtering = hasFilter(config);
  const { before, after, entered } = changedRows(
    changes,
    filtering ? rowMatcher(config) : undefined
  );
  const { filtered, left } = filtering
    ? keepFiltered(view.filtered, log.rows, before, after, new Set(entered))
    : { filtered: log.rows, left: [...before] };
  if (filtering && left.length === 0 && entered.length === 0) {
    // Only rows the query leaves out changed: the results stand, and their
    // arrays keep pointing at the records that already show them.
    const next = record({ ...view, rows: log.rows }, evaluation);
    attachIncrementalView(log.rows, next);
    return next;
  }
  const entries =
    evaluation.entries &&
    mergedEntries(
      evaluation.entries,
      new Set(left),
      entered,
      sortLevels(config),
      config,
      filtered
    );
  const sorted = entries ? entries.map((entry) => entry.row) : filtered;
  return derivedRecord(log.rows, filtered, sorted, {
    config,
    entries,
    stage,
    derivation: evaluation.derivation?.patch(sorted, left, entered, config),
  });
}

/**
 * The filtered rows after a patch, in source order, and the earlier ones that
 * left. Rows the patch did not touch keep their earlier answer: they appear
 * in `previous` and in `rows` in the same relative order, so one walk over
 * both reads it without asking the filter again.
 */
function keepFiltered<TRow>(
  previous: readonly TRow[],
  rows: readonly TRow[],
  before: ReadonlySet<TRow>,
  after: ReadonlySet<TRow>,
  entering: ReadonlySet<TRow>
): { filtered: TRow[]; left: TRow[] } {
  const filtered: TRow[] = [];
  const left: TRow[] = [];
  let at = 0;
  const skipReplaced = () => {
    while (at < previous.length && before.has(previous[at]!)) {
      left.push(previous[at]!);
      at += 1;
    }
  };
  for (const row of rows) {
    if (after.has(row)) {
      if (entering.has(row)) filtered.push(row);
      continue;
    }
    skipReplaced();
    if (previous[at] === row) {
      filtered.push(row);
      at += 1;
    }
  }
  skipReplaced();
  return { filtered, left };
}

/**
 * Where a reconfigured record keeps its results. `"new record"` never writes
 * `view` and gives rebuilt groups and totals their own row arrays, so the
 * snapshot attached to the arrays a caller still shows keeps describing
 * `view`. `"in place"` is the public configure: a configuration that keeps
 * the results goes onto `view` itself, and rebuilt groups and totals share
 * its row arrays.
 */
export type ReconfigureMode = "new record" | "in place";

/** `view` under `patch` merged into its configuration, minus `cleared`. */
export function reconfigureView<TRow>(
  view: IncrementalView<TRow>,
  patch: Partial<IncrementalViewConfig<TRow>>,
  cleared: readonly (keyof IncrementalViewConfig<TRow>)[],
  mode: ReconfigureMode
): IncrementalView<TRow> {
  const evaluation = evaluated(view, "configureIncrementalView");
  const before = evaluation.config;
  const merged: IncrementalViewConfig<TRow> = {
    ...before,
    ...definedConfigPatch(patch),
  };
  for (const key of cleared) delete merged[key];
  const { stage } = evaluation;
  if (queryConfigFingerprint(before) !== queryConfigFingerprint(merged)) {
    return evaluateRows(view.rows, merged, stage);
  }
  const rederived = stage?.rederive(view, evaluation, merged, mode);
  if (rederived) return rederived;
  if (mode === "new record") {
    return record(view, { ...evaluation, config: merged });
  }
  evaluation.config = merged;
  return view;
}
