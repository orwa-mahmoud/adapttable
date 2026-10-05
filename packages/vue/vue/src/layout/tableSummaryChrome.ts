/** Structural footer surfaces. Host renderers own all footer content. */
import { h, type VNodeChild } from "vue";

import { mergeVueAttrs } from "../attrs";
import { type FooterContext, renderFooter } from "../columnDef";
import type { TableSummaryModel } from "./tableSummaryModel";

export interface TableSummaryClassNames {
  readonly summary?: string;
  readonly summaryRow?: string;
  readonly summaryCell?: string;
  readonly summaryCard?: string;
  readonly card?: string;
  readonly cardFields?: string;
  readonly cardRow?: string;
  readonly cardLabel?: string;
  readonly cardValue?: string;
}

export interface TableSummaryChromeProps<TRow> {
  readonly model: TableSummaryModel<TRow>;
  readonly footer?: (context: FooterContext<TRow>) => VNodeChild;
  readonly classNames?: TableSummaryClassNames;
}

/** A real tfoot, with pads for the same utility columns as the body. */
export function TableSummaryChrome<TRow>(
  props: TableSummaryChromeProps<TRow> & {
    readonly leading?: readonly string[];
    readonly trailing?: readonly string[];
    readonly startSpacer?: () => VNodeChild;
    readonly endSpacer?: () => VNodeChild;
  }
): VNodeChild {
  const { model, footer, classNames = {} } = props;
  const pad = (key: string) =>
    h("td", {
      key: Symbol.for(`adapttable-summary-pad:${key}`),
      "data-adapttable-part": "summary-cell",
      class: classNames.summaryCell,
    });
  return h(
    "tfoot",
    {
      "data-adapttable-part": "summary",
      class: classNames.summary,
    },
    [
      h(
        "tr",
        {
          "data-adapttable-part": "summary-row",
          class: classNames.summaryRow,
        },
        [
          ...(props.leading ?? []).map(pad),
          props.startSpacer?.(),
          ...model.cells.map((cell) =>
            h(
              "td",
              {
                ...mergeVueAttrs(cell.attrs, { class: classNames.summaryCell }),
                key: cell.key,
                "data-adapttable-part": "summary-cell",
              },
              [renderFooter(cell.context, footer)]
            )
          ),
          props.endSpacer?.(),
          ...(props.trailing ?? []).map(pad),
        ]
      ),
    ]
  );
}

/** The same rendered footer values become labeled fields in a final list item. */
export function MobileSummaryChrome<TRow>(
  props: TableSummaryChromeProps<TRow>
): VNodeChild {
  const { model, footer, classNames = {} } = props;
  const cells = model.cells.filter(
    (cell) =>
      cell.context.value != null ||
      cell.context.column.footer !== undefined ||
      footer !== undefined
  );
  return h(
    "article",
    {
      role: "listitem",
      "data-adapttable-part": "summary-card",
      class: [classNames.card, classNames.summaryCard],
    },
    [
      h(
        "dl",
        { class: classNames.cardFields },
        cells.map((cell) =>
          h(
            "div",
            {
              key: cell.key,
              "data-column-key": cell.key,
              "data-adapttable-part": "card-row",
              class: classNames.cardRow,
            },
            [
              h(
                "dt",
                {
                  "data-adapttable-part": "card-label",
                  class: classNames.cardLabel,
                },
                cell.label
              ),
              h(
                "dd",
                {
                  "data-adapttable-part": "card-value",
                  class: classNames.cardValue,
                },
                [renderFooter(cell.context, footer)]
              ),
            ]
          )
        )
      ),
    ]
  );
}

/** Free content below the table and above pagination. */
export function TableFooterChrome(props: {
  readonly content: () => VNodeChild;
  readonly className?: string;
}): VNodeChild {
  return h(
    "div",
    {
      "data-adapttable-part": "table-footer",
      class: props.className,
    },
    [props.content()]
  );
}

TableSummaryChrome.props = [
  "model",
  "footer",
  "classNames",
  "leading",
  "trailing",
  "startSpacer",
  "endSpacer",
];
MobileSummaryChrome.props = ["model", "footer", "classNames"];
TableFooterChrome.props = ["content", "className"];
