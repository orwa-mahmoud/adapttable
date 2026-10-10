import type { DataTableSurfaceSlots } from "@adapttable/vue/adapter";
import { QSkeleton } from "quasar";
import { h } from "vue";

import { part } from "./parts";

type LoadingProps = Parameters<DataTableSurfaceSlots<unknown>["Loading"]>[0];
/** Decorative Quasar skeletons share the single spoken status in the surface. */
export function quasarLoading({
  rows,
  columns,
  mobile,
  classNames: names,
}: LoadingProps) {
  const rowKeys = Array.from(
    { length: Number.isFinite(rows) ? Math.max(0, Math.floor(rows)) : 0 },
    (_value, index) => index
  );
  const columnKeys = Array.from(
    { length: Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 1 },
    (_value, index) => index
  );
  const line = (key: number) =>
    h(QSkeleton, {
      key,
      type: "text",
      "data-adapttable-part": "loading-line",
      class: names.loadingLine,
    });
  if (mobile)
    return h(
      "div",
      {
        "aria-hidden": "true",
        "data-adapttable-part": "loading-cards",
        class: ["adapttable-quasar-cards", names.loadingCards],
      },
      rowKeys.map((key) =>
        part(
          "card",
          {
            key,
            flat: true,
            bordered: true,
            "data-adapttable-part": "loading-card",
            class: names.loadingCard,
          },
          part("section", {}, columnKeys.slice(0, 4).map(line))
        )
      )
    );
  return h(
    "table",
    {
      "aria-hidden": "true",
      "data-adapttable-part": "loading-table",
      class: ["adapttable-quasar-table", names.loadingTable],
      style: { width: "100%", tableLayout: "fixed" },
    },
    [
      h("thead", [
        part(
          "row",
          {
            "data-adapttable-part": "loading-header-row",
            class: names.loadingHeaderRow,
          },
          columnKeys.map((key) =>
            part(
              "header",
              {
                key,
                "data-adapttable-part": "loading-header-cell",
                class: names.loadingHeaderCell,
              },
              line(key)
            )
          )
        ),
      ]),
      h(
        "tbody",
        rowKeys.map((key) =>
          part(
            "row",
            {
              key,
              "data-adapttable-part": "loading-row",
              class: names.loadingRow,
            },
            columnKeys.map((key) =>
              part(
                "cell",
                {
                  key,
                  "data-adapttable-part": "loading-cell",
                  class: names.loadingCell,
                },
                line(key)
              )
            )
          )
        )
      ),
    ]
  );
}
