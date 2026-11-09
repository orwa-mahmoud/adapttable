/**
 * Column, value and aggregate-field contracts.
 *
 * Leaf types only. Importing this module pulls no table implementation.
 * `columnModel` and the aggregate modules forward these names.
 */
import type { DisplayValue } from "../display";

/**
 * Sort direction for a column.
 *
 * @public
 */
export type SortDirection = "asc" | "desc";

/**
 * Comparable primitive returned by a sort-value extractor.
 *
 * @public
 */
export type SortableValue = string | number | boolean | null | undefined;

/**
 * A value min/max can rank: the sortable primitives plus a `Date`.
 *
 * `SortableValue` stays the sort-key type. A date column's raw cell is a
 * `Date` without a `sortValue`, and min/max keep that original rather than
 * forcing it through a number first.
 *
 * @public
 */
export type AggregateOrderedValue = SortableValue | Date;

/**
 * The aggregate functions available by name.
 *
 * @public
 */
export type AggregateName = "sum" | "avg" | "count" | "min" | "max";

/**
 * An operation id: a built-in name, or one a column declared itself.
 *
 * The open half is what carries a host's `{ id, label, calculate }` operation
 * through state, a URL and a request; the named half is what keeps built-ins
 * autocompleting.
 *
 * @public
 */
export type AggregateOperationId =
  AggregateName | (string & Record<never, never>);

/**
 * A custom aggregator: the values found for one column across the rows being
 * aggregated, already narrowed to those that are present.
 *
 * Return whatever the cell should show — a number, a formatted string, a
 * node. Return `undefined` for "no cell here".
 *
 * The return type is `DisplayValue` so the built mapper is directly assignable
 * to `summaryRow` and `groupAggregates`, which is the whole point of it.
 *
 * @public
 */
export type Aggregator<TValue = AggregateOrderedValue> = (
  values: readonly TValue[]
) => DisplayValue | undefined;

/**
 * What the table knows about the aggregate a column is about to show.
 *
 * @public
 */
export interface AggregateFormatContext {
  /** The column the value belongs to. */
  readonly columnKey: string;
  /**
   * The operation that produced it, when the table knows: the reader's own
   * choice, or the one a server was asked for — a built-in name, or the id of
   * an operation the column declared itself. A hand-written `groupAggregates`
   * mapper declares nothing, so this is absent there.
   */
  readonly aggregation?: AggregateOperationId;
}

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
   * What this operation does, for anything reading the table rather than
   * looking at it.
   *
   * A built-in needs none: "avg" means the same thing on every table. Your own
   * does not — an agent meets the id and the label and has no way to know
   * whether "band" is a range, a percentile or something only this business
   * says. Write the sentence you would say to a colleague; it is handed over
   * when the capability is described.
   */
  readonly description?: string;
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
 * When a leaf under a collapsible column group is visible.
 *
 * @public
 */
export type ColumnGroupShow = "open" | "closed" | "always";

/**
 * A single extra-filter value as it round-trips through URL state.
 *
 * @public
 */
export type FilterValue = string | string[] | number | undefined;

/**
 * The bag of extra (caller-defined) filter values keyed by filter name.
 *
 * @public
 */
export type ExtraFilters = Record<string, FilterValue>;

/**
 * Neutral filter metadata. React `ColumnDef` narrows this to `ColumnFilter`.
 *
 * @public
 */
export type ColumnModelFilter = string | Readonly<Record<string, unknown>>;

/**
 * Neutral editor metadata. React `ColumnDef` narrows this to `CellEditor`.
 *
 * @public
 */
export type ColumnModelEditor = string | Readonly<Record<string, unknown>>;

/**
 * Neutral column — identity, values, and operation metadata. No renderers.
 *
 * @public
 */
