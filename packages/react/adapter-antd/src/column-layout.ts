/**
 * The column-layout family — `@adapttable/antd/column-layout`.
 *
 * Its own entry, so a table that imports one member alone loads that member
 * alone.
 */
import { createAdapterColumnLayoutFamily } from "@adapttable/react/adapter";

import { columnMenu } from "./column-menu";
import { fitColumns } from "./fit-columns";
import { resizableColumns } from "./resizable-columns";

/**
 * All of column layout — the columns menu, resizing and fitting — with this
 * kit's controls, passed to `features` as one entry.
 *
 * @public
 */
export const columnLayoutFamily =
  /* @__PURE__ */ createAdapterColumnLayoutFamily({
    columnMenu,
    resizableColumns,
    fitColumns,
  });
