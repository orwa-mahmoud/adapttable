/**
 * Source capability contracts.
 *
 * What a source can answer. The inference that reads a live source stays in
 * `source/capabilities`, which forwards these names.
 */

/**
 * Where the row grouping a table shows can be computed.
 *
 * @public
 */
export type GroupingCapability = "client" | "server" | false;

/**
 * How much of the data an export can honestly cover.
 *
 * @public
 */
export type ExportScopeCapability = "all" | "page";

/**
 * Whether `total` counts the dataset or only what has been loaded.
 *
 * @public
 */
export type TotalCountCapability = "exact" | "loaded";

/**
 * What a table may offer, given the source behind it.
 *
 * Every field is a fact about the DATA LAYER, never about what the host asked
 * for: a capability says a control CAN work, not that it is on.
 *
 * @public
 */
export interface TableSourceCapabilities {
  /**
   * The whole filtered set is reachable, not just the page on screen.
   * Export-all, client grouping and select-across-pages all rest on this.
   */
  readonly fullDataset: boolean;
  /**
   * Where grouping happens: in the browser over the full set, on the server
   * which returns group rows, or nowhere.
   */
  readonly grouping: GroupingCapability;
  /** Selection can mean "all N matching", not just the rows on screen. */
  readonly selectAcrossPages: boolean;
  /** The widest scope an export can cover without quietly narrowing. */
  readonly exportScope: ExportScopeCapability;
  /** Whether the row count is the dataset's or only what has arrived. */
  readonly totalCount: TotalCountCapability;
  /**
   * Operation ids a server can compute. Absent unless the source named them.
   * A local `calculate` never appears here.
   */
  readonly aggregateOperations?: readonly string[];
}

/**
 * The parts of a source a capability read consults.
 *
 * A caller that holds only a slice — the notice collector carries group rows
 * as opaque data — can ask without owning a whole source, and a source that
 * omits a field simply loses the capability that field would have unlocked.
 *
 * @public
 */
export interface CapabilitySource {
  /** Every filtered row, when the source can hand them over. */
  readonly allFilteredRows?: readonly unknown[];
  /** Group rows the server computed, when it computes them. */
  readonly groups?: unknown;
  /** Rows across every page, when the source counted them. */
  readonly total?: number;
  /** What the source declares, which wins over everything below. */
  readonly capabilities?: TableSourceCapabilities;
}
