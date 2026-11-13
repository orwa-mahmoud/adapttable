/** Row count and the windowed pager, drawn by the binding with native controls. */
import {
  createPageButtons,
  createPager,
  type KitPagerFrameProps,
} from "@adapttable/react/adapter";
import type { ReactNode } from "react";

import { useClassNames } from "./classNamesContext";
import { Button, Text } from "./partPrimitives";
import { RowsPerPage } from "./Toolbar";

/**
 * Page size and range, then the pager: "page n of m" and the pages. The
 * table draws the footer element around them.
 */
function Frame({
  rowsPerPage,
  range,
  pageOf,
  pages,
}: Readonly<KitPagerFrameProps>) {
  "use no memo";
  return (
    <>
      {rowsPerPage}
      {range}
      <div data-adapttable-part="pager" className={useClassNames().pager}>
        {pageOf}
        {pages}
      </div>
    </>
  );
}

function Caption({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return <span>{children}</span>;
}

/** The table's footer: page size, range, "page n of m" and the pages. */
export const footer = /* @__PURE__ */ createPager({
  Frame,
  RowsPerPage,
  Caption,
  // The pages sit in the pager's own flow, beside "page n of m".
  Pages: /* @__PURE__ */ createPageButtons(
    { Button, Text },
    { row: { display: "contents" }, ellipsis: {} }
  ),
});
