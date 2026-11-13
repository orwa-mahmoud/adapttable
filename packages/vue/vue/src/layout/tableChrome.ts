/** Structural table markup. Every interactive control is an adapter slot. */
import {
  columnGroupHeaderCaption,
  type ColumnGroupToggleProps,
  EXTRA_ROW_PARTS,
  extraUncoveredColSpans,
  groupedHeaderAlign,
  type HeaderGroupCell,
} from "@adapttable/core/binding";
import {
  Comment,
  type ComponentPublicInstance,
  Fragment,
  h,
  isVNode,
  Text,
  type VNode,
  type VNodeArrayChildren,
  type VNodeChild,
} from "vue";

import { type Attrs, mergeVueAttrs } from "../attrs";
import {
  type CellContext,
  type FooterContext,
  type HeaderContext,
  renderCell,
  renderContent,
  renderHeader,
} from "../columnDef";
import { withProps } from "../functionalProps";
import type { GroupRowChromeProps } from "../grouping/groupRowChrome";
import {
  type SelectionCheckboxAttrs,
  type SelectionCheckboxControl,
  selectionCheckboxControl,
} from "../selection/checkboxControl";
import type { DataTableSlots } from "../tableAdapterContracts";
import type { RowActionControl } from "./modelChannels";
import { keptRowContext, tableRowView } from "./rowView";
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
  readonly expandHeader?: string;
  readonly expandCell?: string;

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
  readonly headerCaptionControl?: string;
  readonly sortButton?: string;
  readonly sortIndex?: string;
  readonly headerActions?: string;
  readonly selectionHeader?: string;
  readonly selectionCell?: string;
  readonly selectionCheckbox?: string;
  readonly columnGroup?: string;
  readonly columnGroupToggle?: string;
  readonly resizeHandle?: string;
  readonly columnSelect?: string;
  readonly fillHandle?: string;
  readonly filterHeaderInput?: string;
  readonly filterHeaderTrigger?: string;
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
  readonly card?: NonNullable<DataTableSlots<TRow>["card"]>;
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
  readonly headerActions?: (context: HeaderContext<TRow>) => VNodeChild;
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
  names: TableChromeClassNames,
  inlineDetail = false
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
  return inlineDetail && row.detail && cell === row.cells[0]
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
function hasHeaderActionContent(content: VNodeChild): boolean {
  if (content == null || typeof content === "boolean") return false;
  if (Array.isArray(content)) return content.some(hasHeaderActionContent);
  if (isVNode(content)) {
    if (content.type === Comment) return false;
    if (content.type === Fragment || content.type === Text) {
      const children = content.children;
      return Array.isArray(children)
        ? children.some(hasHeaderActionContent)
        : typeof children === "string" && children.trim().length > 0;
    }
    return true;
  }
  return typeof content !== "string" || content.trim().length > 0;
}
/**
 * One empty set of class names, so a table drawn without any passes the same
 * object to its rows on every draw.
 *
 * @public
 */
export const NO_CLASS_NAMES: Readonly<Record<string, undefined>> =
  Object.freeze({});
/**
 * The table elements the desktop chrome draws a cell, row or table with.
 *
 * @public
 */
export type DesktopTableTag = "table" | "tr" | "th" | "td";

/**
 * A kit's own element for each table element; an absent one is the plain
 * element. Each receives the binding's attributes (parts, classes, keys and
 * ARIA) and children.
 *
 * @public
 */
export type DesktopTableHosts = Partial<
  Record<DesktopTableTag, (attrs: Attrs, children: VNodeArrayChildren) => VNode>
>;

