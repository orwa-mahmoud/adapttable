import type { TableCellModel, TableRowModel } from "@adapttable/vue";
import {
  mergeVueAttrs,
  renderCell,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNodeChild } from "vue";

import type { DataTableClassNames } from "../types";

export function requireControl<T>(control: T | undefined, name: string): T {
  if (!control)
    throw new Error(
      `AdaptTable Naive UI: ${name} requires its matching kit feature.`
    );
  return control;
}

/** Paint the prepared content and controls without recomputing cell or tree state. */
export function naiveCellContent<TRow>(
  cell: TableCellModel<TRow>,
  row: TableRowModel<TRow>,
  controls: TableChromeSlots<TRow>,
  names: DataTableClassNames,
  inlineDetail: boolean
): VNodeChild {
  const display = renderCell(cell.context, controls.cell);
  const value = h(Fragment, null, [
    cell.render ? cell.render(display) : display,
    cell.addon?.(names.fillHandle),
  ]);
  const tree = cell.tree;
  const content = tree
    ? h("span", mergeVueAttrs(tree.attrs, { class: names.treeCell }), [
        tree.toggleAttrs
          ? requireControl(
              controls.TreeToggle,
              "TreeToggle"
            )({
              attrs: mergeVueAttrs(tree.toggleAttrs, {
                class: names.treeToggle,
              }),
              expanded: tree.entry.expanded,
              loading: tree.entry.loading === true,
            })
          : h("span", {
              "aria-hidden": "true",
              "data-adapttable-part": "tree-spacer",
              class: names.treeSpacer,
              style: { display: "inline-block", width: "1.5em", flexShrink: 0 },
            }),
        value,
      ])
    : value;
  return h(Fragment, null, [
    inlineDetail && row.detail && cell === row.cells[0]
      ? requireControl(
          controls.RowDetailToggle,
          "RowDetailToggle"
        )({
          attrs: mergeVueAttrs(row.detail.toggleAttrs, {
            class: [names.expandButton, names.expandToggle],
          }),
          expanded: row.detail.expanded,
        })
      : null,
    content,
  ]);
}
