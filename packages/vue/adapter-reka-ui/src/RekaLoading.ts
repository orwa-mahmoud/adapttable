import type { DataTableClassNames } from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";

interface LoadingProps {
  readonly rows: number;
  readonly columns: number;
  readonly mobile: boolean;
  readonly classNames: DataTableClassNames;
}

/** Non-interactive skeleton paint; the shared status region owns the announcement. */
export function RekaLoading(props: LoadingProps) {
  const rows = Array.from(
    {
      length: Number.isFinite(props.rows)
        ? Math.max(0, Math.floor(props.rows))
        : 0,
    },
    (_, i) => i
  );
  const columns = Array.from(
    { length: Math.max(1, props.columns) },
    (_, i) => i
  );
  const part = (
    tag: string,
    name: string,
    className: string | undefined,
    children: VNodeChild[],
    key?: number
  ) =>
    h(
      tag,
      {
        key,
        "data-adapttable-part": name,
        class: ["at-reka-skeleton", className],
      },
      children
    );
  const line = (key: number) =>
    h("span", {
      key,
      "data-adapttable-part": "loading-line",
      class: ["at-reka-loading-line", props.classNames.loadingLine],
    });
  const names = props.classNames;
  return props.mobile
    ? h(
        "div",
        {
          "data-adapttable-part": "loading-cards",
          "aria-hidden": true,
          class: names.loadingCards,
        },
        rows.map((row) =>
          part(
            "div",
            "loading-card",
            names.loadingCard,
            columns.slice(0, 4).map(line),
            row
          )
        )
      )
    : h(
        "table",
        {
          "data-adapttable-part": "loading-table",
          "aria-hidden": true,
          class: names.loadingTable,
        },
        [
          h("thead", [
            part(
              "tr",
              "loading-header-row",
              names.loadingHeaderRow,
              columns.map((column) =>
                part(
                  "th",
                  "loading-header-cell",
                  names.loadingHeaderCell,
                  [line(column)],
                  column
                )
              )
            ),
          ]),
          h(
            "tbody",
            rows.map((row) =>
              part(
                "tr",
                "loading-row",
                names.loadingRow,
                columns.map((column) =>
                  part(
                    "td",
                    "loading-cell",
                    names.loadingCell,
                    [line(column)],
                    column
                  )
                ),
                row
              )
            )
          ),
        ]
      );
}
RekaLoading.props = ["rows", "columns", "mobile", "classNames"];
