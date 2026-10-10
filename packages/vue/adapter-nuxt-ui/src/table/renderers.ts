import type {
  Attrs,
  DesktopTableModel,
  MobileCardsModel,
  TableBodySlot,
  TableCellModel,
  TableRowModel,
} from "@adapttable/vue";
import {
  columnGroupHeaderCaption,
  EXTRA_ROW_PARTS,
  extraUncoveredColSpans,
  mergeVueAttrs,
  renderCell,
  renderContent,
  renderFooter,
  renderHeader,
  selectionCheckboxControl,
  type TableChromeClassNames,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import {
  Comment,
  Fragment,
  h,
  isVNode,
  Text,
  type VNode,
  type VNodeChild,
} from "vue";

import NuxtTableRoot from "../controls/NuxtTableRoot.vue";
import { nuxtCard, tablePart } from "../controls/tablePart";

function required<T>(
  slot: ((props: T) => VNodeChild) | undefined,
  props: T,
  name: string
): VNodeChild {
  if (!slot)
    throw new Error(`AdaptTable: Nuxt UI requires the ${name} control slot.`);
  return slot(props);
}

function hasContent(content: VNodeChild): boolean {
  if (content == null || typeof content === "boolean") return false;
  if (Array.isArray(content)) return content.some(hasContent);
  if (!isVNode(content))
    return typeof content !== "string" || content.trim().length > 0;
  if (content.type === Comment) return false;
  if (content.type !== Fragment && content.type !== Text) return true;
  return Array.isArray(content.children)
    ? content.children.some((child) => hasContent(child))
    : typeof content.children === "string" &&
        content.children.trim().length > 0;
}

function valueContent<TRow>(
  cell: TableCellModel<TRow>,
  row: TableRowModel<TRow>,
  slots: TableChromeSlots<TRow>,
  names: TableChromeClassNames,
  inlineDetail: boolean
): VNodeChild {
  const display = renderCell(cell.context, slots.cell);
  const value = [
    cell.render ? cell.render(display) : display,
    cell.addon?.(names.fillHandle),
  ];
  const tree = cell.tree;
  const content = tree
    ? h("span", mergeVueAttrs(tree.attrs, { class: names.treeCell }), [
        tree.toggleAttrs
          ? required(
              slots.TreeToggle,
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
              "data-adapttable-part": "tree-spacer",
              "aria-hidden": "true",
              class: names.treeSpacer,
              style: { display: "inline-block", width: "1.5em", flexShrink: 0 },
            }),
        ...value,
      ])
    : value;
  return inlineDetail && row.detail && cell === row.cells[0]
    ? [
        required(
          slots.RowDetailToggle,
          {
            attrs: mergeVueAttrs(row.detail.toggleAttrs, {
              class: [names.expandButton, names.expandToggle],
            }),
            expanded: row.detail.expanded,
          },
          "RowDetailToggle"
        ),
        content,
      ]
    : content;
}

