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
 * Where one column's effective aggregation came from after the shared
 * precedence is applied: reader override or permitted suppression, then a
 * valid executable column default, then the original host mapper/request,
 * then inactive.
 *
 * @public
 */
export type EffectiveAggregationKind =
  "override" | "suppressed" | "default" | "host" | "inactive";

/**
 * The operation that should display, calculate and request for one column.
 *
 * Model and execution resolve this once so a default cannot appear active
 * while the host's original operation still runs.
 *
 * @public
 */
export interface EffectiveAggregation {
  /** Which precedence step won. */
  readonly kind: EffectiveAggregationKind;
  /**
   * The named operation when it is known. Absent for suppression, a truly
   * inactive column, or an opaque host mapper the table did not build.
   */
  readonly operationId?: string;
  /** Whether the reader may change or remove this column's aggregation. */
  readonly readerControl: boolean;
}

/** Inputs {@link resolveEffectiveAggregation} needs for one column. */
export interface EffectiveAggregationInput<TRow> {
  /** The column being resolved. */
  readonly column: ColumnMetadata<TRow>;
  /** The reader's choice for this column, when they made one. */
  readonly override?: string;
  /** What a mapper built by `aggregate()` declared. */
  readonly declared?: DeclaredAggregates;
  /** The developer's original server request. */
  readonly queryAggregates?: readonly QueryAggregate[];
  /**
   * Keys a mapper actually produced in the current grouped model. Presence
   * only — used to show a host cell, never to invent an operation.
   */
  readonly computedKeys?: readonly string[];
  /** Where grouping runs and which operations a backend listed. */
  readonly source?: AggregationSourceSupport;
}

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

/**
 * Whether the reader may change this column's aggregation here.
 *
 * An offer with no executable operation is not control: the host still owns
 * the cell, and a `"none"` override must not hide it.
 *
 * @public
 */
export function readerControlAllowed(
  resolved: ResolvedAggregatable | undefined,
  source?: AggregationSourceSupport
): boolean {
  return offerableOperations(resolved, source).length > 0;
}

/** What a host mapper or original request already computes for this column. */
function hostBaseline<TRow>(
  columnKey: string,
  input: Pick<
    EffectiveAggregationInput<TRow>,
    "declared" | "queryAggregates" | "computedKeys"
  >
): { present: boolean; operationId?: string } {
  const declared = input.declared?.[columnKey];
  if (declared !== undefined) {
    return {
      present: true,
      operationId: declared !== CUSTOM_AGGREGATE ? declared : undefined,
    };
  }
  const requested = input.queryAggregates?.find(
    (aggregate) => aggregate.key === columnKey
  );
  if (requested?.fn) {
    return { present: true, operationId: requested.fn };
  }
  if (input.computedKeys?.includes(columnKey) === true) {
    return { present: true };
  }
  return { present: false };
}

/**
 * Resolve the one aggregation that display, local calculation and the server
 * request must all honour.
 *
 * Precedence: a valid reader override or permitted suppression; a valid
 * executable column default; the original host mapper or request; inactive.
 * Defaults are never written into reader state.
 *
 * @typeParam TRow - The row type.
 * @param input - The column, the reader's choice, and the host baseline.
 * @returns The effective aggregation for that column.
 *
 * @public
 */
export function resolveEffectiveAggregation<TRow>(
  input: EffectiveAggregationInput<TRow>
): EffectiveAggregation {
  const resolved = resolveAggregatable(input.column);
  const readerControl = readerControlAllowed(resolved, input.source);
  const override = input.override;
  const host = hostBaseline(input.column.key, input);

  if (override !== undefined && readerControl) {
    if (override === AGGREGATE_SUPPRESSED) {
      return { kind: "suppressed", readerControl };
    }
    if (allowsReaderOperation(resolved, override, input.source)) {
      return {
        kind: "override",
        operationId: override,
        readerControl,
      };
    }
  }

  if (
    resolved?.initial !== undefined &&
    allowsReaderOperation(resolved, resolved.initial, input.source)
  ) {
    return {
      kind: "default",
      operationId: resolved.initial,
      readerControl,
    };
  }

  if (host.present) {
    return {
      kind: "host",
      operationId: host.operationId,
      readerControl,
    };
  }

  return { kind: "inactive", readerControl };
}

