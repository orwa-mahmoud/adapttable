import { filterDefForColumn } from "@adapttable/core";
import type { FilterHeaderRowProps as NeutralFilterHeaderRowProps } from "@adapttable/core/binding";
import { type CSSProperties, h, type VNodeChild } from "vue";

import type { ColumnDef } from "../columnDef";
import type { FilterHeaderControlOptions } from "./filterHeaderControl";

/** Compact row geometry supplied by the table's projected header columns. */
export type FilterHeaderRowProps<TRow> = NeutralFilterHeaderRowProps<
  TRow,
  ColumnDef<TRow>,
  CSSProperties
>;
/** Each kit supplies a component-owned compact control for each filter. */
export interface FilterHeaderRowSlots<TRow> {
  readonly Control: (props: FilterHeaderControlOptions<TRow>) => VNodeChild;
}
/** A second header row with controls supplied by its adapter. */
export function FilterHeaderRowChrome<TRow>(
  props: FilterHeaderRowProps<TRow> & {
    readonly controls: FilterHeaderRowSlots<TRow>;
  }
): VNodeChild {
  if (props.enabled === false || props.defs.length === 0) return null;
  if (typeof props.controls.Control !== "function")
    throw new Error(
      "AdaptTable: FilterHeaderRowChrome requires the Control slot."
    );
  const names = props.classNames ?? {};
  const pad = (part: string, className?: string) =>
    h("td", {
      "data-adapttable-part": part,
      "data-sticky": props.stickyAttr,
      class: [names.headerCell, className],
      style: props.padStyle,
    });
  const spacer = (side: "start" | "end") =>
    props.columnSpacers
      ? h("th", {
          "aria-hidden": "true",
          "data-adapttable-part": `column-spacer-${side}`,
          style: {
            padding: 0,
            border: 0,
            width: `${props.columnSpacers[side]}px`,
            minWidth: `${props.columnSpacers[side]}px`,
          },
        })
      : null;
  return h(
    "tr",
    {
      "data-adapttable-part": "filter-header-row",
      "aria-label": props.labels.headerFilters,
      class: names.filterHeaderRow,
    },
    [
      props.expandable ? pad("expand-header", names.expandHeader) : null,
      props.showReorder ? pad("reorder-header", names.reorderHeader) : null,
      props.selection ? pad("selection-header", names.selectionHeader) : null,
      spacer("start"),
      ...props.columns.map((column) => {
        const def = filterDefForColumn(props.defs, column.key);
        return h(
          "th",
          {
            key: column.key,
            "data-adapttable-part": "filter-header-cell",
            "data-column-key": column.key,
            "data-sticky": props.stickyAttr,
            "data-pinned": props.pinSide?.(column.key),
            class: [names.headerCell, names.filterHeaderCell],
            style: props.cellStyle?.(column),
          },
          [
            def
              ? props.controls.Control({
                  def,
                  source: props.source,
                  labels: props.labels,
                  registry: props.registry,
                  className: names.filterHeaderInput,
                  menuClassName: names.filterHeaderMenu,
                })
              : null,
          ]
        );
      }),
      spacer("end"),
      props.showActions ? pad("actions-header", names.actionsHeader) : null,
    ]
  );
}