export interface ColumnModel<TRow = unknown> {
  /**
   * Unique within the table. Also the value sent to a backend as `sortBy`,
   * and the default row data path for the cell value.
   */
  key: string;
  /**
   * What an agent is told about this column.
   *
   * Authored, never inferred: a header reading `st` tells a model nothing, and
   * no heuristic can recover that it means settlement status. Ignored entirely
   * on a table with no agent.
   */
  ai?: ColumnAiOptions;
  /** Plain-text header caption. Bindings may store richer nodes separately. */
  header?: string;
  /** Native tooltip on the header caption. */
  headerTooltip?: string;
  /**
   * Allow the user to change this column's display name from the Columns
   * menu. The table keeps the stable `key`.
   */
  renameable?: boolean;
  /**
   * How readily this column is given up when the table is too narrow.
   * Priority 1 is kept longest.
   */
  responsivePriority?: number;
  /**
   * Presentational header group. A string is one level; a path stacks rows.
   */
  group?: string | readonly string[];
  /**
   * When this leaf sits under a collapsible group.
   */
  groupShow?: ColumnGroupShow;
  /**
   * Per-locale data paths for this column's value.
   */
  i18n?: Readonly<Record<string, string>>;
  /**
   * Declarative filter for this column. React columns narrow the type.
   */
  filter?: ColumnModelFilter;
  /**
   * Opt this column into inline cell editing.
   */
  editable?: boolean | ((row: TRow) => boolean);
  /**
   * Editor widget when editable. React columns narrow the type.
   */
  editor?: ColumnModelEditor;
  /**
   * Override the draft seed for the editor (raw value).
   */
  editValue?: (row: TRow) => string;
  /**
   * Turn the edited text back into the value to commit.
   */
  parseValue?: (draft: string, row: TRow) => unknown;
  /**
   * Gate a commit on this column's own rule.
   */
  validate?: (
    value: unknown,
    row: TRow
  ) => string | undefined | Promise<string | undefined>;
  /**
   * What this column reads from a row.
   *
   * Neutral here, because export, clipboard and selection statistics all need
   * a cell's value and none of them can render one. A binding narrows it to
   * whatever it renders — `@adapttable/react`'s `ColumnDef.accessor` returns
   * a `ReactNode` — and every context that needs plain data keeps the value
   * only when it is already a primitive or a Date, falling through to
   * `sortValue` when the binding returned something it drew instead.
   */
  accessor?: (row: TRow) => unknown;
  /**
   * Primitive extractor used by the client-side sort comparator.
   */
  sortValue?: (row: TRow) => SortableValue;
  /**
   * What this column buckets a row by when the table groups on it, and the
   * caption the group then carries.
   *
   * Without it a group is one distinct sort value, which is right for a team
   * or a status and wrong for anything continuous: group by a timestamp and
   * every row is its own group, captioned with the raw number. Return the
   * bucket — the month a date falls in, the band a number sits in — and rows
   * sharing it group together under it.
   */
  groupValue?: (row: TRow) => unknown;
  /**
   * The value this column contributes to an export.
   */
  exportValue?: (row: TRow) => unknown;
  /**
   * The cell as plain text, for every context that cannot render JSX.
   */
  formatValue?: (row: TRow) => string;
  /**
   * How an aggregate of this column reads.
   *
   * A group header, a group footer and a mobile group card show what
   * `groupAggregates` — or the reader's own choice of sum, average, count —
   * computed for this column. That answer is a number, and a number under a
   * money column should read as money. This turns the computed value into
   * what is shown, and is given the operation that produced it where the
   * table knows it, so a count can read as a count under the same column.
   *
   * Presentation only: the value the table holds, exports and compares stays
   * exactly what the aggregate returned.
   */
  formatAggregate?: (
    value: DisplayValue | undefined,
    context: AggregateFormatContext
  ) => DisplayValue | undefined;
  /** Enable sorting for this column. Off by default. */
  sortable?: boolean;
  /**
   * Whether a reader may group by this column. On by default, because any
   * column can be grouped by; set `false` for one that would only make
   * nonsense of the strip — a unique id, a free-text note, a running total.
   * The header stops offering itself to the grouping panel, and the panel
   * stops offering the column.
   */
  groupable?: boolean;
  /**
   * Whether — and how — a reader may aggregate this column.
   *
   * Omitted or `false` refuses reader-controlled aggregation. `true` offers
   * the operations that suit the column's declared value type — numeric for
   * a number filter or editor, min/max/count for a date, Count otherwise.
   * An object says exactly what to offer, and `default` says which operation
   * the column starts with:
   *
   * ```ts
   * aggregatable: { default: "sum", operations: ["sum", "avg", "min", "max"] }
   * ```
   *
   * A host's own operation is `{ id, label, calculate }`; the id is what
   * state and a server carry, so it stays stable while the label may be
   * localized freely.
   */
  aggregatable?: Aggregatable;
  /** Column width passed through to the rendered header/cell. */
  width?: number | string;
  /** Floor for this column's width, in pixels. */
  minWidth?: number;
  /** Ceiling for this column's width, in pixels. */
  maxWidth?: number;
  /** This column's share of leftover width when the table fits its container. */
  flex?: number;
  /** Text alignment within the cell. Defaults to `"start"`. */
  align?: "start" | "center" | "end";
  /** How many columns this cell covers. */
  colSpan?: number | ((row: TRow) => number);
  /** How many rows this cell covers. */
  rowSpan?: number | ((row: TRow) => number);
  /** Label used on mobile card layouts. */
  mobileLabel?: string;
  /** Hide this column entirely on mobile layouts. */
  hideOnMobile?: boolean;
  /** Hide this column entirely on desktop layouts. */
  hideOnDesktop?: boolean;
  /** Gray out the menu's reorder grip. */
  lockPosition?: boolean;
  /** Gray out the menu's show/hide control. */
  lockVisibility?: boolean;
  /** Gray out resize and per-column auto-size. */
  lockWidth?: boolean;
  /** Gray out the menu's pin control. */
  lockPin?: boolean;
  /** Arbitrary metadata adapters may read. */
  meta?: Record<string, unknown>;
}

/**
 * What a developer chose to tell an agent about one column.
 *
 * @public
 */
export interface ColumnAiOptions {
  /** One line about what the column means. */
  description?: string;
  /**
   * Representative values.
   *
   * Validated against the column's declared type before they are exported: an
   * example of the wrong shape teaches a call the schema will refuse.
   */
  examples?: readonly unknown[];
  /**
   * Whether live values may be sampled from this column.
   *
   * Off by default, capped in count, and never honoured on a column an agent
   * may not read. Opting in is a decision about disclosure, so it is made
   * explicitly rather than turned on by a heuristic.
   */
  sample?: boolean;
}

/**
 * Column shape neutral helpers and the engine read. Bindings may attach
 * richer header nodes and React filter/editor specs; neutral code never
 * interprets those as renderers.
 *
 * @public
 */
export type ColumnMetadata<TRow = unknown> = Omit<
  ColumnModel<TRow>,
  "header" | "filter"
> & {
  header?: unknown;
  filter?: unknown;
};
