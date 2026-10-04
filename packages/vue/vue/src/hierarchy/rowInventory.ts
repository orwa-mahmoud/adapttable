/** One inventory distinguishes loaded row liveness from rendered hierarchy order. */
import { partitionPinnedRows } from "@adapttable/core";
import type { RowPinningState } from "@adapttable/core/binding";

import type { TableGrouping, TableTree } from "./models";
export interface TableRowInventory<TRow> {
  readonly loadedRows: readonly TRow[];
  readonly visibleRows: readonly TRow[];
}
export function tableRowInventory<TRow>(input: {
  readonly rows: readonly TRow[];
  readonly rowKey: (row: TRow) => string;
  readonly grouping?: TableGrouping<TRow>;
  readonly tree?: TableTree<TRow>;
  readonly pinning?: RowPinningState<TRow>;
}): TableRowInventory<TRow> {
  const { rows, grouping, tree, pinning } = input;
  if (grouping)
    return {
      loadedRows: rows,
      visibleRows: grouping.entries.flatMap((entry) =>
        entry.kind === "row" ? [entry.row] : []
      ),
    };
  if (tree)
    return {
      loadedRows: tree.allEntries.map((entry) => entry.row),
      visibleRows: tree.entries.map((entry) => entry.row),
    };
  if (pinning) {
    const { top, scroll, bottom } = partitionPinnedRows(
      rows,
      pinning.state,
      input.rowKey
    );
    return { loadedRows: rows, visibleRows: [...top, ...scroll, ...bottom] };
  }
  return { loadedRows: rows, visibleRows: rows };
}
