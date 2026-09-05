/**
 * Live handle AI and future bindings read. No React.
 */
import type { ColumnMetadata } from "../columnModel";
import type { TableSourceCapabilities } from "../source/capabilities";
import type {
  TableEngine,
  TableRevisionAxis,
  TableRevisions,
  TableRowScope,
} from "./createTableEngine";

/**
 * Binding-supplied row windows and operation wiring for {@link createNeutralTable}.
 *
 * @public
 */
export interface NeutralTableBinding<TRow = unknown> {
  /** Rendered data-row order after grouping/tree expansion. */
  readonly visibleRows?: () => readonly TRow[];
  /** Which view operations are actually wired on this table. */
  readonly operations?: () => Readonly<Record<string, boolean>>;
}

/**
 * Map four revision axes to one monotonic session token string.
 *
 * @public
 */
export function revisionToken(revisions: TableRevisions): string {
  return `${revisions.data}:${revisions.view}:${revisions.schema}:${revisions.policy}`;
}

/**
 * Neutral table interface for AI and non-React hosts.
 *
 * @public
 */
export interface NeutralTable<TRow = unknown> {
  readonly tableId: string;
  readonly revisions: TableRevisions;
  readonly columns: readonly ColumnMetadata<TRow>[];
  readonly cellValue: (row: TRow, columnKey: string) => unknown;
  readonly rows: (scope: TableRowScope) => readonly TRow[];
  readonly rowByKey: (rowKey: string) => TRow | undefined;
  readonly rowKey: (row: TRow) => string;
  readonly capabilities: TableSourceCapabilities;
  readonly operations: Readonly<Record<string, boolean>>;
  readonly subscribe: TableEngine<TRow>["subscribe"];
  readonly dispose: () => void;
}

function assertScopeAvailable(
  scope: TableRowScope,
  capabilities: TableSourceCapabilities
): void {
  if (scope === "full" && !capabilities.fullDataset) {
    throw new Error(
      'row scope "full" is not available — this source provides one page at a time'
    );
  }
}

function defaultOperations<TRow>(
  engine: TableEngine<TRow>
): Readonly<Record<string, boolean>> {
  const grouping = engine.snapshot().capabilities.grouping !== false;
  return {
    setSort: true,
    setSearch: true,
    setPage: true,
    setLimit: true,
    setFilters: true,
    setGroupBy: grouping,
    setSelection: true,
  };
}

/**
 * Wrap an engine as {@link NeutralTable}. Getters read the latest snapshot.
 *
 * @public
 */
export function createNeutralTable<TRow>(
  engine: TableEngine<TRow>,
  tableId: string,
  binding?: NeutralTableBinding<TRow>
): NeutralTable<TRow> {
  return {
    get tableId() {
      return tableId;
    },
    get revisions() {
      return engine.snapshot().revisions;
    },
    get columns() {
      return engine.snapshot().columns;
    },
    cellValue(row, columnKey) {
      return engine.cellValue(row, columnKey);
    },
    rows(scope) {
      assertScopeAvailable(scope, engine.snapshot().capabilities);
      if (scope === "visible") {
        return binding?.visibleRows?.() ?? engine.rows("page");
      }
      if (scope === "full") return engine.rows("full");
      return engine.rows("page");
    },
    rowByKey(rowKey) {
      return engine.rowByKey(rowKey);
    },
    rowKey(row) {
      return engine.rowKey(row);
    },
    get capabilities() {
      return engine.snapshot().capabilities;
    },
    get operations() {
      return binding?.operations?.() ?? defaultOperations(engine);
    },
    subscribe(
      axes: readonly TableRevisionAxis[] | "all",
      listener: (revisions: TableRevisions) => void
    ) {
      return engine.subscribe(axes, listener);
    },
    dispose() {
      engine.dispose();
    },
  };
}
