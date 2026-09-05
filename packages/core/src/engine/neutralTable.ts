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
  readonly capabilities: TableSourceCapabilities;
  readonly operations: Readonly<Record<string, boolean>>;
  readonly subscribe: TableEngine<TRow>["subscribe"];
  readonly dispose: () => void;
}

/**
 * Wrap an engine as {@link NeutralTable}. Getters read the latest snapshot.
 *
 * @public
 */
export function createNeutralTable<TRow>(
  engine: TableEngine<TRow>,
  tableId: string
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
      return engine.rows(scope);
    },
    rowByKey(rowKey) {
      return engine.rowByKey(rowKey);
    },
    get capabilities() {
      return engine.snapshot().capabilities;
    },
    get operations() {
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