export const DesktopTableChrome = /* @__PURE__ */ withProps(
  function DesktopTableChrome<TRow>(props: {
    readonly model: DesktopTableModel<TRow>;
    readonly slots: TableChromeSlots<TRow>;
    readonly classNames?: TableChromeClassNames;
    readonly hosts?: DesktopTableHosts;
  }): VNodeChild {
    const { model, slots, classNames = NO_CLASS_NAMES, hosts } = props;
    const el = (
      tag: DesktopTableTag,
      attrs: Attrs,
      children: VNodeArrayChildren = []
    ): VNode => hosts?.[tag]?.(attrs, children) ?? h(tag, attrs, children);
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
      const defaultContent = [
        content,
        leaf.context.sortIndex === undefined
          ? null
          : h(
              "span",
              {
                "data-adapttable-part": "sort-index",
                class: classNames.sortIndex,
              },
              String(leaf.context.sortIndex)
            ),
      ];
      const actions = leaf.column.headerActions
        ? renderContent(leaf.column.headerActions, leaf.context)
        : slots.headerActions?.(leaf.context);
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
                content: defaultContent,
              },
              "SortButton"
            )
          : content;
      const captionControl = h(
        "span",
        {
          "data-adapttable-part": "header-caption-control",
          class: classNames.headerCaptionControl,
        },
        [caption]
      );
      return el(
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
          leaf.rename
            ? leaf.rename(captionControl, { ...classNames })
            : captionControl,
          leaf.selection?.(classNames.columnSelect),
          leaf.filter?.(classNames.filterHeaderTrigger),
          !hasHeaderActionContent(actions)
            ? null
            : h(
                "span",
                {
                  "data-adapttable-part": "header-actions",
                  class: classNames.headerActions,
                },
                [actions]
              ),
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
    const expandHeader = (rowspan = 1): VNodeChild =>
      model.expandLabel
        ? el("th", {
            scope: "col",
            rowspan,
            "aria-label": model.expandLabel,
            "data-adapttable-part": "expand-header",
            class: [classNames.th, classNames.expandHeader],
            style: { width: "40px" },
          })
        : null;
    const reorderHeader = (rowspan = 1): VNodeChild =>
      model.reorderLabel
        ? el(
            "th",
            {
              scope: "col",
              rowspan,
              class: [classNames.th, classNames.reorderHeader],
              "data-adapttable-part": "reorder-header",
            },
            [model.reorderLabel]
          )
        : null;
    const actionsHeader = (rowspan = 1): VNodeChild =>
      model.actionsLabel
        ? el(
            "th",
            {
              scope: "col",
              role: "columnheader",
              rowspan,
              class: classNames.actionsHeader,
              "data-adapttable-part": "actions-header",
            },
            [model.actionsLabel]
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
          el(
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
              rowIndex === 0 ? expandHeader(model.headerPlan?.length) : null,
              rowIndex === 0 && model.headerCheckboxAttrs
                ? el(
                    "th",
                    {
                      scope: "col",
                      class: classNames.selectionHeader,
                      rowspan: model.headerPlan?.length,
                      "data-adapttable-part": "selection-header",
                      style: {
                        width: "1%",
                        minWidth: "44px",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                      },
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
                  : el(
                      "th",
                      {
                        key: cell.key,
                        scope: "colgroup",
                        role: "columnheader",
                        colspan: cell.colSpan,
                        rowspan: cell.rowSpan,
                        class: classNames.columnGroup,
                        "data-adapttable-part": "header-group-cell",
                        style: {
                          textAlign: groupedHeaderAlign(cell.cell.align),
                        },
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
          el(
            "tr",
            mergeVueAttrs(model.headerRowAttrs, {
              class: classNames.tr,
              "data-adapttable-part": "header-row",
            }),
            [
              expandHeader(),
              model.headerCheckboxAttrs
                ? el(
                    "th",
                    {
                      scope: "col",
                      class: classNames.selectionHeader,
                      "data-adapttable-part": "selection-header",
                      style: {
                        width: "1%",
                        minWidth: "44px",
                        whiteSpace: "nowrap",
                        textAlign: "center",
                      },
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
      const data = el(
        "tr",
        { ...mergeVueAttrs(row.attrs, { class: classNames.tr }), key: row.key },
        [
          model.expandLabel
            ? el(
                "td",
                mergeVueAttrs(row.expandCellAttrs ?? {}, {
                  class: [classNames.td, classNames.expandCell],
                  "data-adapttable-part": "expand-cell",
                }),
                [
                  row.detail
                    ? control(
                        slots.RowDetailToggle,
                        {
                          attrs: mergeVueAttrs(row.detail.toggleAttrs, {
                            class: [
                              classNames.expandButton,
                              classNames.expandToggle,
                            ],
                          }),
                          expanded: row.detail.expanded,
                        },
                        "RowDetailToggle"
                      )
                    : null,
                ]
              )
            : null,
          model.headerCheckboxAttrs
            ? el(
                "td",
                {
                  class: classNames.selectionCell,
                  "data-adapttable-part": "selection-cell",
                  style: {
                    width: "1%",
                    minWidth: "44px",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  },
                },
                [row.checkboxAttrs ? selection(row.checkboxAttrs, false) : null]
              )
            : null,
          model.reorderLabel
            ? el(
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
            el(
              "td",
              {
                ...mergeVueAttrs(cell.attrs, {
                  class: classNames.td,
                  "data-adapttable-part": "cell",
                }),
                key: cell.key,
              },
              [cellContent(cell, row, slots, classNames, !model.expandLabel)]
            )
          ),
          columnSpacer("td", "end"),
          model.actionsLabel
            ? el(
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
      return h(Fragment, { key: row.key }, [
        data,
        row.detail?.expanded
          ? el(
              "tr",
              {
                "data-adapttable-part": "detail-row",
                ref: (node: Element | ComponentPublicInstance | null) =>
                  row.detail?.measure?.(node instanceof Element ? node : null),
                class: classNames.detailRow,
              },
              [
                el(
                  "td",
                  {
                    colspan: model.columnCount,
                    "data-adapttable-part": "detail-cell",
                    class: classNames.detailCell,
                  },
                  [row.detail.render()]
                ),
              ]
            )
          : null,
      ]);
    };
    // Each row in a component of its own: it redraws for its own changes.
    // A row redraws when what it reads from the model changes, not each
    // time the model is rebuilt for another row's data.
    const rowModel = keptRowContext(slots, {
      actionsLabel: model.actionsLabel,
      columnCount: model.columnCount,
      expandLabel: model.expandLabel,
      selectable: model.headerCheckboxAttrs !== undefined,
      reorderLabel: model.reorderLabel,
    });
    const row = (wiring: TableRowModel<TRow>): VNode =>
      tableRowView(
        wiring,
        { model: rowModel, controls: slots, classNames },
        () => rowContent(wiring)
      );
    const bodySlot = (slot: TableBodySlot<TRow>): VNode => {
      if (slot.kind === "row") return row(slot.wiring);
      if (slot.kind === "group")
        return h(Fragment, { key: slot.key }, [
          control(
            slots.GroupRow,
            { slot, columnCount: model.columnCount, mobile: false, classNames },
            "GroupRow"
          ),
        ]);
      if (slot.kind === "virtualPad")
        return el(
          "tr",
          {
            key: slot.key,
            "aria-hidden": "true",
            class: classNames.virtualSpacer,
            "data-adapttable-part": "virtual-spacer",
          },
          [
            el("td", {
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
      return el(
        "tr",
        { ...slot.attrs, key: slot.key, "data-adapttable-part": parts.row },
        spans.map((span, index) =>
          el(
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
    return el(
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
          model.bodySlots ? model.bodySlots.map(bodySlot) : model.rows.map(row)
        ),
        model.summary
          ? h(TableSummaryChrome<TRow>, {
              model: model.summary,
              footer: slots.footer,
              classNames,
              leading: [
                ...(model.expandLabel ? ["expand"] : []),
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
  },
  ["model", "slots", "classNames", "hosts"]
);
/**
 * A card region the kit places in its own surface: the attributes its element
 * carries (part and class) and what goes inside.
 *
 * @public
 */
export interface MobileCardRegion {
  readonly attrs: Attrs;
  readonly content: VNodeChild;
}

/**
 * One card's regions, built by the binding, in reading order.
 *
 * @public
 */
export interface MobileCardRegions {
  /** The row's selection checkbox, while rows can be selected. */
  readonly select: VNodeChild;
  /** The row's move controls, while rows can be reordered. */
  readonly reorder: VNodeChild;
  /** The labelled fields, or the host's own card. */
  readonly body: VNodeChild;
  /** The row's detail, while expanded. */
  readonly detail: MobileCardRegion | null;
  /** The row editor's and the row's actions. */
  readonly actions: MobileCardRegion | null;
}

/**
 * The elements a kit draws the card list with; each absent one is the
 * binding's own plain element.
 *
 * @public
 */
export interface MobileCardsHosts {
  /** The list around the cards. */
  readonly list?: (attrs: Attrs, children: VNodeChild[]) => VNode;
  /** One card, arranging its regions. */
  readonly card?: (attrs: Attrs, regions: MobileCardRegions) => VNode;
  /** An extra row, around its cell. */
  readonly extra?: (attrs: Attrs, cell: VNode) => VNode;
  /** A virtual spacer. */
  readonly pad?: (attrs: Attrs) => VNode;
  /** The list of a card's labelled fields. */
  readonly fields?: (attrs: Attrs, rows: VNodeArrayChildren) => VNode;
}

const defaultCard = (attrs: Attrs, regions: MobileCardRegions): VNode =>
  h("article", attrs, [
    regions.select,
    regions.reorder,
    regions.body,
    regions.detail
      ? h("div", regions.detail.attrs, [regions.detail.content])
      : null,
    regions.actions
      ? h("div", regions.actions.attrs, [regions.actions.content])
      : null,
  ]);

const defaultList = (attrs: Attrs, children: VNodeChild[]): VNode =>
  h("div", attrs, children);

const defaultExtra = (attrs: Attrs, cell: VNode): VNode =>
  h("div", attrs, [cell]);

const defaultPad = (attrs: Attrs): VNode => h("div", attrs);

const defaultFields = (attrs: Attrs, rows: VNodeArrayChildren): VNode =>
  h("dl", attrs, rows);

export const MobileCardsChrome = /* @__PURE__ */ withProps(
  function MobileCardsChrome<TRow>(props: {
    readonly model: MobileCardsModel<TRow>;
    readonly slots: TableChromeSlots<TRow>;
    readonly classNames?: TableChromeClassNames;
    readonly hosts?: MobileCardsHosts;
  }): VNodeChild {
    const { model, slots, classNames = NO_CLASS_NAMES, hosts } = props;
    const card = (row: TableRowModel<TRow>): VNode => {
      const regions: MobileCardRegions = {
        select: row.checkboxAttrs
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
        reorder: row.reorder?.(true),
        body: slots.card
          ? slots.card({
              row: row.row,
              index: row.index,
              selected: row.checkboxAttrs?.checked === true,
              expanded: row.detail?.expanded === true,
              fields: row.cells.map((cell) => ({
                column: cell.context.column,
                label:
                  cell.context.column.mobileLabel ??
                  cell.context.column.header ??
                  cell.key,
                value: cellContent(cell, row, slots, classNames, true),
              })),
            })
          : (hosts?.fields ?? defaultFields)(
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
                      [cellContent(cell, row, slots, classNames, true)]
                    ),
                  ]
                )
              )
            ),
        detail: row.detail?.expanded
          ? {
              attrs: {
                "data-adapttable-part": "card-detail",
                class: classNames.cardDetail,
              },
              content: [row.detail.render()],
            }
          : null,
        actions:
          row.actionControls || row.editActions
            ? {
                attrs: {
                  class: classNames.cardActions,
                  "data-adapttable-part": "card-actions",
                },
                content: [
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
                ],
              }
            : null,
      };
      const attrs = {
        ...mergeVueAttrs(row.attrs, { class: classNames.card }),
        key: row.key,
      };
      return (hosts?.card ?? defaultCard)(attrs, regions);
    };
    // Each card in a component of its own: it redraws for its own changes.
    const cardView = (row: TableRowModel<TRow>): VNode =>
      tableRowView(row, { model, controls: slots, classNames }, () =>
        card(row)
      );
    const bodySlot = (slot: TableBodySlot<TRow>): VNodeChild => {
      if (slot.kind === "row") return cardView(slot.wiring);
      if (slot.kind === "group")
        return h(Fragment, { key: slot.key }, [
          control(
            slots.GroupRow,
            { slot, columnCount: 1, mobile: true, classNames },
            "GroupRow"
          ),
        ]);
      if (slot.kind === "virtualPad")
        return (hosts?.pad ?? defaultPad)({
          key: slot.key,
          "aria-hidden": "true",
          class: classNames.virtualSpacer,
          style: { height: `${String(slot.height)}px` },
          "data-adapttable-part": "virtual-spacer",
        });
      const parts = EXTRA_ROW_PARTS[slot.extraKind];
      return (hosts?.extra ?? defaultExtra)(
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
    return (hosts?.list ?? defaultList)(
      mergeVueAttrs(model.attrs, { class: classNames.cards }),
      [
        ...(model.bodySlots
          ? model.bodySlots.map(bodySlot)
          : model.rows.map(cardView)),
        model.summary
          ? h(MobileSummaryChrome<TRow>, {
              model: model.summary,
              footer: slots.footer,
              classNames,
            })
          : null,
      ]
    );
  },
  ["model", "slots", "classNames", "hosts"]
);
