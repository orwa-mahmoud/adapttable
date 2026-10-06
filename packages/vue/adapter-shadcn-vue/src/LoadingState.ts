import type { DataTableSurfaceSlots } from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";

import Card from "./components/card/Card.vue";
import Skeleton from "./components/skeleton/Skeleton.vue";

type LoadingProps = Parameters<DataTableSurfaceSlots<unknown>["Loading"]>[0];

/** shadcn skeleton paint; the shared surface owns the single spoken status. */
export function ShadcnLoadingState(props: LoadingProps): VNodeChild {
  const names = props.classNames;
  const rows = Array.from(
    {
      length: Number.isFinite(props.rows)
        ? Math.max(0, Math.floor(props.rows))
        : 0,
    },
    (_, index) => index
  );
  const columns = Array.from(
    { length: Math.max(1, props.columns) },
    (_, index) => index
  );
  const line = (index: number) =>
    h(Skeleton, {
      key: index,
      class: names.loadingLine,
      "data-adapttable-part": "loading-line",
    });
  if (props.mobile)
    return h(
      "div",
      {
        class: names.loadingCards,
        "data-adapttable-part": "loading-cards",
        "aria-hidden": true,
      },
      rows.map((row) =>
        h(
          Card,
          {
            key: row,
            class: names.loadingCard,
            "data-adapttable-part": "loading-card",
          },
          () => columns.slice(0, 4).map(line)
        )
      )
    );
  return h(
    "table",
    {
      class: names.loadingTable,
      "data-adapttable-part": "loading-table",
      "aria-hidden": true,
    },
    [
      h("thead", [
        h(
          "tr",
          {
            class: names.loadingHeaderRow,
            "data-adapttable-part": "loading-header-row",
          },
          columns.map((column) =>
            h(
              "th",
              {
                key: column,
                class: names.loadingHeaderCell,
                "data-adapttable-part": "loading-header-cell",
              },
              [line(column)]
            )
          )
        ),
      ]),
      h(
        "tbody",
        rows.map((row) =>
          h(
            "tr",
            {
              key: row,
              class: names.loadingRow,
              "data-adapttable-part": "loading-row",
            },
            columns.map((column) =>
              h(
                "td",
                {
                  key: column,
                  class: names.loadingCell,
                  "data-adapttable-part": "loading-cell",
                },
                [line(column)]
              )
            )
          )
        )
      ),
    ]
  );
}
ShadcnLoadingState.props = ["rows", "columns", "mobile", "classNames"];
