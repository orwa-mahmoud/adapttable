import type {
  MobileCardsModel,
  TableBodySlot,
  TableRowModel,
} from "@adapttable/vue";
import {
  EXTRA_ROW_PARTS,
  mergeVueAttrs,
  renderFooter,
  selectionCheckboxControl,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { NCard } from "naive-ui";
import { Fragment, h, type VNodeChild } from "vue";

import type { DataTableClassNames } from "../types";
import { naiveCellContent, requireControl } from "./content";
import { naiveElement } from "./nativeElement";

/** Genuine Naive cards consume the same prepared row inventory as desktop. */
export function NaiveMobileCards<TRow>(props: {
  readonly model: MobileCardsModel<TRow>;
  readonly controls: TableChromeSlots<TRow>;
  readonly classNames?: DataTableClassNames;
}): VNodeChild {
  const { model, controls, classNames: names = {} } = props;
  const card = (row: TableRowModel<TRow>) =>
    naiveElement(
      NCard,
      mergeVueAttrs(row.attrs, {
        key: row.key,
        size: "small",
        class: names.card,
      }),
      () => [
        row.checkboxAttrs
          ? controls.SelectionCheckbox({
              ...selectionCheckboxControl(row.checkboxAttrs),
              attrs: mergeVueAttrs(row.checkboxAttrs, {
                class: names.selectionCheckbox,
                "data-adapttable-part": "checkbox",
              }),
              header: false,
            })
          : null,
        row.reorder?.(true),
        h(
          "dl",
          { class: names.cardFields },
          row.cells.map((cell) =>
            h(
              "div",
              {
                key: cell.key,
                class: names.cardRow,
                "data-adapttable-part": "card-row",
              },
              [
                h(
                  "dt",
                  {
                    class: names.cardLabel,
                    "data-adapttable-part": "card-label",
                  },
                  cell.context.column.mobileLabel ??
                    cell.context.column.header ??
                    cell.key
                ),
                h(
                  "dd",
                  mergeVueAttrs(cell.attrs, {
                    class: names.cardValue,
                    "data-adapttable-part": "card-value",
                  }),
                  [naiveCellContent(cell, row, controls, names, true)]
                ),
              ]
            )
          )
        ),
        row.detail?.expanded
          ? h(
              "div",
              {
                class: names.cardDetail,
                "data-adapttable-part": "card-detail",
              },
              [row.detail.render()]
            )
          : null,
        row.actionControls || row.editActions
          ? h(
              "div",
              {
                class: names.cardActions,
                "data-adapttable-part": "card-actions",
              },
              [
                row.editActions?.(),
                row.actionControls?.length
                  ? requireControl(
                      controls.RowActions,
                      "RowActions"
                    )({
                      row: row.row,
                      controls: row.actionControls,
                      mobile: true,
                    })
                  : null,
              ]
            )
          : null,
      ]
    );
  const body = (slot: TableBodySlot<TRow>): VNodeChild => {
    if (slot.kind === "row") return card(slot.wiring);
    if (slot.kind === "group")
      return h(Fragment, { key: slot.key }, [
        requireControl(
          controls.GroupRow,
          "GroupRow"
        )({ slot, columnCount: 1, mobile: true, classNames: names }),
      ]);
    if (slot.kind === "virtualPad")
      return h("div", {
        key: slot.key,
        "aria-hidden": "true",
        class: names.virtualSpacer,
        "data-adapttable-part": "virtual-spacer",
        style: { height: `${slot.height}px` },
      });
    const parts = EXTRA_ROW_PARTS[slot.extraKind];
    return naiveElement(
      NCard,
      {
        ...slot.attrs,
        key: slot.key,
        size: "small",
        role: "listitem",
        style: slot.fillStyle,
        "data-adapttable-part": parts.row,
      },
      () => h("div", { "data-adapttable-part": parts.cell }, [slot.render?.()])
    );
  };
  const summary = model.summary;
  return h("div", mergeVueAttrs(model.attrs, { class: names.cards }), [
    ...(model.bodySlots ? model.bodySlots.map(body) : model.rows.map(card)),
    summary
      ? naiveElement(
          NCard,
          {
            size: "small",
            role: "listitem",
            class: [names.card, names.summaryCard],
            "data-adapttable-part": "summary-card",
          },
          () =>
            h(
              "dl",
              { class: names.cardFields },
              summary.cells
                .filter(
                  (cell) =>
                    cell.context.value != null ||
                    cell.context.column.footer !== undefined ||
                    controls.footer !== undefined
                )
                .map((cell) =>
                  h(
                    "div",
                    {
                      key: cell.key,
                      "data-column-key": cell.key,
                      "data-adapttable-part": "card-row",
                      class: names.cardRow,
                    },
                    [
                      h(
                        "dt",
                        {
                          "data-adapttable-part": "card-label",
                          class: names.cardLabel,
                        },
                        cell.label
                      ),
                      h(
                        "dd",
                        {
                          "data-adapttable-part": "card-value",
                          class: names.cardValue,
                        },
                        [renderFooter(cell.context, controls.footer)]
                      ),
                    ]
                  )
                )
            )
        )
      : null,
  ]);
}
NaiveMobileCards.props = ["model", "controls", "classNames"];
