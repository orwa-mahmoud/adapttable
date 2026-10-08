import type {
  Attrs,
  DesktopTableModel,
  SelectionCheckboxAttrs,
  TableBodySlot,
  TableHeaderModel,
  TableRowModel,
} from "@adapttable/vue";
import {
  columnGroupHeaderCaption,
  EXTRA_ROW_PARTS,
  extraUncoveredColSpans,
  mergeVueAttrs,
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

import { quasarCellContent, requiredControl } from "./content";
import { nativePart, paint, part } from "./parts";

function hasContent(content: VNodeChild): boolean {
  if (content == null || typeof content === "boolean") return false;
  if (Array.isArray(content)) return content.some(hasContent);
  if (isVNode(content)) {
    if (content.type === Comment) return false;
    if (content.type === Fragment || content.type === Text) {
      const children = content.children;
      return Array.isArray(children)
        ? children.some(hasContent)
        : typeof children === "string" && children.trim().length > 0;
    }
  }
  return typeof content !== "string" || content.trim().length > 0;
}

/** Quasar primitives paint the binding's ordered, already-prepared table model. */
export function QuasarDesktop<TRow>({
  model,
  slots,
  classNames: names = {},
}: {
  readonly model: DesktopTableModel<TRow>;
  readonly slots: TableChromeSlots<TRow>;
  readonly classNames?: TableChromeClassNames;
}): VNodeChild {
  const checkbox = (attrs: SelectionCheckboxAttrs, header: boolean) =>
    requiredControl(
      slots.SelectionCheckbox,
      {
        ...selectionCheckboxControl(attrs),
        attrs: paint(attrs, "checkbox", names.selectionCheckbox),
        header,
      },
      "SelectionCheckbox"
    );
  const spacer = (
    kind: "header" | "cell",
    side: "start" | "end",
    rowspan = 1
  ) =>
    model.columnSpacers
      ? part(kind, {
          "aria-hidden": "true",
          rowspan,
          "data-adapttable-part": `column-spacer-${side}`,
          style: {
            width: model.columnSpacers[side],
            minWidth: model.columnSpacers[side],
            padding: 0,
            border: 0,
          },
        })
      : null;
  const utilities = (rowspan: number) => [
    model.expandLabel
      ? part("header", {
          scope: "col",
          rowspan,
          "aria-label": model.expandLabel,
          "data-adapttable-part": "expand-header",
          class: [names.th, names.expandHeader],
          style: { width: 44 },
        })
      : null,
    model.headerCheckboxAttrs
      ? part(
          "header",
          {
            scope: "col",
            rowspan,
            "data-adapttable-part": "selection-header",
            class: names.selectionHeader,
          },
          checkbox(model.headerCheckboxAttrs, true)
        )
      : null,
    model.reorderLabel
      ? part(
          "header",
          {
            scope: "col",
            rowspan,
            "data-adapttable-part": "reorder-header",
            class: [names.th, names.reorderHeader],
          },
          model.reorderLabel
        )
      : null,
    spacer("header", "start", rowspan),
  ];
  const trailing = (rowspan: number) => [
    spacer("header", "end", rowspan),
    model.actionsLabel
      ? part(
          "header",
          {
            scope: "col",
            rowspan,
            "data-adapttable-part": "actions-header",
            class: names.actionsHeader,
          },
          model.actionsLabel
        )
      : null,
  ];
  const header = (leaf: TableHeaderModel<TRow>, extra: Attrs = {}) => {
    const label = renderHeader(leaf.context, slots.header);
    const caption =
      leaf.sortAttrs && !leaf.column.headerCell && !slots.header
        ? requiredControl(
            slots.SortButton,
            {
              attrs: paint(leaf.sortAttrs, "sort-button", names.sortButton),
              context: leaf.context,
              content: [
                label,
                leaf.context.sortIndex === undefined
                  ? null
                  : h(
                      "span",
                      {
                        "data-adapttable-part": "sort-index",
                        class: names.sortIndex,
                      },
                      String(leaf.context.sortIndex)
                    ),
              ],
            },
            "SortButton"
          )
        : label;
    const actions = leaf.column.headerActions
      ? renderContent(leaf.column.headerActions, leaf.context)
      : slots.headerActions?.(leaf.context);
    return part(
      "header",
      {
        ...mergeVueAttrs(leaf.attrs, {
          "data-adapttable-part": "header-cell",
          class: names.th,
        }),
        ...extra,
        key: leaf.key,
      },
      [
        leaf.rename ? leaf.rename(caption, { ...names }) : caption,
        leaf.selection?.(names.columnSelect),
        leaf.filter?.(names.filterHeaderTrigger),
        hasContent(actions)
          ? h(
              "span",
              {
                "data-adapttable-part": "header-actions",
                class: names.headerActions,
              },
              [actions]
            )
          : null,
        leaf.resizeAttrs
          ? requiredControl(
              slots.ResizeHandle,
              {
                attrs: paint(
                  leaf.resizeAttrs,
                  "resize-handle",
                  names.resizeHandle
                ),
              },
              "ResizeHandle"
            )
          : null,
      ]
    );
  };
  const plan = model.headerPlan;
  const headers = plan?.length
    ? plan.map((row, index) =>
        part(
          "row",
          {
            ...paint(
              model.headerRowAttrs,
              index === plan.length - 1 ? "header-row" : "header-group-row",
              names.tr
            ),
            key: index,
          },
          [
            ...(index === 0 ? utilities(plan.length) : []),
            ...row.map((cell) => {
              if (cell.kind === "leaf") {
                const leaf = model.headers.find(
                  (item) => item.key === cell.key
                );
                return leaf ? header(leaf, { rowspan: cell.rowSpan }) : null;
              }
              const toggle = model.groupToggleProps(cell.cell);
              return part(
                "header",
                {
                  key: cell.key,
                  scope: "colgroup",
                  role: "columnheader",
                  colspan: cell.colSpan,
                  rowspan: cell.rowSpan,
                  "data-adapttable-part": "header-group-cell",
                  class: names.columnGroup,
                },
                [
                  columnGroupHeaderCaption(cell.cell),
                  toggle
                    ? requiredControl(
                        slots.ColumnGroupToggle,
                        { ...toggle, className: names.columnGroupToggle },
                        "ColumnGroupToggle"
                      )
                    : null,
                ]
              );
            }),
            ...(index === 0 ? trailing(plan.length) : []),
          ]
        )
      )
    : [
        part("row", paint(model.headerRowAttrs, "header-row", names.tr), [
          ...utilities(1),
          ...model.headers.map((leaf) => header(leaf)),
          ...trailing(1),
        ]),
      ];
  const rowDisclosure = (item: TableRowModel<TRow>) =>
    item.detail
      ? requiredControl(
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
  const rowCheckbox = (item: TableRowModel<TRow>) =>
    item.checkboxAttrs ? checkbox(item.checkboxAttrs, false) : null;
  const row = (item: TableRowModel<TRow>): VNode =>
    h(Fragment, { key: item.key }, [
      part(
        "row",
        { ...mergeVueAttrs(item.attrs, { class: names.tr }), key: item.key },
        [
          model.expandLabel
            ? part(
                "cell",
                paint(item.expandCellAttrs ?? {}, "expand-cell", [
                  names.td,
                  names.expandCell,
                ]),
                rowDisclosure(item)
              )
            : null,
          model.headerCheckboxAttrs
            ? part(
                "cell",
                {
                  "data-adapttable-part": "selection-cell",
                  class: names.selectionCell,
                },
                rowCheckbox(item)
              )
            : null,
          model.reorderLabel
            ? part(
                "cell",
                {
                  "data-adapttable-part": "reorder-cell",
                  class: [names.td, names.reorderCell],
                },
                item.reorder?.(false)
              )
            : null,
          spacer("cell", "start"),
          ...item.cells.map((cell) =>
            part(
              "cell",
              {
                ...mergeVueAttrs(cell.attrs, {
                  "data-adapttable-part": "cell",
                  class: names.td,
                }),
                key: cell.key,
              },
              quasarCellContent(cell, item, slots, names, !model.expandLabel)
            )
          ),
          spacer("cell", "end"),
          model.actionsLabel
            ? part(
                "cell",
                {
                  "data-adapttable-part": "actions-cell",
                  class: names.actionsCell,
                },
                [
                  item.editActions?.(),
                  item.actionControls?.length
                    ? requiredControl(
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
      ),
      item.detail?.expanded
        ? part(
            "row",
            {
              "data-adapttable-part": "detail-row",
              class: names.detailRow,
              ref: item.detail.measure,
            },
            part(
              "cell",
              {
                colspan: model.columnCount,
                "data-adapttable-part": "detail-cell",
                class: names.detailCell,
              },
              item.detail.render()
            )
          )
        : null,
    ]);
  const body = (slot: TableBodySlot<TRow>): VNode => {
    if (slot.kind === "row") return row(slot.wiring);
    if (slot.kind === "group")
      return h(Fragment, { key: slot.key }, [
        requiredControl(
          slots.GroupRow,
          {
            slot,
            columnCount: model.columnCount,
            mobile: false,
            classNames: names,
          },
          "GroupRow"
        ),
      ]);
    if (slot.kind === "virtualPad")
      return part(
        "row",
        {
          key: slot.key,
          "aria-hidden": "true",
          "data-adapttable-part": "virtual-spacer",
          class: names.virtualSpacer,
        },
        part("cell", {
          colspan: slot.colSpan,
          style: { height: slot.height, padding: 0, border: 0 },
        })
      );
    const parts = EXTRA_ROW_PARTS[slot.extraKind];
    return part(
      "row",
      { ...slot.attrs, key: slot.key, "data-adapttable-part": parts.row },
      extraUncoveredColSpans(slot.colSpan, slot.coveredSlots).map(
        (span, index) =>
          part(
            "cell",
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
  const summaryPad = (key: string) =>
    part("cell", {
      key,
      "data-adapttable-part": "summary-cell",
      class: names.summaryCell,
    });
  const summary = model.summary
    ? h("tfoot", { "data-adapttable-part": "summary", class: names.summary }, [
        part(
          "row",
          { "data-adapttable-part": "summary-row", class: names.summaryRow },
          [
            ...(model.expandLabel ? [summaryPad("expand")] : []),
            ...(model.headerCheckboxAttrs ? [summaryPad("selection")] : []),
            ...(model.reorderLabel ? [summaryPad("reorder")] : []),
            spacer("cell", "start"),
            ...model.summary.cells.map((cell) =>
              part(
                "cell",
                {
                  ...paint(cell.attrs, "summary-cell", names.summaryCell),
                  key: cell.key,
                },
                renderFooter(cell.context, slots.footer)
              )
            ),
            spacer("cell", "end"),
            ...(model.actionsLabel ? [summaryPad("actions")] : []),
          ]
        ),
      ])
    : null;
  return part(
    "card",
    { flat: true, bordered: true, class: "adapttable-quasar-table-surface" },
    nativePart(
      "table",
      mergeVueAttrs(model.attrs, {
        "data-adapttable-part": "table",
        class: ["adapttable-quasar-table", names.table],
      }),
      [
        h(
          "thead",
          { "data-adapttable-part": "thead", class: names.thead },
          headers
        ),
        h(
          "tbody",
          { "data-adapttable-part": "tbody", class: names.tbody },
          model.bodySlots ? model.bodySlots.map(body) : model.rows.map(row)
        ),
        summary,
      ]
    )
  );
}
