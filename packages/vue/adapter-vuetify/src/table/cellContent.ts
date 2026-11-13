import type { TableCellModel, TableRowModel } from "@adapttable/vue";
import {
  type DataTableClassNames,
  mergeVueAttrs,
  renderCell,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNode } from "vue";

import { requiredControl } from "./requiredControl";

/** Paint prepared cell content; edits, trees and detail actions stay with the binding. */
export function vuetifyCellContent<TRow>(
  cell: TableCellModel<TRow>,
  row: TableRowModel<TRow>,
  controls: TableChromeSlots<TRow>,
  names: DataTableClassNames,
  inlineDetail: boolean
): VNode {
  const display = renderCell(cell.context, controls.cell);
  const content = cell.render ? cell.render(display) : display;
  const value = cell.addon
    ? h(Fragment, [content, cell.addon(names.fillHandle)])
    : content;
  const tree = cell.tree;
  const treeContent = tree
    ? h("span", mergeVueAttrs(tree.attrs, { class: names.treeCell }), [
        tree.toggleAttrs
          ? requiredControl(
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
            }),
        value,
      ])
    : value;
  if (!inlineDetail || !row.detail || cell !== row.cells[0])
    return h(Fragment, null, [treeContent]);
  return h(Fragment, [
    requiredControl(
      controls.RowDetailToggle,
      "RowDetailToggle"
    )({
      attrs: mergeVueAttrs(row.detail.toggleAttrs, {
        class: [names.expandButton, names.expandToggle],
      }),
      expanded: row.detail.expanded,
    }),
    treeContent,
  ]);
}
