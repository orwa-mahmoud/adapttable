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
  type TableChromeClassNames,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNode, type VNodeChild } from "vue";

import { quasarCellContent, requiredControl } from "./content";
import { nativePart, paint, part } from "./parts";

/** The same prepared rows become real Quasar cards without a second data engine. */
export function QuasarMobile<TRow>({
  model,
  slots,
  classNames: names = {},
}: {
  readonly model: MobileCardsModel<TRow>;
  readonly slots: TableChromeSlots<TRow>;
  readonly classNames?: TableChromeClassNames;
}): VNodeChild {
  const field = (key: string, label: string, value: VNodeChild, attrs = {}) =>
    h(
      "div",
      {
        key,
        "data-adapttable-part": "card-row",
        class: ["adapttable-quasar-card-row", names.cardRow],
      },
      [
        h(
          "dt",
          { "data-adapttable-part": "card-label", class: names.cardLabel },
          label
        ),
        nativePart("dd", paint(attrs, "card-value", names.cardValue), [value]),
      ]
    );
  const card = (row: TableRowModel<TRow>): VNode =>
    part(
      "card",
      {
        ...mergeVueAttrs(row.attrs, {
          class: ["adapttable-quasar-card", names.card],
        }),
        key: row.key,
        tag: "article",
        flat: true,
        bordered: true,
      },
      [
        row.checkboxAttrs
          ? requiredControl(
              slots.SelectionCheckbox,
              {
                ...selectionCheckboxControl(row.checkboxAttrs),
                attrs: paint(
                  row.checkboxAttrs,
                  "checkbox",
                  names.selectionCheckbox
                ),
                header: false,
              },
              "SelectionCheckbox"
            )
          : null,
        row.reorder?.(true),
        part(
          "section",
          {
            tag: "dl",
            class: ["adapttable-quasar-card-fields", names.cardFields],
          },
          row.cells.map((cell) =>
            field(
              cell.key,
              cell.context.column.mobileLabel ??
                cell.context.column.header ??
                cell.key,
              quasarCellContent(cell, row, slots, names, true),
              cell.attrs
            )
          )
        ),
        row.detail?.expanded
          ? part(
              "section",
              {
                "data-adapttable-part": "card-detail",
                class: names.cardDetail,
                ref: row.detail.measure,
              },
              row.detail.render()
            )
          : null,
        row.actionControls || row.editActions
          ? part(
              "section",
              {
                "data-adapttable-part": "card-actions",
                class: names.cardActions,
              },
              [
                row.editActions?.(),
                row.actionControls?.length
                  ? requiredControl(
                      slots.RowActions,
                      {
                        row: row.row,
                        controls: row.actionControls,
                        mobile: true,
                      },
                      "RowActions"
                    )
                  : null,
              ]
            )
          : null,
      ]
    );
  const body = (slot: TableBodySlot<TRow>): VNode => {
    if (slot.kind === "row") return card(slot.wiring);
    if (slot.kind === "group")
      return h(Fragment, { key: slot.key }, [
        requiredControl(
          slots.GroupRow,
          { slot, columnCount: 1, mobile: true, classNames: names },
          "GroupRow"
        ),
      ]);
    if (slot.kind === "virtualPad")
      return h("div", {
        key: slot.key,
        "aria-hidden": "true",
        class: names.virtualSpacer,
        style: { height: `${slot.height}px` },
        "data-adapttable-part": "virtual-spacer",
      });
    const parts = EXTRA_ROW_PARTS[slot.extraKind];
    return part(
      "card",
      mergeVueAttrs(
        {
          ...slot.attrs,
          key: slot.key,
          role: "listitem",
          tag: "article",
          flat: true,
          bordered: true,
          style: slot.fillStyle,
          "data-adapttable-part": parts.row,
        },
        {}
      ),
      part("section", { "data-adapttable-part": parts.cell }, slot.render?.())
    );
  };
  const summary = model.summary
    ? part(
        "card",
        {
          tag: "article",
          flat: true,
          bordered: true,
          role: "listitem",
          "data-adapttable-part": "summary-card",
          class: ["adapttable-quasar-card", names.card, names.summaryCard],
        },
        part(
          "section",
          {
            tag: "dl",
            class: ["adapttable-quasar-card-fields", names.cardFields],
          },
          model.summary.cells
            .filter(
              (cell) =>
                cell.context.value != null ||
                cell.context.column.footer !== undefined ||
                slots.footer !== undefined
            )
            .map((cell) =>
              field(
                cell.key,
                cell.label,
                renderFooter(cell.context, slots.footer)
              )
            )
        )
      )
    : null;
  return nativePart(
    "div",
    mergeVueAttrs(model.attrs, {
      class: ["adapttable-quasar-cards", names.cards],
    }),
    [
      ...(model.bodySlots ? model.bodySlots.map(body) : model.rows.map(card)),
      summary,
    ]
  );
}