/** Adapter-owned rendering of prepared rows; no second table or state engine. */
export function NuxtDesktopTable<TRow>({
  model,
  slots,
  classNames: names = {},
}: {
  readonly model: DesktopTableModel<TRow>;
  readonly slots: TableChromeSlots<TRow>;
  readonly classNames?: TableChromeClassNames;
}): VNode {
  const select = (
    attrs: NonNullable<TableRowModel<TRow>["checkboxAttrs"]>,
    header: boolean
  ) =>
    slots.SelectionCheckbox({
      ...selectionCheckboxControl(attrs),
      attrs: mergeVueAttrs(attrs, {
        class: names.selectionCheckbox,
        "data-adapttable-part": "checkbox",
      }),
      header,
    });
  const spacer = (part: "th" | "td", side: "start" | "end", rowspan = 1) =>
    model.columnSpacers
      ? tablePart(part, {
          rowspan,
          "aria-hidden": "true",
          "data-adapttable-part": `column-spacer-${side}`,
          style: {
            width: `${model.columnSpacers[side]}px`,
            minWidth: `${model.columnSpacers[side]}px`,
            padding: 0,
            border: 0,
          },
        })
      : null;
  const utilityHeaders = (rowspan: number): VNodeChild[] => [
    model.expandLabel
      ? tablePart("th", {
          scope: "col",
          rowspan,
          "aria-label": model.expandLabel,
          "data-adapttable-part": "expand-header",
          class: [names.th, names.expandHeader],
          style: { width: "40px" },
        })
      : null,
    model.headerCheckboxAttrs
      ? tablePart(
          "th",
          {
            scope: "col",
            rowspan,
            class: names.selectionHeader,
            "data-adapttable-part": "selection-header",
          },
          select(model.headerCheckboxAttrs, true)
        )
      : null,
    model.reorderLabel
      ? tablePart(
          "th",
          {
            scope: "col",
            rowspan,
            class: [names.th, names.reorderHeader],
            "data-adapttable-part": "reorder-header",
          },
          model.reorderLabel
        )
      : null,
    spacer("th", "start", rowspan),
  ];
  const trailingHeaders = (rowspan: number): VNodeChild[] => [
    spacer("th", "end", rowspan),
    model.actionsLabel
      ? tablePart(
          "th",
          {
            scope: "col",
            role: "columnheader",
            rowspan,
            class: names.actionsHeader,
            "data-adapttable-part": "actions-header",
          },
          model.actionsLabel
        )
      : null,
  ];
  const header = (key: string, extra: Attrs = {}): VNode | null => {
    const leaf = model.headers.find((item) => item.key === key);
    if (!leaf) return null;
    const content = renderHeader(leaf.context, slots.header);
    const actions = leaf.column.headerActions
      ? renderContent(leaf.column.headerActions, leaf.context)
      : slots.headerActions?.(leaf.context);
    const caption =
      leaf.sortAttrs && !leaf.column.headerCell && !slots.header
        ? slots.SortButton({
            attrs: mergeVueAttrs(leaf.sortAttrs, {
              class: names.sortButton,
              "data-adapttable-part": "sort-button",
            }),
            context: leaf.context,
            content: [
              content,
              leaf.context.sortIndex === undefined
                ? null
                : h(
                    "span",
                    {
                      class: names.sortIndex,
                      "data-adapttable-part": "sort-index",
                    },
                    String(leaf.context.sortIndex)
                  ),
            ],
          })
        : content;
    return tablePart(
      "th",
      {
        ...mergeVueAttrs(leaf.attrs, {
          class: names.th,
          "data-adapttable-part": "header-cell",
        }),
        ...extra,
        key,
      },
      [
        leaf.rename ? leaf.rename(caption, { ...names }) : caption,
        leaf.selection?.(names.columnSelect),
        leaf.filter?.(names.filterHeaderTrigger),
        hasContent(actions)
          ? h(
              "span",
              {
                class: names.headerActions,
                "data-adapttable-part": "header-actions",
              },
              [actions]
            )
          : null,
        leaf.resizeAttrs
          ? required(
              slots.ResizeHandle,
              {
                attrs: mergeVueAttrs(leaf.resizeAttrs, {
                  class: names.resizeHandle,
                  "data-adapttable-part": "resize-handle",
                }),
              },
              "ResizeHandle"
            )
          : null,
      ]
    );
  };
  const plan = model.headerPlan;
  const headerRows = plan?.length
    ? plan.map((row, rowIndex) =>
        tablePart(
          "tr",
          {
            ...mergeVueAttrs(model.headerRowAttrs, { class: names.tr }),
            key: rowIndex,
            "data-adapttable-part":
              rowIndex === plan.length - 1 ? "header-row" : "header-group-row",
          },
          [
            ...(rowIndex === 0 ? utilityHeaders(plan.length) : []),
            ...row.map((cell) => {
              if (cell.kind === "leaf")
                return header(cell.key, { rowspan: cell.rowSpan });
              const toggle = model.groupToggleProps(cell.cell);
              return tablePart(
                "th",
                {
                  key: cell.key,
                  scope: "colgroup",
                  role: "columnheader",
                  colspan: cell.colSpan,
                  rowspan: cell.rowSpan,
                  class: names.columnGroup,
                  "data-adapttable-part": "header-group-cell",
                },
                [
                  columnGroupHeaderCaption(cell.cell),
                  toggle
                    ? required(
                        slots.ColumnGroupToggle,
                        { ...toggle, className: names.columnGroupToggle },
                        "ColumnGroupToggle"
                      )
                    : null,
                ]
              );
            }),
            ...(rowIndex === 0 ? trailingHeaders(plan.length) : []),
          ]
        )
      )
    : [
        tablePart(
          "tr",
          mergeVueAttrs(model.headerRowAttrs, {
            class: names.tr,
            "data-adapttable-part": "header-row",
          }),
          [
            ...utilityHeaders(1),
            ...model.headers.map((leaf) => header(leaf.key)),
            ...trailingHeaders(1),
          ]
        ),
      ];
  const row = (item: TableRowModel<TRow>): VNode => {
    const detailToggle = item.detail
      ? required(
          slots.RowDetailToggle,
          {
            attrs: mergeVueAttrs(item.detail.toggleAttrs, {
              class: [names.expandButton, names.expandToggle],
            }),
            expanded: item.detail.expanded,
          },
          "RowDetailToggle"
        )
      : null;
    const checkbox = item.checkboxAttrs
      ? select(item.checkboxAttrs, false)
      : null;
    const content = tablePart(
      "tr",
      { ...mergeVueAttrs(item.attrs, { class: names.tr }), key: item.key },
      [
        model.expandLabel
          ? tablePart(
              "td",
              mergeVueAttrs(item.expandCellAttrs ?? {}, {
                class: [names.td, names.expandCell],
                "data-adapttable-part": "expand-cell",
              }),
              detailToggle
            )
          : null,
        model.headerCheckboxAttrs
          ? tablePart(
              "td",
              {
                class: names.selectionCell,
                "data-adapttable-part": "selection-cell",
              },
              checkbox
            )
          : null,
        model.reorderLabel
          ? tablePart(
              "td",
              {
                class: [names.td, names.reorderCell],
                "data-adapttable-part": "reorder-cell",
              },
              item.reorder?.(false)
            )
          : null,
        spacer("td", "start"),
        ...item.cells.map((cell) =>
          tablePart(
            "td",
            {
              ...mergeVueAttrs(cell.attrs, {
                class: names.td,
                "data-adapttable-part": "cell",
              }),
              key: cell.key,
            },
            valueContent(cell, item, slots, names, !model.expandLabel)
          )
        ),
        spacer("td", "end"),
        model.actionsLabel
          ? tablePart(
              "td",
              {
                class: names.actionsCell,
                "data-adapttable-part": "actions-cell",
              },
              [
                item.editActions?.(),
                item.actionControls?.length
                  ? required(
                      slots.RowActions,
                      {
                        row: item.row,
                        controls: item.actionControls,
                        mobile: false,
                      },
                      "RowActions"
                    )
                  : null,
              ]
            )
          : null,
      ]
    );
    return item.detail?.expanded
      ? h(Fragment, { key: item.key }, [
          content,
          tablePart(
            "tr",
            {
              ref: item.detail.measure,
              class: names.detailRow,
              "data-adapttable-part": "detail-row",
            },
            [
              tablePart(
                "td",
                {
                  colspan: model.columnCount,
                  class: names.detailCell,
                  "data-adapttable-part": "detail-cell",
                },
                item.detail.render()
              ),
            ]
          ),
        ])
      : content;
  };
  const body = (slot: TableBodySlot<TRow>): VNodeChild => {
    if (slot.kind === "row") return row(slot.wiring);
    if (slot.kind === "group")
      return h(Fragment, { key: slot.key }, [
        required(
          slots.GroupRow,
          {
            slot,
            classNames: names,
            columnCount: model.columnCount,
            mobile: false,
          },
          "GroupRow"
        ),
      ]);
    if (slot.kind === "virtualPad")
      return tablePart(
        "tr",
        {
          key: slot.key,
          "aria-hidden": "true",
          class: names.virtualSpacer,
          "data-adapttable-part": "virtual-spacer",
        },
        [
          tablePart("td", {
            colspan: slot.colSpan,
            style: { height: `${slot.height}px`, padding: 0, border: 0 },
          }),
        ]
      );
    const parts = EXTRA_ROW_PARTS[slot.extraKind];
    return tablePart(
      "tr",
      { ...slot.attrs, key: slot.key, "data-adapttable-part": parts.row },
      extraUncoveredColSpans(slot.colSpan, slot.coveredSlots).map(
        (span, index) =>
          tablePart(
            "td",
            {
              key: index,
              colspan: span,
              style: slot.fillStyle,
              "data-adapttable-part": parts.cell,
            },
            index === 0 ? slot.render?.() : null
          )
      )
    );
  };
  const pad = (key: string) =>
    tablePart("td", {
      key,
      class: names.summaryCell,
      "data-adapttable-part": "summary-cell",
    });
  const summary = model.summary
    ? h("tfoot", { class: names.summary, "data-adapttable-part": "summary" }, [
        tablePart(
          "tr",
          { class: names.summaryRow, "data-adapttable-part": "summary-row" },
          [
            model.expandLabel ? pad("expand") : null,
            model.headerCheckboxAttrs ? pad("selection") : null,
            model.reorderLabel ? pad("reorder") : null,
            spacer("td", "start"),
            ...model.summary.cells.map((cell) =>
              tablePart(
                "td",
                {
                  ...mergeVueAttrs(cell.attrs, { class: names.summaryCell }),
                  key: cell.key,
                  "data-adapttable-part": "summary-cell",
                },
                renderFooter(cell.context, slots.footer)
              )
            ),
            spacer("td", "end"),
            model.actionsLabel ? pad("actions") : null,
          ]
        ),
      ])
    : null;
  return h(
    NuxtTableRoot,
    {
      attrs: mergeVueAttrs(model.attrs, {
        class: ["adapttable-nuxt-table", names.table],
        "data-adapttable-part": "table",
      }),
    },
    () => [
      tablePart(
        "thead",
        { class: names.thead, "data-adapttable-part": "thead" },
        headerRows
      ),
      tablePart(
        "tbody",
        { class: names.tbody, "data-adapttable-part": "tbody" },
        model.bodySlots ? model.bodySlots.map(body) : model.rows.map(row)
      ),
      summary,
    ]
  );
}

