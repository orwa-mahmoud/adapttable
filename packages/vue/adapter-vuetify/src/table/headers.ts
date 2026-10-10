import type {
  Attrs,
  DesktopTableModel,
  TableHeaderModel,
} from "@adapttable/vue";
import {
  columnGroupHeaderCaption,
  type DataTableClassNames,
  mergeVueAttrs,
  renderContent,
  renderHeader,
  selectionCheckboxControl,
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

import { requiredControl } from "./requiredControl";

function hasContent(value: VNodeChild): boolean {
  if (value == null || typeof value === "boolean") return false;
  if (Array.isArray(value)) return value.some(hasContent);
  if (!isVNode(value)) return String(value).trim().length > 0;
  if (value.type === Comment) return false;
  if (value.type !== Fragment && value.type !== Text) return true;
  const children = value.children;
  return Array.isArray(children)
    ? children.some(hasContent)
    : typeof children === "string" && children.trim().length > 0;
}

export function vuetifyColumnSpacer<TRow>(
  model: DesktopTableModel<TRow>,
  tag: "th" | "td",
  side: "start" | "end",
  rowspan = 1
): VNodeChild {
  if (!model.columnSpacers) return null;
  const width = `${model.columnSpacers[side]}px`;
  return h(tag, {
    "aria-hidden": "true",
    rowspan,
    "data-adapttable-part": `column-spacer-${side}`,
    style: { width, minWidth: width, padding: 0, border: 0 },
  });
}

/** Headers consume the already resolved header plan and sort controls. */
export function vuetifyHeaderRows<TRow>(
  model: DesktopTableModel<TRow>,
  controls: TableChromeSlots<TRow>,
  names: DataTableClassNames
): VNode[] {
  function leafHeader(leaf: TableHeaderModel<TRow>, extra: Attrs = {}): VNode {
    const rendered = renderHeader(leaf.context, controls.header);
    const sortContent = [
      rendered,
      leaf.context.sortIndex === undefined
        ? null
        : h(
            "span",
            { "data-adapttable-part": "sort-index", class: names.sortIndex },
            String(leaf.context.sortIndex)
          ),
    ];
    const title =
      leaf.sortAttrs && !leaf.column.headerCell && !controls.header
        ? controls.SortButton({
            attrs: mergeVueAttrs(leaf.sortAttrs, {
              class: names.sortButton,
              "data-adapttable-part": "sort-button",
            }),
            context: leaf.context,
            content: sortContent,
          })
        : rendered;
    const actions = leaf.column.headerActions
      ? renderContent(leaf.column.headerActions, leaf.context)
      : controls.headerActions?.(leaf.context);
    return h(
      "th",
      {
        ...mergeVueAttrs(leaf.attrs, {
          class: names.th,
          "data-adapttable-part": "header-cell",
        }),
        ...extra,
        key: leaf.key,
      },
      [
        leaf.rename ? leaf.rename(title, { ...names }) : title,
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
              controls.ResizeHandle,
              "ResizeHandle"
            )({
              attrs: mergeVueAttrs(leaf.resizeAttrs, {
                class: names.resizeHandle,
                "data-adapttable-part": "resize-handle",
              }),
            })
          : null,
      ]
    );
  }
  function leading(rowspan: number): VNodeChild[] {
    return [
      model.expandLabel
        ? h("th", {
            scope: "col",
            rowspan,
            "aria-label": model.expandLabel,
            "data-adapttable-part": "expand-header",
            class: [names.th, names.expandHeader],
          })
        : null,
      model.headerCheckboxAttrs
        ? h(
            "th",
            {
              scope: "col",
              rowspan,
              "data-adapttable-part": "selection-header",
              class: names.selectionHeader,
            },
            [
              controls.SelectionCheckbox({
                ...selectionCheckboxControl(model.headerCheckboxAttrs),
                attrs: mergeVueAttrs(model.headerCheckboxAttrs, {
                  "data-adapttable-part": "checkbox",
                  class: names.selectionCheckbox,
                }),
                header: true,
              }),
            ]
          )
        : null,
      model.reorderLabel
        ? h(
            "th",
            {
              scope: "col",
              rowspan,
              "data-adapttable-part": "reorder-header",
              class: [names.th, names.reorderHeader],
            },
            model.reorderLabel
          )
        : null,
      vuetifyColumnSpacer(model, "th", "start", rowspan),
    ];
  }
  function trailing(rowspan: number): VNodeChild[] {
    return [
      vuetifyColumnSpacer(model, "th", "end", rowspan),
      model.actionsLabel
        ? h(
            "th",
            {
              scope: "col",
              role: "columnheader",
              rowspan,
              "data-adapttable-part": "actions-header",
              class: names.actionsHeader,
            },
            model.actionsLabel
          )
        : null,
    ];
  }
  const plan = model.headerPlan;
  if (!plan?.length)
    return [
      h(
        "tr",
        mergeVueAttrs(model.headerRowAttrs, {
          "data-adapttable-part": "header-row",
          class: names.tr,
        }),
        [
          ...leading(1),
          ...model.headers.map((header) => leafHeader(header)),
          ...trailing(1),
        ]
      ),
    ];
  const leaves = new Map(model.headers.map((header) => [header.key, header]));
  return plan.map((row, index) =>
    h(
      "tr",
      {
        ...mergeVueAttrs(model.headerRowAttrs, { class: names.tr }),
        key: index,
        "data-adapttable-part":
          index === plan.length - 1 ? "header-row" : "header-group-row",
      },
      [
        ...(index === 0 ? leading(plan.length) : []),
        ...row.map((cell) => {
          if (cell.kind === "leaf") {
            const leaf = leaves.get(cell.key);
            return leaf ? leafHeader(leaf, { rowspan: cell.rowSpan }) : null;
          }
          const toggle = model.groupToggleProps(cell.cell);
          return h(
            "th",
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
                    controls.ColumnGroupToggle,
                    "ColumnGroupToggle"
                  )({ ...toggle, className: names.columnGroupToggle })
                : null,
            ]
          );
        }),
        ...(index === 0 ? trailing(plan.length) : []),
      ]
    )
  );
}
