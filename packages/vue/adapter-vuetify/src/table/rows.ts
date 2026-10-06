import type {
  DesktopTableModel,
  TableBodySlot,
  TableRowModel,
} from "@adapttable/vue";
import {
  type DataTableClassNames,
  elementRef,
  EXTRA_ROW_PARTS,
  extraUncoveredColSpans,
  mergeVueAttrs,
  selectionCheckboxControl,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNode, type VNodeChild } from "vue";

import { vuetifyCellContent } from "./cellContent";
import { vuetifyColumnSpacer } from "./headers";
import { requiredControl } from "./requiredControl";

/** Rows are already ordered, spanned, pinned and windowed by the binding. */
export function vuetifyBodyRows<TRow>(
  model: DesktopTableModel<TRow>,
  controls: TableChromeSlots<TRow>,
  names: DataTableClassNames
): VNode[] {
  function dataRow(row: TableRowModel<TRow>): VNode {
    const cells: VNodeChild[] = [];
    if (model.expandLabel)
      cells.push(
        h(
          "td",
          mergeVueAttrs(row.expandCellAttrs ?? {}, {
            "data-adapttable-part": "expand-cell",
            class: [names.td, names.expandCell],
          }),
          [
            row.detail
              ? requiredControl(
                  controls.RowDetailToggle,
                  "RowDetailToggle"
                )({
                  attrs: mergeVueAttrs(row.detail.toggleAttrs, {
                    class: [names.expandButton, names.expandToggle],
                  }),
                  expanded: row.detail.expanded,
                })
              : null,
          ]
        )
      );
    if (model.headerCheckboxAttrs)
      cells.push(
        h(
          "td",
          {
            "data-adapttable-part": "selection-cell",
            class: names.selectionCell,
          },
          [
            row.checkboxAttrs
              ? controls.SelectionCheckbox({
                  ...selectionCheckboxControl(row.checkboxAttrs),
                  attrs: mergeVueAttrs(row.checkboxAttrs, {
                    "data-adapttable-part": "checkbox",
                    class: names.selectionCheckbox,
                  }),
                  header: false,
                })
              : null,
          ]
        )
      );
    if (model.reorderLabel)
      cells.push(
        h(
          "td",
          {
            "data-adapttable-part": "reorder-cell",
            class: [names.td, names.reorderCell],
          },
          [row.reorder?.(false)]
        )
      );
    cells.push(vuetifyColumnSpacer(model, "td", "start"));
    cells.push(
      ...row.cells.map((cell) =>
        h(
          "td",
          {
            ...mergeVueAttrs(cell.attrs, {
              "data-adapttable-part": "cell",
              class: names.td,
            }),
            key: cell.key,
          },
          [vuetifyCellContent(cell, row, controls, names, !model.expandLabel)]
        )
      )
    );
    cells.push(vuetifyColumnSpacer(model, "td", "end"));
    if (model.actionsLabel)
      cells.push(
        h(
          "td",
          { "data-adapttable-part": "actions-cell", class: names.actionsCell },
          [
            row.editActions?.(),
            row.actionControls?.length
              ? requiredControl(
                  controls.RowActions,
                  "RowActions"
                )({ row: row.row, controls: row.actionControls, mobile: false })
              : null,
          ]
        )
      );
    const data = h(
      "tr",
      { ...mergeVueAttrs(row.attrs, { class: names.tr }), key: row.key },
      cells
    );
    if (!row.detail?.expanded) return data;
    return h(Fragment, { key: row.key }, [
      data,
      h(
        "tr",
        {
          "data-adapttable-part": "detail-row",
          class: names.detailRow,
          ref: row.detail.measure ? elementRef(row.detail.measure) : undefined,
        },
        [
          h(
            "td",
            {
              colspan: model.columnCount,
              "data-adapttable-part": "detail-cell",
              class: names.detailCell,
            },
            [row.detail.render()]
          ),
        ]
      ),
    ]);
  }
  function bodySlot(slot: TableBodySlot<TRow>): VNode {
    switch (slot.kind) {
      case "row":
        return dataRow(slot.wiring);
      case "group":
        return h(Fragment, { key: slot.key }, [
          requiredControl(
            controls.GroupRow,
            "GroupRow"
          )({
            slot,
            columnCount: model.columnCount,
            mobile: false,
            classNames: names,
          }),
        ]);
      case "virtualPad":
        return h(
          "tr",
          {
            key: slot.key,
            "aria-hidden": "true",
            "data-adapttable-part": "virtual-spacer",
            class: names.virtualSpacer,
          },
          [
            h("td", {
              colspan: slot.colSpan,
              style: { height: `${slot.height}px`, padding: 0, border: 0 },
            }),
          ]
        );
      default: {
        const parts = EXTRA_ROW_PARTS[slot.extraKind];
        const spans = extraUncoveredColSpans(slot.colSpan, slot.coveredSlots);
        return h(
          "tr",
          { ...slot.attrs, key: slot.key, "data-adapttable-part": parts.row },
          spans.map((span, index) =>
            h(
              "td",
              mergeVueAttrs(
                {
                  key: index,
                  colspan: span,
                  style: slot.fillStyle,
                  "data-adapttable-part": parts.cell,
                },
                {}
              ),
              index === 0 ? [slot.render?.()] : []
            )
          )
        );
      }
    }
  }
  return model.bodySlots
    ? model.bodySlots.map(bodySlot)
    : model.rows.map(dataRow);
}
