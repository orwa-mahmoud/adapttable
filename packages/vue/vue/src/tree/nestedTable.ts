import {
  type NestedTableDefaults,
  nestedTableDefaults,
  nestedTableLabel,
  type NestedTableParent,
} from "@adapttable/core";
import { Fragment, h, type VNodeChild } from "vue";
export interface NestedTable {
  readonly label?: string;
  readonly table: (defaults: NestedTableDefaults) => VNodeChild;
}
export type NestedTableFor<TRow> = (row: TRow) => NestedTable | undefined;
/** Mount the host's kit table with neutral defaults and an accessible region. @public */
export function nestedTableDetail<TRow>(options: {
  readonly nestedTable?: NestedTableFor<TRow>;
  readonly renderRowDetail?: (row: TRow) => VNodeChild;
  readonly parent?: NestedTableParent;
}): ((row: TRow) => VNodeChild) | undefined {
  let render = options.renderRowDetail;
  if (options.nestedTable)
    render = (row) => {
      const nested = options.nestedTable?.(row);
      if (!nested)
        return h(Fragment, null, [options.renderRowDetail?.(row) ?? null]);
      const label = nestedTableLabel(nested.label);
      return h(
        "section",
        { "data-adapttable-part": "nested-table", "aria-label": label },
        [nested.table(nestedTableDefaults(label, options.parent))]
      );
    };
  return render;
}
export type { NestedTableDefaults, NestedTableParent } from "@adapttable/core";
