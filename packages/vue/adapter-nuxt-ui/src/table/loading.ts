import type { DataTableSurfaceSlots } from "@adapttable/vue/adapter";
import USkeleton from "@nuxt/ui/components/Skeleton.vue";
import { h } from "vue";

import NuxtTableRoot from "../controls/NuxtTableRoot.vue";
import { nuxtCard, tablePart } from "../controls/tablePart";

export const nuxtLoading: DataTableSurfaceSlots<unknown>["Loading"] = ({
  rows: rowCount,
  columns: columnCount,
  mobile,
  classNames: names,
}) => {
  const rows = Array.from(
    {
      length: Number.isFinite(rowCount) ? Math.max(0, Math.floor(rowCount)) : 0,
    },
    (_, index) => index
  );
  const columns = Array.from(
    { length: Math.max(1, columnCount) },
    (_, index) => index
  );
  const line = (key: number) =>
    h(USkeleton, {
      key,
      class: names.loadingLine,
      "data-adapttable-part": "loading-line",
      style: { height: "0.875rem", width: key === 0 ? "70%" : "50%" },
    });
  if (mobile)
    return h(
      "div",
      {
        "aria-hidden": "true",
        class: names.loadingCards,
        "data-adapttable-part": "loading-cards",
      },
      rows.map((key) =>
        nuxtCard(
          {
            key,
            class: names.loadingCard,
            "data-adapttable-part": "loading-card",
          },
          columns.slice(0, 4).map(line)
        )
      )
    );
  return h(
    NuxtTableRoot,
    {
      attrs: {
        "aria-hidden": "true",
        class: names.loadingTable,
        "data-adapttable-part": "loading-table",
        style: { width: "100%", tableLayout: "fixed" },
      },
    },
    () => [
      tablePart("thead", {}, [
        tablePart(
          "tr",
          {
            class: names.loadingHeaderRow,
            "data-adapttable-part": "loading-header-row",
          },
          columns.map((key) =>
            tablePart(
              "th",
              {
                key,
                class: names.loadingHeaderCell,
                "data-adapttable-part": "loading-header-cell",
              },
              line(key)
            )
          )
        ),
      ]),
      tablePart(
        "tbody",
        {},
        rows.map((key) =>
          tablePart(
            "tr",
            {
              key,
              class: names.loadingRow,
              "data-adapttable-part": "loading-row",
            },
            columns.map((key) =>
              tablePart(
                "td",
                {
                  key,
                  class: names.loadingCell,
                  "data-adapttable-part": "loading-cell",
                },
                line(key)
              )
            )
          )
        )
      ),
    ]
  );
};
