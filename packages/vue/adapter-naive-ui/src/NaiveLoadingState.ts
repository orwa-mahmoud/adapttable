import type { DataTableSurfaceSlots } from "@adapttable/vue/adapter";
import {
  NCard,
  NSkeleton,
  NTable,
  NTbody,
  NTd,
  NTh,
  NThead,
  NTr,
} from "naive-ui";
import { h } from "vue";

import { naiveElement } from "./renderers/nativeElement";

/** Loading paint uses the kit's actual skeleton and table/card primitives. */
export const naiveLoadingState: DataTableSurfaceSlots<unknown>["Loading"] = ({
  rows,
  columns,
  mobile,
  classNames: names,
}) => {
  const count = Math.max(1, Math.floor(rows));
  const width = Math.max(1, Math.floor(columns));
  const line = () =>
    h(NSkeleton, {
      text: true,
      class: names.loadingLine,
      "data-adapttable-part": "loading-line",
    });
  if (mobile)
    return h(
      "div",
      {
        class: names.loadingCards,
        "data-adapttable-part": "loading-cards",
        "aria-hidden": "true",
      },
      Array.from({ length: count }, (_, index) =>
        naiveElement(
          NCard,
          {
            key: index,
            size: "small",
            class: names.loadingCard,
            "data-adapttable-part": "loading-card",
          },
          () => Array.from({ length: width }, line)
        )
      )
    );
  const headers = Array.from({ length: width }, (_, index) =>
    naiveElement(
      NTh,
      {
        key: index,
        class: names.loadingHeaderCell,
        "data-adapttable-part": "loading-header-cell",
      },
      line
    )
  );
  const header = naiveElement(
    NTr,
    {
      class: names.loadingHeaderRow,
      "data-adapttable-part": "loading-header-row",
    },
    () => headers
  );
  const placeholders = Array.from({ length: count }, (_, index) => {
    const cells = Array.from({ length: width }, (_, column) =>
      naiveElement(
        NTd,
        {
          key: column,
          class: names.loadingCell,
          "data-adapttable-part": "loading-cell",
        },
        line
      )
    );
    return naiveElement(
      NTr,
      {
        key: index,
        class: names.loadingRow,
        "data-adapttable-part": "loading-row",
      },
      () => cells
    );
  });
  return naiveElement(
    NTable,
    {
      class: names.loadingTable,
      "data-adapttable-part": "loading-table",
      "aria-hidden": "true",
    },
    () => [
      naiveElement(NThead, {}, () => header),
      naiveElement(NTbody, {}, () => placeholders),
    ]
  );
};
