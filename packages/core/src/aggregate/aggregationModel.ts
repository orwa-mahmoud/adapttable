/**
 * Which aggregations are active, and what a reader may do to them.
 *
 * One list, built from three sources that used to disagree: what a column
 * declares, what a developer's mapper or server request already computes, and
 * what the reader has since chosen. Every surface — the grouping panel, the
 * column menu, a URL, a saved view — reads this list and mutates it through
 * the transitions below, so a column offers the same operations wherever it
 * is touched and nothing stays active while invisible.
 */
import type { ColumnMetadata } from "../columnModel";
import type { QueryAggregate } from "../source/queryContract";
import {
  type AggregationSourceSupport,
  allowsReaderOperation,
  offerableOperations,
  resolveAggregatable,
  type ResolvedAggregatable,
  type ResolvedAggregateOperation,
} from "./aggregatable";
import { CUSTOM_AGGREGATE, type DeclaredAggregates } from "./aggregate";

/**
 * The serialized value meaning "the reader took this one away".
 *
 * It is state, never a calculation: removal is the only way to reach it and
 * removal is how a reader leaves it, so it never appears in an operation list.
 *
 * @public
 */
export const AGGREGATE_SUPPRESSED = "none";

/**
 * Where an active aggregation came from.
 *
 * @public
 */
export type AggregationOrigin = "reader" | "declared" | "host";

/**
 * One active aggregation, as a reader sees it.
 *
 * @public
 */
export interface AggregationItem {
  /** The column being aggregated. */
  readonly columnKey: string;
  /**
   * The operation producing the value, or `undefined` for a host mapper the
   * table can see the output of but not the operation behind.
   */
  readonly operationId?: string;
  /** Whether the reader may change the operation or take it away. */
  readonly editable: boolean;
  /** Where this aggregation came from. */
  readonly origin: AggregationOrigin;
  /** The operations a reader may switch to, empty when it is read-only. */
  readonly operations: readonly ResolvedAggregateOperation[];
}

/**
 * A column a reader may add, with the operations it offers.
 *
 * @public
 */
export interface AggregationCandidate {
  /** The column that may be added. */
  readonly columnKey: string;
  /** Whether it is already active — the picker shows it checked. */
  readonly active: boolean;
  /** The operations it offers. */
  readonly operations: readonly ResolvedAggregateOperation[];
}

/**
 * Everything the aggregation surfaces need to agree with each other.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface AggregationModelInput<TRow> {
  /** The table's columns, in the order a reader should see them. */
  readonly columns: readonly ColumnMetadata<TRow>[];
  /** The reader's own choices, as they serialize. */
  readonly overrides: Readonly<Partial<Record<string, string>>>;
  /**
   * What the host's `groupAggregates` mapper declares, when the table built
   * it with `aggregate()`. A hand-written mapper declares nothing.
   */
  readonly declared?: DeclaredAggregates;
  /**
   * The developer's original server `aggregates` declaration — the query
   * they wrote, not the response now on screen and not the reader's current
   * request.
   */
  readonly queryAggregates?: readonly QueryAggregate[];
  /**
   * Keys a mapper actually produced in a computed group row. Used only to
   * show that a host aggregate exists — never to guess which operation made
   * it.
   */
  readonly computedKeys?: readonly string[];
  /** Where grouping runs, and which operations a backend listed. */
  readonly source?: AggregationSourceSupport;
}

/**
 * The active aggregations and the columns a reader may still add.
 *
 * @public
 */
export interface AggregationModel {
  /** Active aggregations, in column order. */
  readonly items: readonly AggregationItem[];
  /** Every column offering reader-controlled aggregation. */
  readonly candidates: readonly AggregationCandidate[];
  /** Whether the reader has changed anything away from the declared setup. */
  readonly atDefaults: boolean;
}

/** What the developer declared for one column, whatever declared it. */
function developerOperation<TRow>(
  column: ColumnMetadata<TRow>,
  resolved: ResolvedAggregatable | undefined,
  input: AggregationModelInput<TRow>
): string | undefined {
  // An explicit `aggregatable.default` owns the column's initial operation;
  // only without one does an existing mapper or request get to supply it.
  if (resolved?.initial !== undefined) return resolved.initial;
  const declared = input.declared?.[column.key];
  if (declared !== undefined) return declared;
  const requested = input.queryAggregates?.find(
    (aggregate) => aggregate.key === column.key
  );
  return requested?.fn;
}

