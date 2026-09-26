/**
 * What a feature above the table can read about the table below it.
 *
 * A feature's hooks or controller mount ABOVE the chrome, so they cannot be
 * handed values the chrome computes — that is a cycle. They read them
 * instead, at the moment they need them, which for a drag handler or an
 * announcement is always an event rather than a render. These are the shapes
 * of that read; each binding publishes them its own way.
 */
import type { ColumnMetadata, ExtraFilters } from "../columnModel";
import type { PinSide } from "../columns/columnLayoutModel";
import type { NeutralTable } from "../engine/neutralTable";
import type { FilterDef } from "../filters/filterDefs";
import type { FilterTypeRegistry } from "../filters/filterRegistry";
import type { GroupAggregateOverrides } from "../grouping/groupAggregateOverrides";
import type { RowPinSide } from "../rows/rowPinModel";
import type { TableSourceCapabilities } from "../source/capabilities";
import type { QueryAggregate } from "../source/queryContract";
import type { BulkAction, RowAction } from "../types";

/**
 * The latest fully composed view of a table, as a feature above it reads it.
 *
 * @public
 */
export interface TableRuntimeView<TRow = unknown> {
  /** Rows in the materialized source view (page scope). */
  readonly rows: readonly TRow[];
  /**
   * Rendered data-row order after grouping/tree expansion. When set, differs
   * from {@link rows} under grouping or tree chrome.
   */
  readonly visibleRows?: readonly TRow[];
  /** Live neutral binding when the source published an engine. */
  readonly neutralTable?: NeutralTable<TRow>;
  /** Stable row identity. */
  readonly getRowId: (row: TRow) => string;
  /** Best available human-readable row label. */
  readonly rowLabel: (row: TRow) => string;
  /** Active sort key, when visual order is source-controlled. */
  readonly sortBy?: string;
  /** Live grouping bundle; feature providers narrow this structurally. */
  readonly grouping?: unknown;
  /** URL/source-backed grouping state used by optional interaction chrome. */
  readonly groupingState?: {
    readonly groupBy: string | undefined;
    readonly aggregateOverrides: GroupAggregateOverrides;
    readonly columnLabel: (key: string) => string;
    /**
     * The table's columns — the schema, not the currently visible subset.
     * Hiding a column must not drop its aggregate; a key gone from the
     * schema is the one that is reconciled away.
     */
    readonly columns?: readonly ColumnMetadata<TRow>[];
    /** Aggregate keys the host's mapper produced in a computed group row. */
    readonly computedAggregateKeys?: readonly string[];
    /**
     * The developer's original `aggregates` declaration, not the response
     * now on screen.
     */
    readonly queryAggregates?: readonly QueryAggregate[];
    /** Operation ids the backend listed, when it named them. */
    readonly aggregateOperations?: readonly string[];
    /** Whether a server source will honour aggregate requests. */
    readonly honorsAggregates?: boolean;
    readonly setGroupBy: (key: string | undefined) => void;
    readonly initializeGroupBy?: (key: string) => void;
    readonly setAggregateOverrides?: (
      overrides: GroupAggregateOverrides
    ) => void;
  };
  /** Live tree bundle; feature providers narrow this structurally. */
  readonly tree?: unknown;
  /**
   * Page, search and sort the source currently owns.
   *
   * Optional so a test-published view can omit it. Live chrome fills it
   * so a feature above the table can apply ordinary view operations.
   */
  readonly query?: {
    readonly page: number;
    readonly limit: number;
    /**
     * Rows matching the current query, when the source counted them.
     *
     * The filtered total, not the dataset and not the rows on screen. Absent
     * where the source cannot say, which a consumer must carry as unknown
     * rather than substituting what happens to be loaded.
     */
    readonly total?: number;
    /**
     * The table's default page size, so a rows-per-page list can keep it
     * after the reader picks another size.
     */
    readonly defaultLimit?: number;
    readonly search: string;
    readonly sortBy?: string;
    readonly sortDir?: "asc" | "desc";
    readonly setPage: (page: number) => void;
    readonly setLimit: (limit: number) => void;
    readonly setSearch: (search: string) => void;
    readonly setSort: (key?: string, dir?: "asc" | "desc") => void;
    readonly extra?: ExtraFilters;
    readonly setExtras?: (extra: ExtraFilters) => void;
    readonly clearExtras?: () => void;
  };
  /**
   * Declarative filter definitions the live chrome resolved. Absent when
   * the host never published defs (a custom form with no catalog).
   */
  readonly filterDefs?: readonly FilterDef<TRow>[];
  /** Type registry those defs were built against. */
  readonly filterRegistry?: FilterTypeRegistry;
  /**
   * Declared source capabilities from the live `TableSource`, when the
   * source published a contract. Never inferred here.
   */
  readonly sourceCapabilities?: TableSourceCapabilities;
  /**
   * The host's own row and bulk actions, when it composed any. A binding may
   * offer them to an agent; the table's built-in add, duplicate, delete and
   * pin controls are not among them.
   */
  readonly actions?: {
    readonly row: readonly RowAction<TRow>[];
    readonly bulk: readonly BulkAction[];
  };
  /** Live selection, when a selection-owning feature is composed. */
  readonly selection?: {
    readonly selectedIds: ReadonlySet<string>;
    readonly replace: (ids: readonly string[] | undefined) => void;
  };
  /**
   * Live pinning, when a pin-owning feature is composed.
   *
   * Column sides are logical (`start`/`end`), so the same request is correct
   * under RTL. Row sides are physical (`top`/`bottom`) because a pinned row
   * is above or below the scrolled body in every writing direction.
   *
   * `columns` and `rows` are the CURRENT state, so unpinning is an inverse
   * of what is actually pinned rather than a reset of the whole layout.
   */
  readonly pinning?: {
    /** Column key to the edge it is pinned to. */
    readonly columns: Readonly<Record<string, PinSide>>;
    /** Pin a column to an edge, or unpin it with `undefined`. */
    readonly setColumnPin?: (key: string, side: PinSide | undefined) => void;
    /** Row keys pinned above and below the scrolled body. */
    readonly rows?: {
      readonly top: readonly string[];
      readonly bottom: readonly string[];
    };
    /** Pin a row to an edge, or unpin it with `undefined`. */
    readonly setRowPin?: (rowKey: string, side: RowPinSide | undefined) => void;
  };
  /**
   * Live hide and order, when a layout-owning feature is composed.
   *
   * Column layout is always present as state; the setters are only real
   * when the reader can hide and reorder too. Advertising a no-op would
   * tell the agent it moved a column the table left alone.
   */
  readonly columnLayout?: {
    /** Full order, hidden columns included. */
    readonly keys: readonly string[];
    /** Column ids the reader has hidden. */
    readonly hidden: readonly string[];
    readonly setHidden?: (key: string, hidden: boolean) => void;
    readonly move?: (key: string, toIndex: number) => void;
    readonly setOrder?: (order: readonly string[]) => void;
  };
  /**
   * Live editing channels. `onCellEdit` is the host callback; `stageCell`
   * is the batch/dirty path when batch editing is composed.
   */
  readonly editing?: {
    readonly onCellEdit?: (
      row: TRow,
      key: string,
      nextValue: unknown
    ) => unknown;
    readonly stageCell?: (
      row: TRow,
      rowId: string,
      columnKey: string,
      value: string
    ) => void;
  };
}

/**
 * The live table a feature above it reads, from event handlers.
 *
 * @public
 */
export interface TableRuntime<TRow = unknown> {
  /** The row at a rendered index, or `undefined` once it has scrolled away. */
  rowAt(localIndex: number): TRow | undefined;
  /** The table's resolved labels, for announcements. */
  labels(): Readonly<Record<string, unknown>> | undefined;
  /** Latest fully composed view, read only from event handlers. */
  view(): TableRuntimeView<TRow> | undefined;
  /** Composed feature ids for this table, including optional ones. */
  featureIds(): readonly string[];
}
