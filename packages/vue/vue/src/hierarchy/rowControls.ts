/** Native-neutral event wiring and structural metadata shared by every Vue kit. */
import {
  type Direction,
  type TableLabels,
  treeCardStyle,
  type TreeEntry,
  treeIndentStyle,
} from "@adapttable/core";

import type { Attrs } from "../attrs";
import type {
  RowDetailModel,
  TableRowDetail,
  TableTree,
  TreeCellModel,
} from "./models";
export function hierarchyRowAttrs<TRow>(
  entry: TreeEntry<TRow> | undefined,
  card: boolean
): Attrs {
  if (!entry) return {};
  return {
    "aria-level": entry.level + 1,
    "aria-expanded": entry.hasChildren ? entry.expanded : undefined,
    "aria-posinset":
      entry.siblingIndex === undefined ? undefined : entry.siblingIndex + 1,
    style: card ? treeCardStyle(entry.level) : undefined,
  };
}
export function hierarchyDetail<TRow>(
  row: TRow,
  id: string,
  detail: TableRowDetail<TRow> | undefined,
  labels: Required<TableLabels>
): RowDetailModel | undefined {
  if (!detail) return undefined;
  const expanded = detail.expansion.isExpanded(id);
  return {
    expanded,
    toggleAttrs: {
      type: "button",
      "aria-expanded": expanded,
      "aria-label": expanded ? labels.collapseRow : labels.expandRow,
      "data-adapttable-part": "expand-button",
      onClick: (event: Event) => {
        event.stopPropagation();
        detail.expansion.toggle(id);
      },
    },
    render: () => detail.render(row),
  };
}
export function hierarchyCell<TRow>(input: {
  readonly columnKey: string;
  readonly entry: TreeEntry<TRow> | undefined;
  readonly tree: TableTree<TRow> | undefined;
  readonly labels: Required<TableLabels>;
  readonly dir: () => Direction;
  readonly card: boolean;
}): TreeCellModel<TRow> | undefined {
  const { entry, tree, labels, columnKey, card } = input;
  if (!tree || !entry || columnKey !== tree.columnKey) return undefined;
  const toggleAttrs: Attrs | undefined = entry.hasChildren
    ? {
        type: "button",
        "data-adapttable-part": "tree-toggle",
        "aria-label": entry.expanded ? labels.collapseRow : labels.expandRow,
        "aria-expanded": entry.expanded,
        "aria-busy": entry.loading ? true : undefined,
        onClick: (event: Event) => {
          event.stopPropagation();
          tree.expansion.toggle(entry.key);
        },
        onKeydown: (event: KeyboardEvent) => {
          const openKey = input.dir() === "rtl" ? "ArrowLeft" : "ArrowRight";
          const closeKey = input.dir() === "rtl" ? "ArrowRight" : "ArrowLeft";
          if (event.key !== openKey && event.key !== closeKey) return;
          event.stopPropagation();
          event.preventDefault();
          if ((event.key === openKey) !== entry.expanded)
            tree.expansion.toggle(entry.key);
        },
      }
    : undefined;
  return {
    entry,
    attrs: {
      "data-adapttable-part": "tree-cell",
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        ...(!card ? treeIndentStyle(entry.level) : {}),
      },
    },
    toggleAttrs,
  };
}