/**
 * Build the one list every aggregation surface reads.
 *
 * @typeParam TRow - The row type.
 * @param input - See {@link AggregationModelInput}.
 * @returns The active items, the columns still on offer, and whether the
 * reader has moved away from the declared setup.
 *
 * @public
 */
export function aggregationModel<TRow>(
  input: AggregationModelInput<TRow>
): AggregationModel {
  const items: AggregationItem[] = [];
  const candidates: AggregationCandidate[] = [];
  const covered = new Set<string>();

  for (const column of input.columns) {
    covered.add(column.key);
    const entry = columnEntry(column, input);
    if (entry.candidate) candidates.push(entry.candidate);
    if (entry.item) items.push(entry.item);
  }

  // A mapper may compute a key no column declares. It is still on screen.
  for (const key of input.computedKeys ?? []) {
    if (covered.has(key)) continue;
    items.push({
      columnKey: key,
      editable: false,
      origin: "host",
      operations: [],
    });
  }

  return { items, candidates, atDefaults: isAtDefaults(input.overrides) };
}

/** What one column contributes: an active item, an offer, or neither. */
function columnEntry<TRow>(
  column: ColumnMetadata<TRow>,
  input: AggregationModelInput<TRow>
): { item?: AggregationItem; candidate?: AggregationCandidate } {
  const resolved = resolveAggregatable(column);
  const developer = developerOperation(column, resolved, input);
  const override = input.overrides[column.key];
  const active = activeOperation(resolved, override, developer, input.source);

  if (resolved) {
    const operations = offerableOperations(resolved, input.source);
    if (operations.length === 0 && active === undefined) {
      return { item: hostOnlyItem(column.key, developer, undefined, input) };
    }
    const candidate: AggregationCandidate = {
      columnKey: column.key,
      active: active !== undefined,
      operations,
    };
    if (active === undefined) {
      return {
        candidate,
        item: hostOnlyItem(column.key, developer, resolved, input),
      };
    }
    return {
      candidate,
      item: {
        columnKey: column.key,
        operationId: active,
        editable: true,
        origin: override === active ? "reader" : "declared",
        operations,
      },
    };
  }
  // No reader-editable offer. A host aggregate may still exist here, and
  // hiding it would be a lie about what the group row shows: report it, and
  // say plainly that this one is not the reader's to change.
  return { item: hostOnlyItem(column.key, developer, resolved, input) };
}

/**
 * Which operation is active on a reader-editable column: the reader's own
 * choice when the column still allows it, otherwise the developer's, and
 * nothing at all once the reader has taken it away.
 */
function activeOperation(
  resolved: ResolvedAggregatable | undefined,
  override: string | undefined,
  developer: string | undefined,
  source?: AggregationSourceSupport
): string | undefined {
  if (!resolved) return undefined;
  if (override === AGGREGATE_SUPPRESSED) return undefined;
  // An operation the column no longer offers is ignored, not obeyed and not
  // treated as a removal: the declared setup is what stands while a stale
  // choice is on its way out.
  if (
    override !== undefined &&
    allowsReaderOperation(resolved, override, source)
  ) {
    return override;
  }
  if (developer === undefined) return undefined;
  return allowsReaderOperation(resolved, developer, source)
    ? developer
    : undefined;
}

/** A host aggregate the reader cannot change, when the column shows one. */
function hostOnlyItem<TRow>(
  columnKey: string,
  developer: string | undefined,
  resolved: ResolvedAggregatable | undefined,
  input: AggregationModelInput<TRow>
): AggregationItem | undefined {
  // A column the reader may edit is never reported as the host's: it is
  // either active above, or suppressed, and neither is read-only.
  if (resolved) return undefined;
  const computed = input.computedKeys?.includes(columnKey) === true;
  if (developer === undefined && !computed) return undefined;
  const named =
    developer !== undefined && developer !== CUSTOM_AGGREGATE
      ? developer
      : undefined;
  return {
    columnKey,
    operationId: named,
    editable: false,
    origin: "host",
    operations: [],
  };
}

/** Whether the reader has left the declared setup untouched. */
function isAtDefaults(
  overrides: Readonly<Partial<Record<string, string>>>
): boolean {
  return Object.values(overrides).every((value) => value === undefined);
}

/**
 * The operation a column starts with when a reader adds it.
 *
 * Its configured default when it has one, otherwise the first operation it
 * offers — the same order the documentation states.
 *
 * @param resolved - The column's resolved offer.
 * @returns The operation id to activate.
 *
 * @public
 */
