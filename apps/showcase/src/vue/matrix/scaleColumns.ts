/**
 * The scale page's columns in Vue: the shared columns, padded to the width
 * the URL asks for, with the Person cell drawn as name over email.
 */
import type { ColumnDef } from "@adapttable/vue";
import { h } from "vue";

import {
  type BigPerson,
  paddingColumns,
  SCALE_COLUMNS,
} from "../../shared/scaleScenario";

/**
 * The columns for `cols` (zero keeps the shared set).
 *
 * @param cols - How many columns the page asks for.
 * @returns The columns.
 */
export function scaleColumns(cols: number): ColumnDef<BigPerson>[] {
  return [...SCALE_COLUMNS, ...paddingColumns(SCALE_COLUMNS.length, cols)].map(
    (column): ColumnDef<BigPerson> =>
      column.key === "name"
        ? {
            ...column,
            cell: ({ row }: { row: BigPerson }) =>
              h("div", [
                h("div", { style: { fontWeight: 600 } }, row.name),
                h(
                  "div",
                  { style: { fontSize: "12px", opacity: 0.7 } },
                  row.email
                ),
              ]),
          }
        : { ...column }
  );
}
