/**
 * The rails' rendered widths, read from the table header while anything is
 * pinned, so pinned columns sit exactly past them.
 */
import {
  type MeasuredRailWidths,
  observeRailWidths,
} from "@adapttable/core/binding";
import { useLayoutEffect, useState } from "react";

/**
 * Watch the header's rail cells while `active`.
 *
 * @param active - Whether anything is pinned; nothing is measured otherwise.
 * @returns A ref for the header, and the widths once measured.
 *
 * @public
 */
export function useRailWidths(
  active: boolean
): [(node: HTMLElement | null) => void, MeasuredRailWidths | undefined] {
  const [head, setHead] = useState<HTMLElement | null>(null);
  const [widths, setWidths] = useState<MeasuredRailWidths | undefined>();
  useLayoutEffect(() => {
    if (!active || !head) {
      setWidths(undefined);
      return undefined;
    }
    return observeRailWidths(head, setWidths);
  }, [active, head]);
  return [setHead, widths];
}
