import type {
  MobileCardsModel,
  TableBodySlot,
  TableRowModel,
} from "@adapttable/vue";
import {
  type DataTableClassNames,
  EXTRA_ROW_PARTS,
  mergeVueAttrs,
  MobileSummaryChrome,
  selectionCheckboxControl,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNode, type VNodeChild } from "vue";
import { VCard, VCardActions, VCardText } from "vuetify/components/VCard";
import { VSheet } from "vuetify/components/VSheet";

import { vuetifyCellContent } from "./cellContent";
import { requiredControl } from "./requiredControl";
import { VuetifySurface } from "./VuetifySurface";

/** Responsive cards use Vuetify surfaces with binding-owned row and field models. */
export function VuetifyMobile<TRow>(props: {
  readonly model: MobileCardsModel<TRow>;
  readonly controls: TableChromeSlots<TRow>;
  readonly classNames: DataTableClassNames;
}): VNodeChild {
  const { model, controls, classNames: names } = props;
  function fields(row: TableRowModel<TRow>): VNode {
    return h(
      "dl",
      { "data-adapttable-part": "card-fields", class: names.cardFields },
      row.cells.map((cell) =>
        h(
          "div",
          {
            key: cell.key,
            "data-adapttable-part": "card-row",
            class: names.cardRow,
          },
          [
            h(
              "dt",
              { "data-adapttable-part": "card-label", class: names.cardLabel },
              cell.context.column.mobileLabel ??
                cell.context.column.header ??
                cell.key
            ),
            h(
              "dd",
              mergeVueAttrs(cell.attrs, {
                "data-adapttable-part": "card-value",
                class: names.cardValue,
              }),
              [vuetifyCellContent(cell, row, controls, names, true)]
            ),
          ]
        )
      )
    );
  }
  function card(row: TableRowModel<TRow>): VNode {
    return h(
      VuetifySurface,
      {
        component: VCard,
        attrs: mergeVueAttrs(row.attrs, {
          class: ["adapttable-vuetify-card", names.card],
          tag: "article",
          variant: "outlined",
        }),
        key: row.key,
      },
      {
        default: () => [
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
          row.reorder?.(true),
          h(VCardText, {}, { default: () => fields(row) }),
          row.detail?.expanded
            ? h(
                VCardText,
                {
                  "data-adapttable-part": "card-detail",
                  class: names.cardDetail,
                },
                { default: () => row.detail?.render() }
              )
            : null,
          row.actionControls || row.editActions
            ? h(
                VCardActions,
                {
                  "data-adapttable-part": "card-actions",
                  class: names.cardActions,
                },
                {
                  default: () => [
                    row.editActions?.(),
                    row.actionControls?.length
                      ? requiredControl(
                          controls.RowActions,
                          "RowActions"
                        )({
                          row: row.row,
                          controls: row.actionControls,
                          mobile: true,
                        })
                      : null,
                  ],
                }
              )
            : null,
        ],
      }
    );
  }
  function bodySlot(slot: TableBodySlot<TRow>): VNode {
    if (slot.kind === "row") return card(slot.wiring);
    if (slot.kind === "group")
      return h(Fragment, { key: slot.key }, [
        requiredControl(
          controls.GroupRow,
          "GroupRow"
        )({ slot, columnCount: 1, mobile: true, classNames: names }),
      ]);
    if (slot.kind === "virtualPad")
      return h(VSheet, {
        key: slot.key,
        "aria-hidden": "true",
        "data-adapttable-part": "virtual-spacer",
        class: names.virtualSpacer,
        style: { height: `${slot.height}px` },
      });
    const parts = EXTRA_ROW_PARTS[slot.extraKind];
    return h(
      VuetifySurface,
      {
        component: VSheet,
        key: slot.key,
        attrs: mergeVueAttrs(
          {
            ...slot.attrs,
            role: "listitem",
            style: slot.fillStyle,
            "data-adapttable-part": parts.row,
          },
          {}
        ),
      },
      {
        default: () =>
          h("div", { "data-adapttable-part": parts.cell }, [slot.render?.()]),
      }
    );
  }
  return h(
    "div",
    mergeVueAttrs(model.attrs, {
      class: ["adapttable-vuetify-cards", names.cards],
    }),
    [
      ...(model.bodySlots
        ? model.bodySlots.map(bodySlot)
        : model.rows.map(card)),
      model.summary
        ? h(MobileSummaryChrome<TRow>, {
            model: model.summary,
            footer: controls.footer,
            classNames: names,
          })
        : null,
    ]
  );
}
VuetifyMobile.props = ["model", "controls", "classNames"];