/**
 * The operations actually applied after defaults, host declarations and
 * validated overrides — for locally computed groups. Opaque host functions
 * stay unnamed.
 *
 * @typeParam TRow - The row type.
 * @param input - The same input {@link aggregationModel} reads.
 * @returns Named operations by column, or `undefined` when none are known.
 *
 * @public
 */
export function effectiveAggregateOps<TRow>(
  input: AggregationModelInput<TRow>
): Readonly<Record<string, string>> | undefined {
  const ops: Record<string, string> = {};
  for (const column of input.columns) {
    const effective = resolveEffectiveAggregation({
      column,
      override: input.overrides[column.key],
      declared: input.declared,
      queryAggregates: input.queryAggregates,
      computedKeys: input.computedKeys,
      source: input.source,
    });
    if (
      (effective.kind === "override" ||
        effective.kind === "default" ||
        effective.kind === "host") &&
      effective.operationId
    ) {
      ops[column.key] = effective.operationId;
    }
  }
  if (input.declared) {
    for (const [key, id] of Object.entries(input.declared)) {
      if (ops[key] === undefined && id !== CUSTOM_AGGREGATE) ops[key] = id;
    }
  }
  return Object.keys(ops).length > 0 ? ops : undefined;
}

/**
 * A column's offer, as a stable string the panel can watch.
 *
 * Changing allowed operations without changing the key used to leave a
 * stale `"none"` or a forbidden id in reader state forever.
 *
 * @typeParam TRow - The row type.
 * @param column - The column to fingerprint.
 * @returns A signature of its current aggregation offer.
 *
 * @public
 */
export function columnAggregationSignature<TRow>(
  column: ColumnMetadata<TRow>
): string {
  const resolved = resolveAggregatable(column);
  if (!resolved) return `${column.key}:-`;
  return `${column.key}:${resolved.initial ?? ""}:${resolved.operations
    .map((operation) => operation.id)
    .join("/")}`;
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
  const operations = offerableOperations(resolved, input.source);
  const effective = resolveEffectiveAggregation({
    column,
    override: input.overrides[column.key],
    declared: input.declared,
    queryAggregates: input.queryAggregates,
    computedKeys: input.computedKeys,
    source: input.source,
  });

  const candidate: AggregationCandidate | undefined =
    operations.length > 0
      ? {
          columnKey: column.key,
          active:
            effective.kind === "override" ||
            effective.kind === "default" ||
            effective.kind === "host",
          operations,
        }
      : undefined;

  if (effective.kind === "suppressed" || effective.kind === "inactive") {
    return { candidate };
  }
  if (effective.kind === "override") {
    return {
      candidate,
      item: {
        columnKey: column.key,
        operationId: effective.operationId,
        editable: true,
        origin: "reader",
        operations,
      },
    };
  }
  if (effective.kind === "default") {
    return {
      candidate,
      item: {
        columnKey: column.key,
        operationId: effective.operationId,
        editable: true,
        origin: "declared",
        operations,
      },
    };
  }
  return {
    candidate,
    item: {
      columnKey: column.key,
      operationId: effective.operationId,
      editable: effective.readerControl,
      origin: "host",
      operations: effective.readerControl ? operations : [],
    },
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
  const withoutOverride = resolveEffectiveAggregation({
    column,
    declared: input.declared,
    queryAggregates: input.queryAggregates,
    computedKeys: input.computedKeys,
    source: input.source,
  });
  return withoutOverride.kind === "default" || withoutOverride.kind === "host";
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
      // Suppression is a reader decision, and only while the column still
      // lets the reader decide. A later lock must not keep hiding the host.
      if (readerControlAllowed(resolveAggregatable(column), source)) {
        next[key] = value;
      } else {
        changed = true;
      }
      continue;
    }
    if (allowsReaderOperation(resolveAggregatable(column), value, source))
      next[key] = value;
    else changed = true;
  }
  return changed ? next : overrides;
}
