import { h, type VNodeChild } from "vue";

import type { DataTableClassNames } from "./types";

/** Real table/card placeholders; the parent supplies the one spoken status. */
export function NativeLoadingState(props: {
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
    return h("span", {
      key: column,
      "data-adapttable-part": "loading-line",
      class: names.loadingLine,
      style: {
        display: "block",
        height: "0.75em",
        borderRadius: "0.25em",
        background: "currentColor",
        opacity: 0.12,
        width: column === 0 ? "70%" : width,
      },
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
          "div",
          {
            key: row,
            "data-adapttable-part": "loading-card",
            class: names.loadingCard,
          },
          columns.slice(0, 4).map(line)
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
}
NativeLoadingState.props = ["rows", "columns", "mobile", "classNames"];
