/**
 * What a reader may aggregate, and with which operations.
 *
 * One column-level declaration answers all three questions the table asks:
 * whether this column can be aggregated at all, which operations it offers,
 * and which of them it starts with. Everything else — the panel, the column
 * menu, the URL, a saved view, a server request — resolves through here, so
 * one column cannot offer Sum in one place and refuse it in another.
 */
import type { ColumnMetadata } from "../columnModel";
import type { GroupingCapability } from "../source/capabilities";
import { devWarn } from "../utils/devWarn";
import {
  AGGREGATE_NAMES,
  type AggregateName,
  type AggregateOrderedValue,
  type Aggregator,
} from "./aggregate";

/** Ids that mean removal or "the host calculates this itself", never an offer. */
const RESERVED_OPERATION_IDS = new Set(["none", "custom"]);

/**
 * An operation the host defines itself.
 *
 * `id` is what state stores and a server is asked for, so it has to be
 * stable; `label` is what a reader sees. `calculate` runs locally — leave it
 * out for an operation only a backend can answer.
 *
 * @typeParam TValue - The resolved column value the calculation receives.
 *
 * @public
 */
export interface CustomAggregateOperation<TValue = AggregateOrderedValue> {
  /** Stable identifier, unique within the column. Never a display string. */
  readonly id: string;
  /** What the reader sees in the operation list. */
  readonly label: string;
  /**
   * The local calculation. Omit it when only the server can answer this
   * operation; the table then offers it solely where the source declares it.
   */
  readonly calculate?: Aggregator<TValue>;
}

/**
 * One entry in a column's operation list: a built-in name or the host's own.
 *
 * @typeParam TValue - The resolved column value a custom calculation sees.
 *
 * @public
 */
export type AggregateOperation<TValue = AggregateOrderedValue> =
  AggregateName | CustomAggregateOperation<TValue>;

/**
 * A column's aggregation offer.
 *
 * @typeParam TValue - The resolved column value a custom calculation sees.
 *
 * @public
 */
export interface AggregatableConfig<TValue = AggregateOrderedValue> {
  /**
   * The operation this column starts with. It must name one of
   * `operations`; leave it out and the column is available but inactive
   * until a reader adds it.
   */
  readonly default?: string;
  /** Every operation a reader may choose. An empty list offers nothing. */
  readonly operations: readonly AggregateOperation<TValue>[];
}

/**
 * Whether — and how — a reader may aggregate this column.
 *
 * `false` or omitted refuses reader-controlled aggregation; `true` offers the
 * operations that suit the column's declared value type; an object says
 * exactly what to offer and what to start with.
 *
 * @typeParam TValue - The resolved column value a custom calculation sees.
 *
 * @public
 */
export type Aggregatable<TValue = AggregateOrderedValue> =
  boolean | AggregatableConfig<TValue>;

/**
 * One operation, resolved against a column.
 *
 * @public
 */
export interface ResolvedAggregateOperation {
  /** The stable id: a built-in name, or the host's own. */
  readonly id: string;
  /** Whether this is one of the table's own operations. */
  readonly builtIn: boolean;
  /** The host's label. Built-ins are localized by the chrome instead. */
  readonly label?: string;
  /** The local calculation, when this operation has one. */
  readonly calculate?: Aggregator;
}

/**
 * A column's aggregation offer, resolved and validated.
 *
 * @public
 */
export interface ResolvedAggregatable {
  /** The column this describes. */
  readonly columnKey: string;
  /** Every operation a reader may choose, in declaration order. */
  readonly operations: readonly ResolvedAggregateOperation[];
  /** The declared initial operation, when the column names one. */
  readonly initial?: string;
}

/** Operations that only make sense on something countable. */
const COUNT_ONLY: readonly AggregateName[] = ["count"];
/** Operations for a column whose values compare but do not add up. */
const ORDERED: readonly AggregateName[] = ["min", "max", "count"];
/** Everything, for a column declared numeric. */
const NUMERIC: readonly AggregateName[] = ["sum", "avg", "min", "max", "count"];

