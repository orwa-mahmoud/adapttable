import {
  type GroupedFlatEntry,
  groupSelectionState,
  type SelectionState,
  type TableLabels,
} from "@adapttable/core";
import type { ReactElement } from "react";

import type { DataTableClassNames } from "../types";
import { ChevronIcon } from "./icons";

/** Kit-native (unstyled) group header row for the desktop table. */
export function GroupHeaderRow<TRow>({
  entry,
  columnSpan,
  selection,
  labels,
  classNames,
  onToggleCollapse,
}: Readonly<{
  entry: Extract<GroupedFlatEntry<TRow>, { kind: "group" }>;
  columnSpan: number;
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  onToggleCollapse: (groupKey: string) => void;
}>): ReactElement {
  const expanded = !entry.collapsed;
  const groupState = selection
    ? groupSelectionState(entry.leafIds, selection.selectedIds)
    : "none";

  return (
    <tr
      data-adapttable-part="group-row"
      data-collapsed={entry.collapsed ? "true" : undefined}
      className={classNames.groupRow}
    >
      <td
        colSpan={columnSpan}
        data-adapttable-part="group-cell"
        className={classNames.groupCell}
        style={{ fontWeight: 600 }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
          }}
        >
          <button
            type="button"
            data-adapttable-part="group-toggle"
            aria-expanded={expanded}
            aria-label={expanded ? labels.collapseGroup : labels.expandGroup}
            className={classNames.groupToggle}
            onClick={() => onToggleCollapse(entry.key)}
          >
            <span
              style={{
                display: "inline-flex",
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 150ms ease",
              }}
            >
              <ChevronIcon size={14} />
            </span>
          </button>
          {selection && (
            <input
              type="checkbox"
              data-adapttable-part="group-select"
              className={classNames.groupSelect}
              aria-label={labels.selectAll}
              checked={groupState === "all"}
              ref={(node) => {
                if (node) node.indeterminate = groupState === "some";
              }}
              onChange={() => selection.toggleGroupLeaves(entry.leafIds)}
            />
          )}
          <span
            data-adapttable-part="group-label"
            className={classNames.groupLabel}
          >
            {entry.label}
          </span>
          <span
            data-adapttable-part="group-count"
            className={classNames.groupCount}
            style={{ opacity: 0.65 }}
          >
            {labels.groupCount(entry.leafIds.length)}
          </span>
          {entry.aggregateCells &&
            Object.entries(entry.aggregateCells).map(([key, node]) => (
              <span
                key={key}
                data-adapttable-part="group-aggregate"
                data-column={key}
                className={classNames.groupAggregate}
                style={{ marginInlineStart: "auto" }}
              >
                {node}
              </span>
            ))}
        </span>
      </td>
    </tr>
  );
}

/** Group header block for the mobile card list. */
export function GroupHeaderCard<TRow>({
  entry,
  selection,
  labels,
  classNames,
  onToggleCollapse,
}: Readonly<{
  entry: Extract<GroupedFlatEntry<TRow>, { kind: "group" }>;
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  onToggleCollapse: (groupKey: string) => void;
}>): ReactElement {
  const expanded = !entry.collapsed;
  const groupState = selection
    ? groupSelectionState(entry.leafIds, selection.selectedIds)
    : "none";

  return (
    <div
      data-adapttable-part="group-card"
      data-collapsed={entry.collapsed ? "true" : undefined}
      className={classNames.groupCard}
      style={{ fontWeight: 600 }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          data-adapttable-part="group-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? labels.collapseGroup : labels.expandGroup}
          className={classNames.groupToggle}
          onClick={() => onToggleCollapse(entry.key)}
        >
          <span
            style={{
              display: "inline-flex",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 150ms ease",
            }}
          >
            <ChevronIcon size={14} />
          </span>
        </button>
        {selection && (
          <input
            type="checkbox"
            data-adapttable-part="group-select"
            className={classNames.groupSelect}
            aria-label={labels.selectAll}
            checked={groupState === "all"}
            ref={(node) => {
              if (node) node.indeterminate = groupState === "some";
            }}
            onChange={() => selection.toggleGroupLeaves(entry.leafIds)}
          />
        )}
        <span
          data-adapttable-part="group-label"
          className={classNames.groupLabel}
        >
          {entry.label}
        </span>
        <span
          data-adapttable-part="group-count"
          className={classNames.groupCount}
          style={{ opacity: 0.65 }}
        >
          {labels.groupCount(entry.leafIds.length)}
        </span>
      </span>
    </div>
  );
}
