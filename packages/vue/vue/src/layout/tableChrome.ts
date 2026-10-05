/** Structural table markup. Every interactive control is an adapter slot. */
import {
  columnGroupHeaderCaption,
  type ColumnGroupToggleProps,
  EXTRA_ROW_PARTS,
  extraUncoveredColSpans,
  type HeaderGroupCell,
} from "@adapttable/core/binding";
import {
  type ComponentPublicInstance,
  Fragment,
  h,
  type VNode,
  type VNodeChild,
} from "vue";

import { type Attrs, mergeVueAttrs } from "../attrs";
import {
  type CellContext,
  type FooterContext,
  type HeaderContext,
  renderCell,
  renderHeader,
} from "../columnDef";
import type { GroupRowChromeProps } from "../grouping/groupRowChrome";
import {
  type SelectionCheckboxAttrs,
  type SelectionCheckboxControl,
  selectionCheckboxControl,
} from "../selection/checkboxControl";
import type { RowActionControl } from "./modelChannels";
import type {
  DesktopTableModel,
  MobileCardsModel,
  TableBodySlot,
  TableCellModel,
  TableRowModel,
} from "./tableModels";
import {
  MobileSummaryChrome,
  TableSummaryChrome,
  type TableSummaryClassNames,
} from "./tableSummaryChrome";
export interface TableChromeClassNames extends TableSummaryClassNames {
  readonly groupCell?: string;
  readonly groupCard?: string;
  readonly groupSelect?: string;
  readonly groupFooterRow?: string;
  readonly groupFooterCell?: string;
  readonly groupMoreRow?: string;
  readonly groupMoreCell?: string;
  readonly expandButton?: string;

  readonly columnMenu?: string;
  readonly columnMenuButton?: string;
  readonly columnMenuPanel?: string;
  readonly columnMenuHeader?: string;
  readonly columnMenuTitle?: string;
  readonly columnMenuSearch?: string;
  readonly columnMenuBulk?: string;
  readonly columnMenuBulkButton?: string;
  readonly columnMenuItem?: string;
  readonly columnMenuGrip?: string;
  readonly columnMenuVisibility?: string;
  readonly columnMenuLabel?: string;
  readonly columnMenuPin?: string;
  readonly columnMenuMore?: string;
  readonly columnMenuSubmenu?: string;
  readonly columnMenuAction?: string;
  readonly columnMenuChoice?: string;
  readonly columnMenuChoiceLabel?: string;
  readonly columnMenuChoiceSelect?: string;
  readonly columnMenuSeparator?: string;
  readonly columnMenuAutoSize?: string;
  readonly columnMenuReset?: string;
  readonly columnRenameForm?: string;
  readonly columnRenameLabel?: string;
  readonly columnRenameInput?: string;
  readonly columnRenameError?: string;
  readonly columnRenameSave?: string;
  readonly columnRenameCancel?: string;
  readonly columnRenameAnnouncer?: string;
  readonly headerRenameButton?: string;
  readonly headerRenameForm?: string;
  readonly headerRenameLabel?: string;
  readonly headerRenameInput?: string;
  readonly headerRenameError?: string;
  readonly headerRenameSave?: string;
  readonly headerRenameCancel?: string;
  readonly headerRenameAnnouncer?: string;

