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

import { ElementCard } from "./ElementCard";

type MobileModel<TRow> = UseDataTableShellResult<TRow>["mobile"]["value"];
type MobileRow<TRow> = MobileModel<TRow>["rows"][number];
type MobileCell<TRow> = MobileRow<TRow>["cells"][number];

function required<Props>(
  render: ((props: Props) => VNodeChild) | undefined,
  props: Props,
  name: string
): VNodeChild {
  if (!render) throw new Error(`AdaptTable: Element Plus requires ${name}.`);
  return render(props);
}

/** Only presentation is composed here; prepared models own every interaction. */
export function ElementMobileCards<TRow>(props: {
  readonly model: MobileModel<TRow>;
  readonly controls: TableChromeSlots<TRow>;
  readonly classNames?: TableChromeClassNames;
}): VNodeChild {
  const { model, controls, classNames: names = {} } = props;
  const cellContent = (
    cell: MobileCell<TRow>,
    row: MobileRow<TRow>
  ): VNodeChild => {
    const display = renderCell(cell.context, controls.cell);
    const value = cell.render ? cell.render(display) : display;
    const content = [value, cell.addon?.(names.fillHandle)];
    const tree = cell.tree;
    const treeContent = tree
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
                "aria-hidden": "true",
                "data-adapttable-part": "tree-spacer",
                class: names.treeSpacer,
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
          treeContent,
        ])
      : treeContent;
  };
  const card = (row: MobileRow<TRow>): VNode =>
    h(
      ElementCard,
      {
        attrs: mergeVueAttrs(row.attrs, {
          class: ["adapttable-element-plus-mobile-card", names.card],
        }),
        key: row.key,
        bodyStyle: { padding: "1rem" },
      },
      {
        default: () => [
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
                  "data-adapttable-part": "card-detail",
                  class: names.cardDetail,
                },
                [row.detail.render()]
              )
            : null,
          row.actionControls || row.editActions
            ? h(
                "div",
                {
                  "data-adapttable-part": "card-actions",
                  class: names.cardActions,
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
        ],
      }
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
            "aria-hidden": "true",
            "data-adapttable-part": "virtual-spacer",
            class: names.virtualSpacer,
            style: { height: `${slot.height}px` },
          });
        const parts = EXTRA_ROW_PARTS[slot.extraKind];
        return h(
          ElementCard,
          {
            attrs: mergeVueAttrs(slot.attrs ?? {}, {
              role: "listitem",
              style: slot.fillStyle,
              "data-adapttable-part": parts.row,
            }),
            key: slot.key,
            bodyStyle: {
              padding: slot.extraKind === "separator" ? "0.5rem 1rem" : "1rem",
            },
          },
          {
            default: () =>
              h("div", { "data-adapttable-part": parts.cell }, [
                slot.render?.(),
              ]),
          }
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
ElementMobileCards.props = ["model", "controls", "classNames"];
