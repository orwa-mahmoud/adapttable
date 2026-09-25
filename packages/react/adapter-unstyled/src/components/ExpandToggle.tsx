/** The row-expansion chevron, shared by rows and cards. */
import type { TableLabels } from "@adapttable/core";

import type { DataTableClassNames } from "../types";
import { ChevronIcon } from "./icons";

/**
 * The expand/collapse chevron, shared by desktop rows and mobile cards. The
 * `data-expanded` attribute is the styling hook for rotating the glyph
 * (`rowClickProps`' interactive-child guard keeps the click off the row).
 */
export function ExpandButton({
  expanded,
  labels,
  classNames,
  onToggle,
}: Readonly<{
  expanded: boolean;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  onToggle: () => void;
}>) {
  return (
    <button
      type="button"
      data-adapttable-part="expand-button"
      data-expanded={expanded ? "" : undefined}
      className={classNames.expandButton}
      aria-expanded={expanded}
      aria-label={expanded ? labels.collapseRow : labels.expandRow}
      onClick={onToggle}
    >
      <ChevronIcon size={14} />
    </button>
  );
}