/** The declared type of a filter or editor, whichever form it takes. */
function declaredType(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value !== null && typeof value === "object") {
    const type = (value as { type?: unknown }).type;
    if (typeof type === "string") return type;
  }
  return undefined;
}

/**
 * The operations `aggregatable: true` offers.
 *
 * Read from what the column already declares — its filter or editor type —
 * never from a row's runtime value: one row is not the column, and a table
 * that guesses from the first page changes its own menu on page two. With
 * nothing declared, Count is the honest answer, because counting is the one
 * operation that means something for every kind of value.
 *
 * @param column - The column to read.
 * @returns Built-in names, in the order a reader should see them.
 *
 * @public
 */
export function impliedOperations<TRow>(
  column: ColumnMetadata<TRow>
): readonly AggregateName[] {
  const declared = declaredType(column.filter) ?? declaredType(column.editor);
  if (declared === "number" || declared === "numberRange") return NUMERIC;
  if (
    declared === "date" ||
    declared === "dateRange" ||
    declared === "datetime" ||
    declared === "time"
  ) {
    return ORDERED;
  }
  return COUNT_ONLY;
}

/** Whether a value is one of the table's own operation names. */
function isBuiltIn(id: string): id is AggregateName {
  return (AGGREGATE_NAMES as readonly string[]).includes(id);
}

/**
 * Resolve one column's aggregation offer.
 *
 * @typeParam TRow - The row type.
 * @param column - The column to resolve.
 * @returns The offer, or `undefined` when the column refuses aggregation.
 *
 * @public
 */
export function resolveAggregatable<TRow>(
  column: ColumnMetadata<TRow>
): ResolvedAggregatable | undefined {
  const declared = column.aggregatable;
  if (declared === undefined || declared === false) return undefined;
  const config: AggregatableConfig =
    declared === true ? { operations: impliedOperations(column) } : declared;

  const operations: ResolvedAggregateOperation[] = [];
  const seen = new Set<string>();
  for (const operation of config.operations) {
    const resolved = resolveOperation(operation, column.key, seen);
    if (resolved) {
      seen.add(resolved.id);
      operations.push(resolved);
    }
  }
  if (operations.length === 0) return undefined;

  return {
    columnKey: column.key,
    operations,
    initial: resolveInitial(config.default, operations, column.key),
  };
}

/** One declared operation, or `undefined` when the declaration is unusable. */
function resolveOperation(
  operation: AggregateOperation,
  columnKey: string,
  seen: ReadonlySet<string>
): ResolvedAggregateOperation | undefined {
  if (typeof operation === "string") {
    // Typed callers cannot reach this branch with an unknown name; JavaScript
    // ones can, and a name the table does not own must not become a silent
    // no-op cell.
    const id: string = operation;
    if (!isBuiltIn(id)) {
      devWarn(
        `column "${columnKey}" lists an unknown aggregate operation "${id}". Use one of ${AGGREGATE_NAMES.join(", ")}, or declare it as { id, label, calculate }.`
      );
      return undefined;
    }
    return duplicate(id, columnKey, seen) ? undefined : { id, builtIn: true };
  }
  if (operation.id === "" || operation.label === "") {
    devWarn(
      `column "${columnKey}" declares a custom aggregate operation without an id and a label. Both are required — the id is what state and a server carry, the label is what a reader reads.`
    );
    return undefined;
  }
  if (isBuiltIn(operation.id) || RESERVED_OPERATION_IDS.has(operation.id)) {
    devWarn(
      `column "${columnKey}" declares a custom aggregate operation with the reserved id "${operation.id}". Choose an id the table does not already own.`
    );
    return undefined;
  }
  if (duplicate(operation.id, columnKey, seen)) return undefined;
  return {
    id: operation.id,
    builtIn: false,
    label: operation.label,
    calculate: operation.calculate,
  };
}

/** Whether this id is already taken on the column, and says so if it is. */
function duplicate(
  id: string,
  columnKey: string,
  seen: ReadonlySet<string>
): boolean {
  if (!seen.has(id)) return false;
  devWarn(
    `column "${columnKey}" lists the aggregate operation "${id}" twice. Operation ids are unique within a column; the second is ignored.`
  );
  return true;
}

