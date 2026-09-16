/** Removable chips for the active filters. */
import type { TableLabels } from "@adapttable/core";
import type { ActiveFilterChip } from "@adapttable/react";

import type { DataTableClassNames } from "../types";

export function Chips({
  chips,
  onClearAll,
  labels,
  classNames,
}: Readonly<{
  chips: readonly ActiveFilterChip[];
  /** Clear-all handler — always defined (`chrome.clearFilters`). */
  onClearAll: () => void;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
}>) {
  if (chips.length === 0) return null;
  return (
    <ul
      aria-label={labels.filters}
      data-adapttable-part="chips"
      className={classNames.chips}
    >
      {chips.map((chip) => (
        <li
          key={chip.key}
          data-adapttable-part="chip"
          className={classNames.chip}
        >
          {chip.label}
          <button
            type="button"
            aria-label={labels.removeFilter(chip.label)}
            data-adapttable-part="chip-remove"
            className={classNames.chipRemove}
            onClick={chip.onRemove}
          >
            ×
          </button>
        </li>
      ))}
      {/* Clear-all wears the same chip part as its siblings, so consumers
          style it for free and no bare list marker leaks through. */}
      <li data-adapttable-part="chip" className={classNames.chip}>
        <button
          type="button"
          data-adapttable-part="chip-remove"
          className={classNames.chipRemove}
          onClick={onClearAll}
        >
          {labels.clearAll}
        </button>
      </li>
    </ul>
  );
}
