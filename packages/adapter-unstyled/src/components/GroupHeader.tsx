import {
  groupAggregateEntries,
  type GroupedFlatEntry,
  groupLeafCount,
  groupRowLayout,
  groupSelectionState,
  type TableLabels,
} from "@adapttable/core";
import { type ColumnDef, type SelectionState } from "@adapttable/react";
import {
  groupIndentStyle,
  groupRowParts,
  GroupToggleSpacer,
  resolveMobileLabel,
} from "@adapttable/react/adapter";
import type { ReactElement, ReactNode } from "react";

import type { DataTableClassNames } from "../types";
import { ChevronIcon } from "./icons";
import { GroupMoreButton } from "./kitControls";

/** Kit-native (unstyled) group header row for the desktop table. */
export function GroupHeaderRow<TRow>({
  entry,
  columns,
  leadingCells,
  showActions,
  getCellProps,
  selection,
  labels,
  classNames,
  onToggleCollapse,
  onShowMore,
}: Readonly<{
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  /** The data columns as rendered, so a subtotal lands under its own. */
  columns: readonly ColumnDef<TRow>[];
  /** Edge cells before the first data column (chevron, checkbox). */
  leadingCells: number;
  /** Whether a trailing actions column needs an empty cell. */
  showActions: boolean;
  /** The table's per-column cell props, so a number inherits its alignment. */
  getCellProps: (column: ColumnDef<TRow>) => Record<string, unknown>;
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  onToggleCollapse: (groupKey: string) => void;
  /** Reveal the next page of groups, or of one group's rows. */
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
}>): ReactElement {
  // A footer is the same row with the controls taken away: no chevron (there
  // is nothing to collapse from the bottom), no checkbox (the header's already
  // selects the group), and a caption that says what the numbers are.
  const footer = entry.kind === "groupFooter";
  // A "show more" row is the same row again with a button where the label
  // goes: one component, so the three never drift apart in a kit.
  const more = entry.kind === "groupMore";
  const parts = groupRowParts(entry.kind);
  // The class hooks follow the parts: one row, one meaning, one name each.
  const rowClasses = {
    group: { row: classNames.groupRow, cell: classNames.groupCell },
    groupFooter: {
      row: classNames.groupFooterRow,
      cell: classNames.groupFooterCell,
    },
    groupMore: { row: classNames.groupMoreRow, cell: classNames.groupMoreCell },
  }[entry.kind];
  /** What the label cell shows: a button on a "more" row, else the name. */
  let labelContent: ReactNode = entry.label;
  if (entry.kind === "groupMore") {
    labelContent = (
      <GroupMoreButton
        scope={entry.scope}
        remaining={entry.remaining}
        groupKey={entry.groupKey}
        labels={labels}
        onShowMore={onShowMore}
      />
    );
  } else if (footer) {
    labelContent = labels.groupTotal(entry.label);
  }
  const expanded = entry.kind !== "group" || !entry.collapsed;
  const groupState =
    selection && !footer && !more
      ? groupSelectionState(entry.leafIds, selection.selectedIds)
      : "none";
  // One cell per column from the first aggregate onward: a subtotal only reads
  // as one when it sits under the column it totals.
  const layout = groupRowLayout<TRow, ColumnDef<TRow>>(
    columns,
    entry.kind === "groupMore" ? undefined : entry.aggregateCells
  );

  return (
    <tr
      data-adapttable-part={parts.row}
      data-collapsed={
        entry.kind === "group" && entry.collapsed ? "true" : undefined
      }
      className={rowClasses.row}
    >
      <td
        colSpan={leadingCells + layout.labelColumns.length}
        data-adapttable-part={parts.cell}
        className={rowClasses.cell}
        style={{ fontWeight: 600, ...groupIndentStyle(entry.level) }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
          }}
        >
          {footer || more ? (
            <GroupToggleSpacer />
          ) : (
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
          )}
          {selection && !footer && !more && (
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
            data-adapttable-part={parts.label}
            className={classNames.groupLabel}
          >
            {labelContent}
          </span>
          {footer || more ? (
            <GroupToggleSpacer />
          ) : (
            <span
              data-adapttable-part="group-count"
              className={classNames.groupCount}
              style={{ opacity: 0.65 }}
            >
              {labels.groupCount(groupLeafCount(entry))}
            </span>
          )}
          {layout.labelAggregates.map(({ column, node }) => (
            <span
              key={column.key}
              data-adapttable-part="group-aggregate"
              data-column={column.key}
              className={classNames.groupAggregate}
              style={{ marginInlineStart: "auto" }}
            >
              {node as ReactNode}
            </span>
          ))}
        </span>
      </td>
      {layout.cells.map(({ column, node }) => (
        <td
          key={column.key}
          {...getCellProps(column)}
          data-adapttable-part={
            node === undefined ? undefined : "group-aggregate"
          }
          data-column={node === undefined ? undefined : column.key}
          className={classNames.groupAggregate}
        >
          {node as ReactNode}
        </td>
      ))}
      {showActions && <td />}
    </tr>
  );
}

/** Group header block for the mobile card list. */
export function GroupHeaderCard<TRow>({
  entry,
  columns,
  selection,
  labels,
  classNames,
  onToggleCollapse,
  onShowMore,
}: Readonly<{
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  /** The card's columns, for captioning each subtotal. */
  columns: readonly ColumnDef<TRow>[];
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  onToggleCollapse: (groupKey: string) => void;
  /** Reveal the next page of groups, or of one group's rows. */
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
}>): ReactElement {
  // A footer is the same row with the controls taken away: no chevron (there
  // is nothing to collapse from the bottom), no checkbox (the header's already
  // selects the group), and a caption that says what the numbers are.
  const footer = entry.kind === "groupFooter";
  // A "show more" row is the same row again with a button where the label
  // goes: one component, so the three never drift apart in a kit.
  const more = entry.kind === "groupMore";
  const parts = groupRowParts(entry.kind);
  /** What the label cell shows: a button on a "more" row, else the name. */
  let labelContent: ReactNode = entry.label;
  if (entry.kind === "groupMore") {
    labelContent = (
      <GroupMoreButton
        scope={entry.scope}
        remaining={entry.remaining}
        groupKey={entry.groupKey}
        labels={labels}
        onShowMore={onShowMore}
      />
    );
  } else if (footer) {
    labelContent = labels.groupTotal(entry.label);
  }
  const expanded = entry.kind !== "group" || !entry.collapsed;
  const groupState =
    selection && !footer && !more
      ? groupSelectionState(entry.leafIds, selection.selectedIds)
      : "none";

  return (
    <div
      data-adapttable-part={parts.card}
      data-collapsed={
        entry.kind === "group" && entry.collapsed ? "true" : undefined
      }
      className={classNames.groupCard}
      style={{ fontWeight: 600 }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {!footer && !more && (
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
        )}
        {selection && !footer && !more && (
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
          data-adapttable-part={parts.label}
          className={classNames.groupLabel}
        >
          {labelContent}
        </span>
        {!footer && !more && (
          <span
            data-adapttable-part="group-count"
            className={classNames.groupCount}
            style={{ opacity: 0.65 }}
          >
            {labels.groupCount(groupLeafCount(entry))}
          </span>
        )}
      </span>
      {groupAggregateEntries<TRow, ColumnDef<TRow>>(
        columns,
        entry.kind === "groupMore" ? undefined : entry.aggregateCells
      ).map(({ column, node }) => (
        <span
          key={column.key}
          style={{ display: "flex", gap: 8, marginTop: 4 }}
        >
          <span className={classNames.groupCount} style={{ opacity: 0.65 }}>
            {resolveMobileLabel(column)}
          </span>
          <span
            data-adapttable-part="group-aggregate"
            data-column={column.key}
            className={classNames.groupAggregate}
            style={{ marginInlineStart: "auto" }}
          >
            {node as ReactNode}
          </span>
        </span>
      ))}
    </div>
  );
}
