import { scrollResetKeys } from "@adapttable/core/binding";
import { type RefObject } from "react";

import { useScrollToTableTop } from "../hooks/useScrollToTableTop";
import type { ComposedTableProps } from "../props";
import { baseActiveFilterCount } from "./baseFilterCount";

/**
 * The shared scroll-restoration wiring every adapter `<DataTable>` needs:
 * when search / sort / page / filters change, scroll the table back below
 * the sticky chrome. Extracted so the identical block isn't repeated (and
 * flagged as duplication) in each adapter.
 *
 * @typeParam TRow - The row type.
 * @param ref - The adapter's root element.
 * @param props - The adapter's `ComposedTableProps`.
 *
 * @public
 */
export function useChromeScrollReset<TRow>(
  ref: RefObject<HTMLElement | null>,
  props: ComposedTableProps<TRow>
): void {
  // In infinite mode a page increment means "the window grew at the
  // bottom" (the sentinel loaded more) — yanking the reader back to the
  // table top would fight the scroll they are mid-way through, so core's
  // keys only count the page when paged.
  useScrollToTableTop({
    ref,
    deps: scrollResetKeys(
      props.source,
      baseActiveFilterCount(props.activeFilterCount, props.extraChips)
    ),
    enabled: props.scrollToTopOnChange,
    offset: props.stickyTop,
    gap: props.scrollTopGap,
  });
}
