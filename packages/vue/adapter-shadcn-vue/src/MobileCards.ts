import {
  EXTRA_ROW_PARTS,
  mergeVueAttrs,
  MobileSummaryChrome,
  renderCell,
  selectionCheckboxControl,
  type TableChromeClassNames,
  type TableChromeSlots,
  type UseDataTableShellResult,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNode, type VNodeChild } from "vue";

import Card from "./components/card/Card.vue";
import { shadcnControlAttrs } from "./controls";

type MobileModel<TRow> = UseDataTableShellResult<TRow>["mobile"]["value"];
type MobileRow<TRow> = MobileModel<TRow>["rows"][number];
type MobileCell<TRow> = MobileRow<TRow>["cells"][number];

function required<T>(
  render: ((props: T) => VNodeChild) | undefined,
  props: T,
  name: string
): VNodeChild {
  if (!render)
    throw new Error(`AdaptTable: shadcn-vue requires the ${name} slot.`);
  return render(props);
}

/** Card layout consumes prepared row/cell models, including optional feature paint. */
export function ShadcnMobileCards<TRow>(props: {
  readonly model: MobileModel<TRow>;
  readonly controls: TableChromeSlots<TRow>;
  readonly classNames: TableChromeClassNames;
}): VNodeChild {
  const { model, controls, classNames: names } = props;
  const cellContent = (
    cell: MobileCell<TRow>,
    row: MobileRow<TRow>
  ): VNodeChild => {
    const display = renderCell(cell.context, controls.cell);
    const content = [
      cell.render ? cell.render(display) : display,
      cell.addon?.(names.fillHandle),
    ];
    const tree = cell.tree;
    const value = tree
      ? h("span", mergeVueAttrs(tree.attrs, { class: names.treeCell }), [
          tree.toggleAttrs
            ? required(
                controls.TreeToggle,
                {
                  attrs: mergeVueAttrs(tree.toggleAttrs, {
                    class: names.treeToggle,
                  }),
                  expanded: tree.entry.expanded,
                  loading: tree.entry.loading === true,
                },
                "TreeToggle"
              )
            : h("span", {
                class: names.treeSpacer,
                "aria-hidden": true,
                "data-adapttable-part": "tree-spacer",
                style: {
                  display: "inline-block",
                  inlineSize: "1.5em",
                  flexShrink: 0,
                },
              }),
          ...content,
        ])
      : h(Fragment, null, content);
    return row.detail && cell === row.cells[0]
      ? h(Fragment, null, [
          required(
            controls.RowDetailToggle,
            {
              attrs: mergeVueAttrs(row.detail.toggleAttrs, {
                class: [names.expandButton, names.expandToggle],
              }),
              expanded: row.detail.expanded,
            },
            "RowDetailToggle"
          ),
          value,
        ])
      : value;
  };
  const card = (row: MobileRow<TRow>): VNode =>
    h(
      Card,
      {
        ...shadcnControlAttrs(mergeVueAttrs(row.attrs, { class: names.card })),
        key: row.key,
        as: "article",
      },
      () => [
        row.checkboxAttrs
          ? controls.SelectionCheckbox({
              ...selectionCheckboxControl(row.checkboxAttrs),
              header: false,
              attrs: mergeVueAttrs(row.checkboxAttrs, {
                class: names.selectionCheckbox,
                "data-adapttable-part": "checkbox",
              }),
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
                  [cellContent(cell, row)]
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
                  ? required(
                      controls.RowActions,
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
  const body = model.bodySlots
    ? model.bodySlots.map((slot) => {
        if (slot.kind === "row") return card(slot.wiring);
        if (slot.kind === "group")
          return h(Fragment, { key: slot.key }, [
            required(
              controls.GroupRow,
              { slot, columnCount: 1, mobile: true, classNames: names },
              "GroupRow"
            ),
          ]);
        if (slot.kind === "virtualPad")
          return h("div", {
            key: slot.key,
            "aria-hidden": true,
            class: names.virtualSpacer,
            style: { height: `${slot.height}px` },
            "data-adapttable-part": "virtual-spacer",
          });
        const parts = EXTRA_ROW_PARTS[slot.extraKind];
        return h(
          "div",
          mergeVueAttrs(
            {
              ...slot.attrs,
              key: slot.key,
              role: "listitem",
              style: slot.fillStyle,
              "data-adapttable-part": parts.row,
            },
            {}
          ),
          [h("div", { "data-adapttable-part": parts.cell }, [slot.render?.()])]
        );
      })
    : model.rows.map(card);
  return h("div", mergeVueAttrs(model.attrs, { class: names.cards }), [
    ...body,
    model.summary
      ? h(MobileSummaryChrome<TRow>, {
          model: model.summary,
          footer: controls.footer,
          classNames: names,
        })
      : null,
  ]);
}
ShadcnMobileCards.props = ["model", "controls", "classNames"];
