/**
 * Neutral consumer: engine operations without React installed.
 */
import { type ColumnMetadata, createTableEngine } from "@adapttable/core";

interface Row {
  id: string;
  name: string;
  team: string;
}

const columns: ColumnMetadata<Row>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team" },
];

const engine = createTableEngine<Row>({
  data: [
    { id: "1", name: "Ada", team: "ops" },
    { id: "2", name: "Grace", team: "eng" },
  ],
  columns,
  rowKey: (row) => row.id,
});

engine.dispatch({ type: "setSearch", search: "Ada" });
engine.dispatch({ type: "setSort", key: "name", dir: "asc" });
engine.dispatch({ type: "setPage", page: 1 });

const snapshot = engine.snapshot();
export const rowCount = engine.rows("page").length;
export const search = snapshot.search;
export const sortKey = snapshot.sortBy ?? null;
