import type {
  Attrs,
  ColumnDef,
  DesktopTableModel,
  TableBodySlot,
  TableDensity,
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
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { NTable, NTbody, NTd, NTh, NThead, NTr } from "naive-ui";
import { Fragment, h, normalizeStyle, type VNode, type VNodeChild } from "vue";

import type { DataTableClassNames } from "../types";
import { naiveCellContent, requireControl } from "./content";
import { naiveElement } from "./nativeElement";

/** NTable's automatic layout may shrink a preferred width; a user override is a floor. */
function userSizedAttrs<TRow>(attrs: Attrs, column: ColumnDef<TRow>): Attrs {
  const style = normalizeStyle(attrs.style);
  if (!style || typeof style !== "object" || !("width" in style)) return attrs;
  const raw = style.width;
  let width: number | undefined;
  if (typeof raw === "number") width = raw;
  else if (typeof raw === "string" && /^\d+(?:\.\d+)?px$/.test(raw))
    width = Number.parseFloat(raw);
  if (
    width === undefined ||
    raw === column.width ||
    raw === `${String(column.width)}px`
  )
    return attrs;
  return mergeVueAttrs(attrs, {
    style: { minWidth: Math.max(width, column.minWidth ?? 0) },
  });
}

/** A kit-owned semantic renderer over the binding's already-prepared table model. */
export function NaiveDesktopTable<TRow>(props: {
  readonly model: DesktopTableModel<TRow>;
  readonly controls: TableChromeSlots<TRow>;
  readonly classNames?: DataTableClassNames;
  readonly density?: TableDensity;
}): VNodeChild {
  const { model, controls, classNames: names = {} } = props;
  const cell = (attrs: Attrs, content: () => VNodeChild = () => null) =>
    naiveElement(NTd, attrs, content);
  const head = (attrs: Attrs, content: () => VNodeChild = () => null) =>
    naiveElement(NTh, attrs, content);
  const selection = (
    attrs: NonNullable<DesktopTableModel<TRow>["headerCheckboxAttrs"]>,
    header: boolean
  ) =>
    controls.SelectionCheckbox({
      ...selectionCheckboxControl(attrs),
      attrs: mergeVueAttrs(attrs, {
        class: names.selectionCheckbox,
        "data-adapttable-part": "checkbox",
      }),
      header,
    });
  const spacer = (header: boolean, side: "start" | "end", rowspan = 1) => {
    if (!model.columnSpacers) return null;
    const render = header ? head : cell;
    return render({
      "aria-hidden": "true",
      rowspan,
      "data-adapttable-part": `column-spacer-${side}`,
      style: {
        width: `${model.columnSpacers[side]}px`,
        minWidth: `${model.columnSpacers[side]}px`,
        padding: 0,
        border: 0,
      },
    });
  };
  const leading = (rowspan = 1) => [
    model.expandLabel
      ? head({
          scope: "col",
          rowspan,
          "aria-label": model.expandLabel,
          "data-adapttable-part": "expand-header",
          class: [names.th, names.expandHeader],
          style: { width: "40px" },
        })
      : null,
    model.headerCheckboxAttrs
      ? head(
          {
            scope: "col",
            rowspan,
            "data-adapttable-part": "selection-header",
            class: names.selectionHeader,
          },
          () => selection(model.headerCheckboxAttrs!, true)
        )
      : null,
    model.reorderLabel
      ? head(
          {
            scope: "col",
            rowspan,
            "data-adapttable-part": "reorder-header",
            class: [names.th, names.reorderHeader],
          },
          () => model.reorderLabel
        )
      : null,
    spacer(true, "start", rowspan),
  ];
  const trailing = (rowspan = 1) => [
    spacer(true, "end", rowspan),
    model.actionsLabel
      ? head(
          {
            scope: "col",
            role: "columnheader",
            rowspan,
            "data-adapttable-part": "actions-header",
            class: names.actionsHeader,
          },
          () => model.actionsLabel
        )
      : null,
  ];
  const header = (key: string, extra: Attrs = {}) => {
    const item = model.headers.find((candidate) => candidate.key === key);
    if (!item) return null;
    const caption = renderHeader(item.context, controls.header);
    const content =
      item.sortAttrs && !item.column.headerCell && !controls.header
        ? controls.SortButton({
            attrs: mergeVueAttrs(item.sortAttrs, {
              class: names.sortButton,
              "data-adapttable-part": "sort-button",
            }),
            context: item.context,
            content: h(Fragment, null, [
              caption,
              item.context.sortIndex == null
                ? null
                : h(
                    "span",
                    {
                      class: names.sortIndex,
                      "data-adapttable-part": "sort-index",
                    },
                    String(item.context.sortIndex)
                  ),
            ]),
          })
        : caption;
    const actions = item.column.headerActions
      ? renderContent(item.column.headerActions, item.context)
      : controls.headerActions?.(item.context);
    return head(
      mergeVueAttrs(userSizedAttrs(item.attrs, item.column), {
        ...extra,
        key,
        class: [names.th, names.headerCell],
        "data-adapttable-part": "header-cell",
      }),
      () => [
        item.rename ? item.rename(content, { ...names }) : content,
        item.selection?.(names.columnSelect),
        item.filter?.(names.filterHeaderTrigger),
        actions == null
          ? null
          : h(
              "span",
              {
                class: names.headerActions,
                "data-adapttable-part": "header-actions",
              },
              [actions]
            ),
        item.resizeAttrs
          ? requireControl(
              controls.ResizeHandle,
              "ResizeHandle"
            )({
              attrs: mergeVueAttrs(item.resizeAttrs, {
                class: names.resizeHandle,
                "data-adapttable-part": "resize-handle",
              }),
            })
          : null,
      ]
    );
  };
  const groupHeader = (
    item: NonNullable<DesktopTableModel<TRow>["headerPlan"]>[number][number]
  ) => {
    if (item.kind === "leaf")
      return header(item.key, { rowspan: item.rowSpan });
    const toggle = model.groupToggleProps(item.cell);
    return head(
      {
        key: item.key,
        scope: "colgroup",
        role: "columnheader",
        colspan: item.colSpan,
        rowspan: item.rowSpan,
        class: names.columnGroup,
        "data-adapttable-part": "header-group-cell",
      },
      () => [
        columnGroupHeaderCaption(item.cell),
        toggle
          ? requireControl(
              controls.ColumnGroupToggle,
              "ColumnGroupToggle"
            )({ ...toggle, className: names.columnGroupToggle })
          : null,
      ]
    );
  };
  const plan = model.headerPlan;
  const headerRows = plan?.length
    ? plan.map((items, index) =>
        naiveElement(
          NTr,
          mergeVueAttrs(model.headerRowAttrs, {
            key: index,
            class: names.tr,
            "data-adapttable-part":
              index === plan.length - 1 ? "header-row" : "header-group-row",
          }),
          () => [
            ...(index === 0 ? leading(plan.length) : []),
            ...items.map(groupHeader),
            ...(index === 0 ? trailing(plan.length) : []),
          ]
        )
      )
    : [
        naiveElement(
          NTr,
          mergeVueAttrs(model.headerRowAttrs, {
            class: names.tr,
            "data-adapttable-part": "header-row",
          }),
          () => [
            ...leading(),
            ...model.headers.map((item) => header(item.key)),
            ...trailing(),
          ]
        ),
      ];
  const row = (item: TableRowModel<TRow>): VNode => {
    const rowCells = item.cells.map((entry) =>
      cell(
        mergeVueAttrs(userSizedAttrs(entry.attrs, entry.context.column), {
          key: entry.key,
          class: names.td,
          "data-adapttable-part": "cell",
        }),
        () => naiveCellContent(entry, item, controls, names, !model.expandLabel)
      )
    );
    return h(Fragment, { key: item.key }, [
      naiveElement(NTr, mergeVueAttrs(item.attrs, { class: names.tr }), () => [
        model.expandLabel
          ? cell(
              mergeVueAttrs(item.expandCellAttrs ?? {}, {
                class: [names.td, names.expandCell],
                "data-adapttable-part": "expand-cell",
              }),
              () =>
                item.detail
                  ? requireControl(
                      controls.RowDetailToggle,
                      "RowDetailToggle"
                    )({
                      attrs: mergeVueAttrs(item.detail.toggleAttrs, {
                        class: [names.expandButton, names.expandToggle],
                      }),
                      expanded: item.detail.expanded,
                    })
                  : null
            )
          : null,
        model.headerCheckboxAttrs
          ? cell(
              {
                class: names.selectionCell,
                "data-adapttable-part": "selection-cell",
              },
              () =>
                item.checkboxAttrs ? selection(item.checkboxAttrs, false) : null
            )
          : null,
        model.reorderLabel
          ? cell(
              {
                class: [names.td, names.reorderCell],
                "data-adapttable-part": "reorder-cell",
              },
              () => item.reorder?.(false)
            )
          : null,
        spacer(false, "start"),
        ...rowCells,
        spacer(false, "end"),
        model.actionsLabel
          ? cell(
              {
                class: names.actionsCell,
                "data-adapttable-part": "actions-cell",
              },
              () => [
                item.editActions?.(),
                item.actionControls?.length
                  ? requireControl(
                      controls.RowActions,
                      "RowActions"
                    )({
                      row: item.row,
                      controls: item.actionControls,
                      mobile: false,
                    })
                  : null,
              ]
            )
          : null,
      ]),
      item.detail?.expanded
        ? naiveElement(
            NTr,
            {
              class: names.detailRow,
              "data-adapttable-part": "detail-row",
              ref: item.detail.measure,
            },
            () =>
              cell(
                {
                  colspan: model.columnCount,
                  class: names.detailCell,
                  "data-adapttable-part": "detail-cell",
                },
                () => item.detail?.render()
              )
          )
        : null,
    ]);
  };
  const body = (slot: TableBodySlot<TRow>): VNode => {
    if (slot.kind === "row") return row(slot.wiring);
    if (slot.kind === "group")
      return h(Fragment, { key: slot.key }, [
        requireControl(
          controls.GroupRow,
          "GroupRow"
        )({
          slot,
          columnCount: model.columnCount,
          mobile: false,
          classNames: names,
        }),
      ]);
    if (slot.kind === "virtualPad")
      return naiveElement(
        NTr,
        {
          key: slot.key,
          "aria-hidden": "true",
          class: names.virtualSpacer,
          "data-adapttable-part": "virtual-spacer",
        },
        () =>
          cell({
            colspan: slot.colSpan,
            style: { height: `${slot.height}px`, padding: 0, border: 0 },
          })
      );
    const parts = EXTRA_ROW_PARTS[slot.extraKind];
    const extraCells = extraUncoveredColSpans(
      slot.colSpan,
      slot.coveredSlots
    ).map((colspan, index) =>
      cell(
        {
          key: index,
          colspan,
          style: slot.fillStyle,
          "data-adapttable-part": parts.cell,
        },
        () => (index === 0 ? slot.render?.() : null)
      )
    );
    return naiveElement(
      NTr,
      { ...slot.attrs, key: slot.key, "data-adapttable-part": parts.row },
      () => extraCells
    );
  };

  const summary = model.summary;
  const summaryCells =
    summary?.cells.map((entry) =>
      cell(
        mergeVueAttrs(entry.attrs, {
          key: entry.key,
          class: names.summaryCell,
          "data-adapttable-part": "summary-cell",
        }),
        () => renderFooter(entry.context, controls.footer)
      )
    ) ?? [];
  const summaryPad = (key: string) =>
    cell({
      key,
      class: names.summaryCell,
      "data-adapttable-part": "summary-cell",
    });
  return naiveElement(
    NTable,
    mergeVueAttrs(model.attrs, {
      size: props.density === "compact" ? "small" : "medium",
      class: names.table,
      "data-adapttable-part": "table",
    }),
    () => [
      naiveElement(
        NThead,
        { class: names.thead, "data-adapttable-part": "thead" },
        () => headerRows
      ),
      naiveElement(
        NTbody,
        { class: names.tbody, "data-adapttable-part": "tbody" },
        () =>
          model.bodySlots ? model.bodySlots.map(body) : model.rows.map(row)
      ),
      summary
        ? h(
            "tfoot",
            { class: names.summary, "data-adapttable-part": "summary" },
            [
              naiveElement(
                NTr,
                {
                  class: names.summaryRow,
                  "data-adapttable-part": "summary-row",
                },
                () => [
                  ...(model.expandLabel ? [summaryPad("expand")] : []),
                  ...(model.headerCheckboxAttrs
                    ? [summaryPad("selection")]
                    : []),
                  ...(model.reorderLabel ? [summaryPad("reorder")] : []),
                  spacer(false, "start"),
                  ...summaryCells,
                  spacer(false, "end"),
                  ...(model.actionsLabel ? [summaryPad("actions")] : []),
                ]
              ),
            ]
          )
        : null,
    ]
  );
}
NaiveDesktopTable.props = ["model", "controls", "classNames", "density"];