/** The declared default, when it names an operation the column offers. */
function resolveInitial(
  declared: string | undefined,
  operations: readonly ResolvedAggregateOperation[],
  columnKey: string
): string | undefined {
  if (declared === undefined) return undefined;
  if (operations.some((operation) => operation.id === declared)) {
    return declared;
  }
  devWarn(
    `column "${columnKey}" defaults to the aggregate operation "${declared}", which is not in its operations list. The column starts inactive rather than with an operation it does not offer.`
  );
  return undefined;
}

/**
 * Every column that offers reader-controlled aggregation, resolved once.
 *
 * @typeParam TRow - The row type.
 * @param columns - The table's columns.
 * @returns The resolved offers, keyed by column.
 *
 * @public
 */
export function resolveAggregatableColumns<TRow>(
  columns: readonly ColumnMetadata<TRow>[]
): ReadonlyMap<string, ResolvedAggregatable> {
  const out = new Map<string, ResolvedAggregatable>();
  for (const column of columns) {
    const resolved = resolveAggregatable(column);
    if (resolved) out.set(column.key, resolved);
  }
  return out;
}

/**
 * Whether a column allows one operation id.
 *
 * The one gate every entry point shares — the panel, the column menu, a URL,
 * a saved view, an assistant command. A stale id from any of them is refused
 * here rather than calculated.
 *
 * @param resolved - The column's resolved offer, if it has one.
 * @param operationId - The id to check.
 * @returns Whether the column offers that operation.
 *
 * @public
 */
export function allowsOperation(
  resolved: ResolvedAggregatable | undefined,
  operationId: string
): boolean {
  if (!resolved) return false;
  return resolved.operations.some((operation) => operation.id === operationId);
}

/**
 * What the data layer can actually compute for a reader-chosen operation.
 *
 * A column's offer is necessary but not sufficient: a local `calculate` does
 * not prove a server knows that id, and a backend-only id is not something
 * the browser can invent an answer for.
 *
 * @public
 */
export interface AggregationSourceSupport {
  /** Where grouping runs, when the source has said. */
  readonly grouping?: GroupingCapability;
  /**
   * Operation ids the backend can compute. Omit it and the five standard
   * functions are assumed when grouping is server-side.
   */
  readonly aggregateOperations?: readonly string[];
}

/**
 * The operations a reader may actually choose, given the column and the source.
 *
 * @param resolved - The column's resolved offer.
 * @param source - Where grouping runs and what the backend listed.
 * @returns The operations still on offer, in declaration order.
 *
 * @public
 */
export function offerableOperations(
  resolved: ResolvedAggregatable | undefined,
  source?: AggregationSourceSupport
): readonly ResolvedAggregateOperation[] {
  if (!resolved) return [];
  return resolved.operations.filter((operation) =>
    sourceAllows(operation, source)
  );
}

/**
 * Whether a reader may ask for one operation on this column, here.
 *
 * The one gate every entry point shares — the panel, the column menu, a URL,
 * a saved view, a request, a local calculation.
 *
 * @public
 */
export function allowsReaderOperation(
  resolved: ResolvedAggregatable | undefined,
  operationId: string,
  source?: AggregationSourceSupport
): boolean {
  return offerableOperations(resolved, source).some(
    (operation) => operation.id === operationId
  );
}

/** Whether this operation can run against the source that is answering. */
function sourceAllows(
  operation: ResolvedAggregateOperation,
  source: AggregationSourceSupport | undefined
): boolean {
  const grouping = source?.grouping;
  if (grouping === "server") {
    const listed = source?.aggregateOperations;
    if (listed) return listed.includes(operation.id);
    // `aggregates: true` without a list: the five the contract already names.
    return operation.builtIn;
  }
  // Local grouping — or no grouping capability yet — needs a calculator.
  return operation.builtIn || operation.calculate !== undefined;
}