export function NuxtMobileCards<TRow>({
  model,
  slots,
  classNames: names = {},
}: {
  readonly model: MobileCardsModel<TRow>;
  readonly slots: TableChromeSlots<TRow>;
  readonly classNames?: TableChromeClassNames;
}): VNode {
  const card = (row: TableRowModel<TRow>) =>
    nuxtCard(
      { ...mergeVueAttrs(row.attrs, { class: names.card }), key: row.key },
      [
        row.checkboxAttrs
          ? slots.SelectionCheckbox({
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
                  [valueContent(cell, row, slots, names, true)]
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
  const body = (slot: TableBodySlot<TRow>): VNodeChild => {
    if (slot.kind === "row") return card(slot.wiring);
    if (slot.kind === "group")
      return h(Fragment, { key: slot.key }, [
        required(
          slots.GroupRow,
          { slot, classNames: names, columnCount: 1, mobile: true },
          "GroupRow"
        ),
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
    return nuxtCard(
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
      h("div", { "data-adapttable-part": parts.cell }, [slot.render?.()])
    );
  };
  const summary = model.summary
    ? nuxtCard(
        {
          role: "listitem",
          class: [names.card, names.summaryCard],
          "data-adapttable-part": "summary-card",
        },
        h(
          "dl",
          { class: names.cardFields },
          model.summary.cells
            .filter(
              (cell) =>
                cell.context.value != null ||
                cell.context.column.footer !== undefined ||
                slots.footer !== undefined
            )
            .map((cell) =>
              h(
                "div",
                {
                  key: cell.key,
                  "data-column-key": cell.key,
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
                    cell.label
                  ),
                  h(
                    "dd",
                    {
                      class: names.cardValue,
                      "data-adapttable-part": "card-value",
                    },
                    [renderFooter(cell.context, slots.footer)]
                  ),
                ]
              )
            )
        )
      )
    : null;
  return h("div", mergeVueAttrs(model.attrs, { class: names.cards }), [
    ...(model.bodySlots ? model.bodySlots.map(body) : model.rows.map(card)),
    summary,
  ]);
}

NuxtDesktopTable.props = ["model", "slots", "classNames"];
NuxtMobileCards.props = ["model", "slots", "classNames"];
