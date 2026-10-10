import type { TableCellModel, TableRowModel } from "@adapttable/vue";
import {
  mergeVueAttrs,
  renderCell,
  type TableChromeClassNames,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNodeChild } from "vue";

/** Present prepared cell content; state, edits and hierarchy remain in the binding. */
export function quasarCellContent<TRow>(
  cell: TableCellModel<TRow>,
  row: TableRowModel<TRow>,
  controls: TableChromeSlots<TRow>,
  names: TableChromeClassNames,
  inlineDetail: boolean
): VNodeChild {
  const display = renderCell(cell.context, controls.cell);
  const content = [
    cell.render ? cell.render(display) : display,
    cell.addon?.(names.fillHandle),
  ];
  const tree = cell.tree;
  const treeContent = tree
    ? h(
        "span",
        mergeVueAttrs(tree.attrs, {
          class: ["adapttable-quasar-tree", names.treeCell],
        }),
        [
          tree.toggleAttrs
            ? requiredControl(
                controls.TreeToggle,
                {
                  attrs: paintToggle(tree.toggleAttrs, names.treeToggle),
                  expanded: tree.entry.expanded,
                  loading: tree.entry.loading === true,
                },
                "TreeToggle"
              )
            : h("span", {
                "aria-hidden": "true",
                "data-adapttable-part": "tree-spacer",
                class: ["adapttable-quasar-tree-spacer", names.treeSpacer],
              }),
          ...content,
        ]
      )
    : content;
  return h(Fragment, null, [
    inlineDetail && row.detail && cell === row.cells[0]
      ? requiredControl(
          controls.RowDetailToggle,
          {
            attrs: paintToggle(row.detail.toggleAttrs, [
              names.expandButton,
              names.expandToggle,
            ]),
            expanded: row.detail.expanded,
          },
          "RowDetailToggle"
        )
      : null,
    treeContent,
  ]);
}

export function requiredControl<T>(
  control: ((props: T) => VNodeChild) | undefined,
  props: T,
  name: string
): VNodeChild {
  if (!control)
    throw new Error(`AdaptTable: Quasar requires the ${name} control.`);
  return control(props);
}

function paintToggle(
  attrs: Readonly<Record<string, unknown>>,
  className: unknown
) {
  return mergeVueAttrs(attrs, { class: className });
}
