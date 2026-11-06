/**
 * What a feature above the table can read about the table below it.
 *
 * A feature's hooks or controller mount ABOVE the chrome, so they cannot be
 * handed values the chrome computes — that is a cycle. They read them
 * instead, at the moment they need them, which for a drag handler or an
 * announcement is always an event rather than a render. These are the shapes
 * of that read; each binding publishes them its own way.
 */

import type {
  ColumnLayoutContribution,
  PinningContribution,
} from "../columns/columnLayoutModel";
import type { ColumnMetadata } from "../contracts/columns";
import type { QueryAggregate } from "../contracts/query";
import type { TableSourceCapabilities } from "../contracts/source";
import type { NeutralTable } from "../engine/neutralTable";
import type { FilterDef } from "../filters/filterDefs";
import type { FilteringContribution } from "../filters/filterFormModel";
import type { FilterTypeRegistry } from "../filters/filterRegistry";
import type { GroupAggregateOverrides } from "../grouping/groupAggregateOverrides";
import type { SelectionContribution } from "../selection/selectionBindingState";
import type { QueryContribution } from "../source/queryContract";
import type { TreeContribution } from "../tree/treeBindingState";
import type { BulkAction, RowAction } from "../types";
import type {
  EditingContribution,
  GroupingContribution,
} from "./featureContribution";
import type {
  CommandPaletteContribution,
  ContextMenuContribution,
  DensityContribution,
  FindContribution,
  FullscreenContribution,
  PrintContribution,
} from "./shellOperations";

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
  /**
   * Grouping's owned entries, projected for compatibility.
   *
   * The runtime stores the contribution a binding or feature already owns.
   * It does not keep a second grouping controller.
   */
  readonly grouping?: GroupingContribution<TRow>;
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
  /**
   * The host's walked tree. Grouping is a separate contribution. Expansion
   * stays on the tree controller; this view aliases the host's entries.
   */
  readonly tree?: TreeContribution<TRow>;
  /**
   * Page, search, and sort the source currently owns.
   *
   * Optional so a test-published view can omit it. Live chrome fills it
   * so a feature above the table can apply ordinary view operations.
   * Applied values stay here. The catalog is {@link FilteringContribution}.
   */
  readonly query?: QueryContribution;
  /**
   * The filter catalog the host published.
   *
   * {@link filterDefs} and {@link filterRegistry} are this contribution's
   * fields, projected so existing readers keep those names. Applied values
   * stay on {@link TableRuntimeView.query}.
   */
  readonly filtering?: FilteringContribution<TRow>;
  /**
   * Declarative filter definitions the live chrome resolved. Absent when
   * the host never published defs (a custom form with no catalog).
   *
   * The same array as {@link FilteringContribution.defs}.
   */
  readonly filterDefs?: readonly FilterDef<TRow>[];
  /**
   * Type registry those defs were built against.
   *
   * The same registry as {@link FilteringContribution.registry}.
   */
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
  /**
   * Live selection, when a selection-owning feature is composed.
   *
   * The host's set and replace function. Grouping reads those ids through
   * `groupSelectionState` and does not keep another copy.
   */
  readonly selection?: SelectionContribution;
  /**
   * Live pinning, when a pin-owning feature is composed.
   *
   * Column sides are logical (`start`/`end`), so the same request is correct
   * under RTL. Row sides are physical (`top`/`bottom`) because a pinned row
   * is above or below the scrolled body in every writing direction.
   *
   * `columns` and `rows` are the current state, so unpinning is an inverse
   * of what is actually pinned rather than a reset of the whole layout.
   * Row pinning and column pinning stay separate controllers.
   */
  readonly pinning?: PinningContribution;
  /**
   * Live hide and order, when a layout-owning feature is composed.
   *
   * Column layout is always present as state; the setters are only real
   * when the reader can hide and reorder too. Advertising a no-op would
   * tell the agent it moved a column the table left alone.
   */
  readonly columnLayout?: ColumnLayoutContribution;
  /**
   * Live editing channels. `onCellEdit` is the host callback; `stageCell`
   * is the batch/dirty path when batch editing is composed.
   */
  readonly editing?: EditingContribution<TRow>;
  /**
   * The find bar, when find is composed and can open.
   *
   * The find controller's own state. Absent when find is off, so the view
   * does not advertise a bar the table does not have.
   */
  readonly find?: FindContribution;
  /**
   * The density chooser, when that feature is composed.
   *
   * A table that only renders a default density does not publish this.
   */
  readonly density?: DensityContribution;
  /**
   * Fullscreen, when the feature is composed and the browser supports it.
   */
  readonly fullscreen?: FullscreenContribution;
  /**
   * The context menu, when that feature is composed.
   *
   * The host's factories or the menu model the binding already resolved.
   */
  readonly contextMenu?: ContextMenuContribution<TRow>;
  /**
   * The command palette, when that feature is armed.
   *
   * `commands` is the host's list.
   */
  readonly commandPalette?: CommandPaletteContribution;
  /**
   * Print, when the host wired a print handler and asked for the control.
   */
  readonly print?: PrintContribution;
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