export function initialOperation(
  resolved: ResolvedAggregatable,
  source?: AggregationSourceSupport
): string {
  const offered = offerableOperations(resolved, source);
  if (resolved.initial !== undefined) {
    const named = offered.find(
      (operation) => operation.id === resolved.initial
    );
    if (named) return named.id;
  }
  return offered[0]?.id ?? "";
}

/**
 * Turn one column's aggregation on.
 *
 * @param overrides - The reader's current choices.
 * @param columnKey - The column to activate.
 * @param operationId - The operation to activate it with.
 * @returns The next choices.
 *
 * @public
 */
export function addAggregation(
  overrides: Readonly<Partial<Record<string, string>>>,
  columnKey: string,
  operationId: string
): Readonly<Partial<Record<string, string>>> {
  return { ...overrides, [columnKey]: operationId };
}

/**
 * Take one column's aggregation away.
 *
 * Removing something the developer declared writes an explicit suppression:
 * deleting the entry would hand the column straight back to the developer's
 * default, which is the opposite of what the reader just asked for. Removing
 * a column the reader added themselves simply drops the entry.
 *
 * @param overrides - The reader's current choices.
 * @param columnKey - The column to deactivate.
 * @param declaredByDeveloper - Whether the developer declared this column.
 * @returns The next choices.
 *
 * @public
 */
export function removeAggregation(
  overrides: Readonly<Partial<Record<string, string>>>,
  columnKey: string,
  declaredByDeveloper: boolean
): Readonly<Partial<Record<string, string>>> {
  if (declaredByDeveloper) {
    return { ...overrides, [columnKey]: AGGREGATE_SUPPRESSED };
  }
  const next = { ...overrides };
  delete next[columnKey];
  return next;
}

/**
 * Whether the developer declared this column's aggregation.
 *
 * @typeParam TRow - The row type.
 * @param column - The column to check.
 * @param input - The same input {@link aggregationModel} reads.
 * @returns Whether removing it needs an explicit suppression.
 *
 * @public
 */
export function declaredByDeveloper<TRow>(
  column: ColumnMetadata<TRow>,
  input: AggregationModelInput<TRow>
): boolean {
  return (
    developerOperation(column, resolveAggregatable(column), input) !== undefined
  );
}

/**
 * Drop every reader choice, restoring the developer's setup exactly.
 *
 * @returns Empty choices.
 *
 * @public
 */
export function restoreAggregationDefaults(): Readonly<
  Partial<Record<string, string>>
> {
  return {};
}

/**
 * Keys a computed group row actually produced.
 *
 * Presence only — never the operation. Empty groups and empty data produce
 * nothing here; declared metadata still stands on its own.
 *
 * @param entries - The flat grouped model, when one has been computed.
 * @returns Distinct aggregate keys, in first-seen order.
 *
 * @public
 */
export function computedAggregateKeys(
  entries: readonly {
    readonly kind: string;
    readonly aggregateCells?: Readonly<Record<string, unknown>>;
  }[]
): readonly string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.kind !== "group" && entry.kind !== "groupFooter") continue;
    const cells = entry.aggregateCells;
    if (!cells) continue;
    for (const key of Object.keys(cells)) {
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Discard reader choices a column no longer allows.
 *
 * Columns disappear, configurations change, and a link or saved view can
 * carry an operation that was valid when it was written. Reconciling here
 * means a forbidden operation is never calculated, and an explicit
 * suppression survives — it is the reader's decision, not a stale value.
 *
 * @typeParam TRow - The row type.
 * @param overrides - The choices to check.
 * @param columns - The columns as they are now.
 * @returns The choices, or the same object when nothing had to change.
 *
 * @public
 */
export function reconcileAggregations<TRow>(
  overrides: Readonly<Partial<Record<string, string>>>,
  columns: readonly ColumnMetadata<TRow>[],
  source?: AggregationSourceSupport
): Readonly<Partial<Record<string, string>>> {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  let changed = false;
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    const column = byKey.get(key);
    if (!column) {
      changed = true;
      continue;
    }
    if (value === AGGREGATE_SUPPRESSED) {
      next[key] = value;
      continue;
    }
    if (allowsReaderOperation(resolveAggregatable(column), value, source))
      next[key] = value;
    else changed = true;
  }
  return changed ? next : overrides;
}
