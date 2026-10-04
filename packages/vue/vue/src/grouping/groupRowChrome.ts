/** Group structure and aggregate alignment; kits supply every control. */
import {
  type DisplayValue,
  groupAggregateEntries,
  groupLeafCount,
  groupRowLayout,
  groupSelectionState,
} from "@adapttable/core";
import {
  type ChromeGroupSlot,
  groupIndentStyle,
  groupRowParts,
  resolveMobileLabel,
} from "@adapttable/core/binding";
import { h, isVNode, type VNodeChild } from "vue";

import type { Attrs } from "../attrs";
import { type ColumnDef, primitiveText } from "../columnDef";
import type { GroupRowModel } from "../hierarchy/models";
import {
  type SelectionCheckboxControl,
  selectionCheckboxControl,
} from "../selection/checkboxControl";
export interface GroupRowChromeProps<TRow> {
  readonly slot: ChromeGroupSlot<TRow> & {
    readonly model?: GroupRowModel<TRow>;
  };
  readonly columnCount: number;
  readonly mobile: boolean;
  readonly classNames?: {
    readonly groupRow?: string;
    readonly groupLabel?: string;
    readonly groupToggle?: string;
    readonly groupCount?: string;
    readonly groupAggregate?: string;
    readonly groupMore?: string;
    readonly groupCheckbox?: string;
  };
  readonly slots: {
    readonly Button: (props: {
      readonly attrs: Attrs;
      readonly content: VNodeChild;
      readonly expanded?: boolean;
    }) => VNodeChild;
    readonly Checkbox: (props: SelectionCheckboxControl) => VNodeChild;
  };
}
function groupCaption<TRow>(
  props: GroupRowChromeProps<TRow>,
  model: GroupRowModel<TRow>,
  entry: Exclude<ChromeGroupSlot<TRow>["entry"], { kind: "groupMore" }>,
  callButton: (
    attrs: Attrs,
    content: VNodeChild,
    expanded?: boolean
  ) => VNodeChild
): VNodeChild[] {
  const { slots, classNames: names = {} } = props;
  const caption: VNodeChild[] = [];
  if (entry.kind === "group") {
    const expanded = !entry.collapsed;
    caption.push(
      callButton(
        {
          type: "button",
          class: names.groupToggle,
          "data-adapttable-part": "group-toggle",
          "aria-expanded": expanded,
          "aria-label": `${expanded ? model.labels.collapseGroup : model.labels.expandGroup}: ${entry.label}`,
          onClick: () => model.onToggle(entry.key),
        },
        null,
        expanded
      )
    );
    if (model.selection) {
      if (!slots.Checkbox)
        throw new Error(
          'AdaptTable: required adapter control slot "GroupRow.Checkbox" is missing.'
        );
      const state = groupSelectionState(
        entry.leafIds,
        model.selection.selectedIds
      );
      caption.push(
        slots.Checkbox(
          selectionCheckboxControl({
            type: "checkbox",
            class: names.groupCheckbox,
            "data-adapttable-part": "group-checkbox",
            "aria-label": `${model.labels.selectRow}: ${entry.label}`,
            checked: state === "all",
            indeterminate: state === "some",
            onChange: () => model.selection?.toggleGroupLeaves(entry.leafIds),
          })
        )
      );
    }
    caption.push(
      entry.label,
      h(
        "span",
        { "data-adapttable-part": "group-count", class: names.groupCount },
        model.labels.groupCount(groupLeafCount(entry))
      )
    );
  } else caption.push(model.labels.groupTotal(entry.label));
  return caption;
}
function collapsedGroupAttr<TRow>(
  entry: ChromeGroupSlot<TRow>["entry"]
): string | undefined {
  if (entry.kind !== "group") return undefined;
  return entry.collapsed ? "true" : undefined;
}
/** Shared desktop/card group chrome, including localized paging and subtotals. @public */
export function GroupRowChrome<TRow>(
  props: GroupRowChromeProps<TRow>
): VNodeChild {
  const { slot, mobile, columnCount, slots, classNames: names = {} } = props;
  const model = slot.model;
  if (!model)
    throw new Error(
      "AdaptTable: grouped rows require the binding's group-row model."
    );
  const { entry } = slot;
  const parts = groupRowParts(entry.kind);
  const rowAttrs = {
    "data-adapttable-part": mobile ? parts.card : parts.row,
    "data-group-key": entry.key,
    "data-collapsed": collapsedGroupAttr(entry),
    class: names.groupRow,
    ...(mobile ? { role: "listitem" } : {}),
  };
  const callButton = (
    attrs: Attrs,
    content: VNodeChild,
    expanded?: boolean
  ): VNodeChild => {
    if (!slots.Button)
      throw new Error(
        'AdaptTable: required adapter control slot "GroupRow.Button" is missing.'
      );
    return slots.Button({ attrs, content, expanded });
  };
  if (entry.kind === "groupMore") {
    const label =
      entry.scope === "groups"
        ? model.labels.moreGroups(entry.remaining)
        : model.labels.moreRowsInGroup(entry.remaining);
    const more = callButton(
      {
        type: "button",
        "data-adapttable-part": "group-more-button",
        class: names.groupMore,
        onClick: () => model.onShowMore(entry),
      },
      label
    );
    return h(mobile ? "div" : "tr", rowAttrs, [
      h(
        mobile ? "div" : "td",
        {
          colspan: mobile ? undefined : columnCount,
          style: groupIndentStyle(entry.level),
          "data-adapttable-part": parts.cell,
        },
        [h("span", { "data-adapttable-part": parts.label }, [more])]
      ),
    ]);
  }
  const layout = groupRowLayout<TRow, ColumnDef<TRow>>(
    model.columns,
    entry.aggregateCells,
    entry.aggregateOps
  );
  const caption = groupCaption(props, model, entry, callButton);
  const aggregate = (key: string, value: DisplayValue | undefined) =>
    h(
      "span",
      {
        key,
        "data-adapttable-part": "group-aggregate",
        class: names.groupAggregate,
        "data-column-key": key,
      },
      [isVNode(value) ? value : primitiveText(value)]
    );
  if (mobile) {
    const entries = groupAggregateEntries<TRow, ColumnDef<TRow>>(
      model.columns,
      entry.aggregateCells,
      entry.aggregateOps
    );
    return h("div", rowAttrs, [
      h(
        "div",
        {
          style: groupIndentStyle(entry.level),
          class: names.groupLabel,
          "data-adapttable-part": parts.label,
        },
        caption
      ),
      ...entries.map((cell) =>
        h("div", { key: cell.column.key }, [
          resolveMobileLabel(cell.column),
          aggregate(cell.column.key, cell.node),
        ])
      ),
    ]);
  }
  caption.push(
    ...layout.labelAggregates.map((cell) =>
      aggregate(cell.column.key, cell.node)
    )
  );
  return h("tr", rowAttrs, [
    h(
      "td",
      {
        colspan: layout.labelColumns.length + model.leadingColumns,
        style: groupIndentStyle(entry.level),
        class: names.groupLabel,
        "data-adapttable-part": parts.cell,
      },
      [h("span", { "data-adapttable-part": parts.label }, caption)]
    ),
    ...layout.cells.map((cell) =>
      h(
        "td",
        {
          key: cell.column.key,
          "data-column-key": cell.column.key,
          "data-adapttable-part": parts.cell,
        },
        [aggregate(cell.column.key, cell.node)]
      )
    ),
    ...(model.trailingColumns
      ? [
          h("td", {
            colspan: model.trailingColumns,
            "data-adapttable-part": parts.cell,
          }),
        ]
      : []),
  ]);
}
GroupRowChrome.props = ["slot", "columnCount", "mobile", "slots", "classNames"];