  readonly table?: string;
  readonly thead?: string;
  readonly tbody?: string;
  readonly tr?: string;
  readonly th?: string;
  readonly td?: string;
  readonly sortButton?: string;
  readonly selectionHeader?: string;
  readonly selectionCell?: string;
  readonly selectionCheckbox?: string;
  readonly columnGroup?: string;
  readonly columnGroupToggle?: string;
  readonly resizeHandle?: string;
  readonly columnSelect?: string;
  readonly fillHandle?: string;
  readonly filterHeaderInput?: string;
  readonly actionsHeader?: string;
  readonly actionsCell?: string;
  readonly reorderHeader?: string;
  readonly reorderCell?: string;
  readonly virtualSpacer?: string;
  readonly cardActions?: string;
  readonly groupRow?: string;
  readonly groupLabel?: string;
  readonly groupToggle?: string;
  readonly groupCount?: string;
  readonly groupAggregate?: string;
  readonly groupMore?: string;
  readonly groupCheckbox?: string;
  readonly treeCell?: string;
  readonly treeToggle?: string;
  readonly treeSpacer?: string;
  readonly expandToggle?: string;
  readonly detailRow?: string;
  readonly detailCell?: string;
  readonly cardDetail?: string;
  readonly cards?: string;
  readonly card?: string;
  readonly cardFields?: string;
  readonly cardRow?: string;
  readonly cardLabel?: string;
  readonly cardValue?: string;
}
export interface SortButtonProps<TRow> {
  readonly attrs: Attrs;
  readonly context: HeaderContext<TRow>;
  readonly content: VNodeChild;
}
export interface SelectionCheckboxProps extends SelectionCheckboxControl {
  readonly header: boolean;
}
export interface TableChromeSlots<TRow> {
  readonly SortButton: (props: SortButtonProps<TRow>) => VNodeChild;
  readonly SelectionCheckbox: (props: SelectionCheckboxProps) => VNodeChild;
  readonly RowActions?: (props: {
    readonly row: TRow;
    readonly controls: readonly RowActionControl<TRow>[];
    readonly mobile: boolean;
  }) => VNodeChild;
  readonly ColumnGroupToggle?: (props: ColumnGroupToggleProps) => VNodeChild;
  readonly ResizeHandle?: (props: { readonly attrs: Attrs }) => VNodeChild;
  readonly TreeToggle?: (props: {
    readonly attrs: Attrs;
    readonly expanded: boolean;
    readonly loading: boolean;
  }) => VNodeChild;
  readonly RowDetailToggle?: (props: {
    readonly attrs: Attrs;
    readonly expanded: boolean;
  }) => VNodeChild;
  readonly GroupRow?: (props: {
    readonly slot: Extract<TableBodySlot<TRow>, { kind: "group" }>;
    readonly classNames?: NonNullable<GroupRowChromeProps<TRow>["classNames"]>;
    readonly columnCount: number;
    readonly mobile: boolean;
  }) => VNodeChild;
  readonly cell?: (context: CellContext<TRow>) => VNodeChild;
  readonly header?: (context: HeaderContext<TRow>) => VNodeChild;
  readonly footer?: (context: FooterContext<TRow>) => VNodeChild;
}
function control<TProps>(
  slot: ((props: TProps) => VNodeChild) | undefined,
  props: TProps,
  name: string
): VNodeChild {
  if (!slot)
    throw new Error(
      `AdaptTable: required adapter control slot "${name}" is missing.`
    );
  return slot(props);
}
function cellContent<TRow>(
  cell: TableCellModel<TRow>,
  row: TableRowModel<TRow>,
  slots: TableChromeSlots<TRow>,
  names: TableChromeClassNames
): VNodeChild {
  const display = renderCell(cell.context, slots.cell);
  const rendered = cell.render ? cell.render(display) : display;
  const value = cell.addon
    ? h(Fragment, null, [rendered, cell.addon(names.fillHandle)])
    : rendered;
  const tree = cell.tree;
  const content = tree
    ? h("span", mergeVueAttrs(tree.attrs, { class: names.treeCell }), [
        tree.toggleAttrs
          ? control(
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
              "aria-hidden": "true",
              "data-adapttable-part": "tree-spacer",
              class: names.treeSpacer,
              style: { display: "inline-block", width: "1.5em", flexShrink: 0 },
            }),
        value,
      ])
    : value;
  return row.detail && cell === row.cells[0]
    ? h(Fragment, null, [
        control(
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
      ])
    : content;
}
export function DesktopTableChrome<TRow>(props: {
  readonly model: DesktopTableModel<TRow>;
  readonly slots: TableChromeSlots<TRow>;
  readonly classNames?: TableChromeClassNames;
}): VNodeChild {
  const { model, slots, classNames = {} } = props;
  const selection = (
    attrs: SelectionCheckboxAttrs,
    header: boolean
  ): VNodeChild =>
    control(
      slots.SelectionCheckbox,
      {
        ...selectionCheckboxControl(attrs),
        attrs: mergeVueAttrs(attrs, {
          class: classNames.selectionCheckbox,
          "data-adapttable-part": "checkbox",
        }),
        header,
      },
      "SelectionCheckbox"
    );
  const header = (key: string, extra: Attrs = {}): VNodeChild => {
    const leaf = model.headers.find((item) => item.key === key);
    if (!leaf) return null;
    const content = renderHeader(leaf.context, slots.header);
    const caption =
      leaf.sortAttrs && !leaf.column.headerCell && !slots.header
        ? control(
            slots.SortButton,
            {
              attrs: mergeVueAttrs(leaf.sortAttrs, {
                class: classNames.sortButton,
                "data-adapttable-part": "sort-button",
              }),
              context: leaf.context,
              content,
            },
            "SortButton"
          )
        : content;
    return h(
      "th",
      {
        ...mergeVueAttrs(leaf.attrs, {
          class: classNames.th,
          "data-adapttable-part": "header-cell",
        }),
        ...extra,
        key,
      },
      [
        leaf.rename ? leaf.rename(caption, { ...classNames }) : caption,
        leaf.selection?.(classNames.columnSelect),
        leaf.filter?.(classNames.filterHeaderInput),
        leaf.resizeAttrs
          ? control(
              slots.ResizeHandle,
              {
                attrs: mergeVueAttrs(leaf.resizeAttrs, {
                  class: classNames.resizeHandle,
                  "data-adapttable-part": "resize-handle",
                }),
              },
              "ResizeHandle"
            )
          : null,
      ]
    );
  };
  const columnSpacer = (
    tag: "th" | "td",
    side: "start" | "end",
    rowspan = 1
  ): VNodeChild =>
    model.columnSpacers
      ? h(tag, {
          "aria-hidden": "true",
          rowspan,
          "data-adapttable-part": `column-spacer-${side}`,
          style: {
            width: `${model.columnSpacers[side]}px`,
            minWidth: `${model.columnSpacers[side]}px`,
            padding: 0,
            border: 0,
          },
        })
      : null;
  const reorderHeader = (rowspan = 1): VNodeChild =>
    model.reorderLabel
      ? h(
          "th",
          {
            scope: "col",
            rowspan,
            class: [classNames.th, classNames.reorderHeader],
            "data-adapttable-part": "reorder-header",
          },
          model.reorderLabel
        )
      : null;
  const actionsHeader = (rowspan = 1): VNodeChild =>
    model.actionsLabel
      ? h(
          "th",
          {
            scope: "col",
            role: "columnheader",
            rowspan,
            class: classNames.actionsHeader,
            "data-adapttable-part": "actions-header",
          },
          model.actionsLabel
        )
      : null;
  const groupContent = (cell: HeaderGroupCell): VNodeChild[] => {
    const toggle = model.groupToggleProps(cell);
    const caption = columnGroupHeaderCaption(cell);
    return [
      caption,
      toggle
        ? control(
            slots.ColumnGroupToggle,
            { ...toggle, className: classNames.columnGroupToggle },
            "ColumnGroupToggle"
          )
        : null,
    ];
  };
  const headerRows = model.headerPlan?.length
    ? model.headerPlan.map((row, rowIndex) =>
        h(
          "tr",
          {
            ...mergeVueAttrs(model.headerRowAttrs, { class: classNames.tr }),
            "data-adapttable-part":
              rowIndex === model.headerPlan!.length - 1
                ? "header-row"
                : "header-group-row",
            key: rowIndex,
          },
          [
            rowIndex === 0 && model.headerCheckboxAttrs
              ? h(
                  "th",
                  {
                    scope: "col",
                    class: classNames.selectionHeader,
                    rowspan: model.headerPlan?.length,
                    "data-adapttable-part": "selection-header",
                  },
                  [selection(model.headerCheckboxAttrs, true)]
                )
              : null,
            rowIndex === 0 ? reorderHeader(model.headerPlan?.length) : null,
            rowIndex === 0
              ? columnSpacer("th", "start", model.headerPlan?.length)
              : null,
            ...row.map((cell) =>
              cell.kind === "leaf"
                ? header(cell.key, { rowspan: cell.rowSpan })
                : h(
                    "th",
                    {
                      key: cell.key,
                      scope: "colgroup",
                      role: "columnheader",
                      colspan: cell.colSpan,
                      rowspan: cell.rowSpan,
                      class: classNames.columnGroup,
                      "data-adapttable-part": "header-group-cell",
                    },
                    groupContent(cell.cell)
                  )
            ),
            rowIndex === 0
              ? columnSpacer("th", "end", model.headerPlan?.length)
              : null,
            rowIndex === 0 ? actionsHeader(model.headerPlan?.length) : null,
          ]
        )
      )
    : [
        h(
          "tr",
          mergeVueAttrs(model.headerRowAttrs, {
            class: classNames.tr,
            "data-adapttable-part": "header-row",
          }),
          [
            model.headerCheckboxAttrs
              ? h(
                  "th",
                  {
                    scope: "col",
                    class: classNames.selectionHeader,
                    "data-adapttable-part": "selection-header",
                  },
                  [selection(model.headerCheckboxAttrs, true)]
                )
              : null,
            reorderHeader(),
            columnSpacer("th", "start"),
            ...model.headers.map((leaf) => header(leaf.key)),
            columnSpacer("th", "end"),
            actionsHeader(),
          ]
        ),
      ];
  const actionContent = (row: TableRowModel<TRow>): VNodeChild[] => [
    row.editActions?.(),
    row.actionControls?.length
      ? control(
          slots.RowActions,
          { row: row.row, controls: row.actionControls, mobile: false },
          "RowActions"
        )
      : null,
  ];
  const rowContent = (row: TableRowModel<TRow>): VNode => {
    const data = h(
      "tr",
      { ...mergeVueAttrs(row.attrs, { class: classNames.tr }), key: row.key },
      [
        model.headerCheckboxAttrs
          ? h(
              "td",
              {
                class: classNames.selectionCell,
                "data-adapttable-part": "selection-cell",
              },
              [row.checkboxAttrs ? selection(row.checkboxAttrs, false) : null]
            )
          : null,
        model.reorderLabel
          ? h(
              "td",
              {
                class: [classNames.td, classNames.reorderCell],
                "data-adapttable-part": "reorder-cell",
              },
              [row.reorder?.(false)]
            )
          : null,
        columnSpacer("td", "start"),
        ...row.cells.map((cell) =>
          h(
            "td",
            {
              ...mergeVueAttrs(cell.attrs, {
                class: classNames.td,
                "data-adapttable-part": "cell",
              }),
              key: cell.key,
            },
            [cellContent(cell, row, slots, classNames)]
          )
        ),
        columnSpacer("td", "end"),
        model.actionsLabel
          ? h(
              "td",
              {
                class: classNames.actionsCell,
                "data-adapttable-part": "actions-cell",
              },
              actionContent(row)
            )
          : null,
      ]
    );
    return row.detail?.expanded
      ? h(Fragment, { key: row.key }, [
          data,
          h(
            "tr",
            {
              "data-adapttable-part": "detail-row",
              ref: (node: Element | ComponentPublicInstance | null) =>
                row.detail?.measure?.(node instanceof Element ? node : null),
              class: classNames.detailRow,
            },
            [
              h(
                "td",
                {
                  colspan: model.columnCount,
                  "data-adapttable-part": "detail-cell",
                  class: classNames.detailCell,
                },
                [row.detail.render()]
              ),
            ]
          ),
        ])
      : data;
  };
  const bodySlot = (slot: TableBodySlot<TRow>): VNode => {
    if (slot.kind === "row") return rowContent(slot.wiring);
    if (slot.kind === "group")
      return h(Fragment, { key: slot.key }, [
        control(
          slots.GroupRow,
          { slot, columnCount: model.columnCount, mobile: false, classNames },
          "GroupRow"
        ),
      ]);
    if (slot.kind === "virtualPad")
      return h(
        "tr",
        {
          key: slot.key,
          "aria-hidden": "true",
          class: classNames.virtualSpacer,
          "data-adapttable-part": "virtual-spacer",
        },
        [
          h("td", {
            colspan: slot.colSpan,
            style: {
              height: `${String(slot.height)}px`,
              padding: 0,
              border: 0,
            },
          }),
        ]
      );
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
  };
  return h(
    "table",
    mergeVueAttrs(model.attrs, {
      class: classNames.table,
      "data-adapttable-part": "table",
    }),
    [
      h(
        "thead",
        { class: classNames.thead, "data-adapttable-part": "thead" },
        headerRows
      ),
      h(
        "tbody",
        { class: classNames.tbody, "data-adapttable-part": "tbody" },
        model.bodySlots
          ? model.bodySlots.map(bodySlot)
          : model.rows.map(rowContent)
      ),
      model.summary
        ? h(TableSummaryChrome<TRow>, {
            model: model.summary,
            footer: slots.footer,
            classNames,
            leading: [
              ...(model.headerCheckboxAttrs ? ["selection"] : []),
              ...(model.reorderLabel ? ["reorder"] : []),
            ],
            trailing: model.actionsLabel ? ["actions"] : [],
            startSpacer: () => columnSpacer("td", "start"),
            endSpacer: () => columnSpacer("td", "end"),
          })
        : null,
    ]
  );
}
export function MobileCardsChrome<TRow>(props: {
  readonly model: MobileCardsModel<TRow>;
  readonly slots: TableChromeSlots<TRow>;
  readonly classNames?: TableChromeClassNames;
}): VNodeChild {
  const { model, slots, classNames = {} } = props;
  const card = (row: TableRowModel<TRow>): VNode =>
    h(
      "article",
      { ...mergeVueAttrs(row.attrs, { class: classNames.card }), key: row.key },
      [
        row.checkboxAttrs
          ? control(
              slots.SelectionCheckbox,
              {
                ...selectionCheckboxControl(row.checkboxAttrs),
                attrs: mergeVueAttrs(row.checkboxAttrs, {
                  class: classNames.selectionCheckbox,
                  "data-adapttable-part": "checkbox",
                }),
                header: false,
              },
              "SelectionCheckbox"
            )
          : null,
        row.reorder?.(true),
        h(
          "dl",
          {
            class: classNames.cardFields,
          },
          row.cells.map((cell) =>
            h(
              "div",
              {
                key: cell.key,
                class: classNames.cardRow,
                "data-adapttable-part": "card-row",
              },
              [
                h(
                  "dt",
                  {
                    key: `${cell.key}-label`,
                    class: classNames.cardLabel,
                    "data-adapttable-part": "card-label",
                  },
                  cell.context.column.mobileLabel ??
                    cell.context.column.header ??
                    cell.key
                ),
                h(
                  "dd",
                  {
                    ...mergeVueAttrs(cell.attrs, {
                      class: classNames.cardValue,
                    }),
                    key: cell.key,
                    "data-adapttable-part": "card-value",
                  },
                  [cellContent(cell, row, slots, classNames)]
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
                class: classNames.cardDetail,
              },
              [row.detail.render()]
            )
          : null,
        row.actionControls || row.editActions
          ? h(
              "div",
              {
                class: classNames.cardActions,
                "data-adapttable-part": "card-actions",
              },
              [
                row.editActions?.(),
                row.actionControls?.length
                  ? control(
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
  const bodySlot = (slot: TableBodySlot<TRow>): VNodeChild => {
    if (slot.kind === "row") return card(slot.wiring);
    if (slot.kind === "group")
      return h(Fragment, { key: slot.key }, [
        control(
          slots.GroupRow,
          { slot, columnCount: 1, mobile: true, classNames },
          "GroupRow"
        ),
      ]);
    if (slot.kind === "virtualPad")
      return h("div", {
        key: slot.key,
        "aria-hidden": "true",
        class: classNames.virtualSpacer,
        style: { height: `${String(slot.height)}px` },
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
  };
  return h("div", mergeVueAttrs(model.attrs, { class: classNames.cards }), [
    ...(model.bodySlots ? model.bodySlots.map(bodySlot) : model.rows.map(card)),
    model.summary
      ? h(MobileSummaryChrome<TRow>, {
          model: model.summary,
          footer: slots.footer,
          classNames,
        })
      : null,
  ]);
}

DesktopTableChrome.props = ["model", "slots", "classNames"];
MobileCardsChrome.props = ["model", "slots", "classNames"];
