import { withProps } from "@adapttable/vue/adapter";
import { Card, Skeleton } from "ant-design-vue";
import { h, type VNodeChild } from "vue";

import type { DataTableClassNames } from "./types";

/** Real table/card placeholders; the parent supplies the one spoken status. */
export const AntdLoadingState = /* @__PURE__ */ withProps(
  function AntdLoadingState(props: {
    readonly rows: number;
    readonly columns: number;
    readonly mobile: boolean;
    readonly classNames: DataTableClassNames;
  }): VNodeChild {
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
    const line = (column: number) => {
      const width = column === columns.length - 1 ? "42%" : "55%";
      return h(Skeleton, {
        key: column,
        "data-adapttable-part": "loading-line",
        class: names.loadingLine,
        active: true,
        title: { width: column === 0 ? "70%" : width },
        paragraph: false,
      });
    };
    if (props.mobile)
      return h(
        "div",
        {
          "data-adapttable-part": "loading-cards",
          class: names.loadingCards,
          "aria-hidden": "true",
        },
        rows.map((row) =>
          h(
            Card,
            {
              key: row,
              "data-adapttable-part": "loading-card",
              class: names.loadingCard,
            },
            { default: () => columns.slice(0, 4).map(line) }
          )
        )
      );
    return h(
      "table",
      {
        "data-adapttable-part": "loading-table",
        class: names.loadingTable,
        style: { width: "100%", tableLayout: "fixed" },
        "aria-hidden": "true",
      },
      [
        h("thead", [
          h(
            "tr",
            {
              "data-adapttable-part": "loading-header-row",
              class: names.loadingHeaderRow,
            },
            columns.map((column) =>
              h(
                "th",
                {
                  key: column,
                  "data-adapttable-part": "loading-header-cell",
                  class: names.loadingHeaderCell,
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
                "data-adapttable-part": "loading-row",
                class: names.loadingRow,
              },
              columns.map((column) =>
                h(
                  "td",
                  {
                    key: column,
                    "data-adapttable-part": "loading-cell",
                    class: names.loadingCell,
                  },
                  [line(column)]
                )
              )
            )
          )
        ),
      ]
    );
  },
  ["rows", "columns", "mobile", "classNames"]
);
