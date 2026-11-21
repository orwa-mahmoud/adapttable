/**
 * The strings row virtualization draws.
 */
import type { TableLabels } from "../types";

/**
 * The strings row virtualization draws.
 *
 * @public
 */
export const VIRTUALIZE_LABELS: Pick<
  Required<TableLabels>,
  "noticeVirtualizePaged"
> = {
  noticeVirtualizePaged:
    "Virtualization is off — this paged table shows one page at a time.",
};
