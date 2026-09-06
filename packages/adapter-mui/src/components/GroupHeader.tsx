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
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  IconButton,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import type { ReactElement, ReactNode } from "react";

import { GroupMoreButton } from "./kitControls";

function GroupChevron({ expanded }: Readonly<{ expanded: boolean }>) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-flex",
        transition: "transform 150ms",
        transform: expanded ? "rotate(90deg)" : undefined,
      }}
    >
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Box>
  );
}

function GroupToggle({
  expanded,
  expandLabel,
  collapseLabel,
  onToggle,
}: Readonly<{
  expanded: boolean;
  expandLabel: string;
  collapseLabel: string;
  onToggle: () => void;
}>) {
  return (
    <IconButton
      size="small"
      data-adapttable-part="group-toggle"
      aria-expanded={expanded}
      aria-label={expanded ? collapseLabel : expandLabel}
      onClick={onToggle}
    >
      <GroupChevron expanded={expanded} />
    </IconButton>
  );
}

/** MUI group header row for the desktop table. */
export function GroupHeaderRow<TRow>({
  entry,
  columns,
  leadingCells,
  showActions,
  getCellProps,
  selection,
  labels,
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
  onToggleCollapse: (groupKey: string) => void;
  /** Reveal the next page of groups, or of one group's rows. */
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
}>): ReactElement {
  // A footer is the same row with the controls taken away: no chevron
  // (nothing to collapse from the bottom), no checkbox (the header's own
  // selects the group), and a caption saying what the numbers are.
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
  // One cell per column from the first aggregate onward: a subtotal only reads
  // as one when it sits under the column it totals.
  const layout = groupRowLayout<TRow, ColumnDef<TRow>>(
    columns,
    entry.kind === "groupMore" ? undefined : entry.aggregateCells
  );

  return (
    <TableRow
      data-adapttable-part={parts.row}
      data-collapsed={
        entry.kind === "group" && entry.collapsed ? "true" : undefined
      }
    >
      <TableCell
        colSpan={leadingCells + layout.labelColumns.length}
        data-adapttable-part={parts.cell}
        sx={{ fontWeight: 600 }}
        style={groupIndentStyle(entry.level)}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            width: "100%",
          }}
        >
          {footer || more ? (
            <GroupToggleSpacer />
          ) : (
            <GroupToggle
              expanded={expanded}
              expandLabel={labels.expandGroup}
              collapseLabel={labels.collapseGroup}
              onToggle={() => onToggleCollapse(entry.key)}
            />
          )}
          {selection && !footer && !more && (
            <Checkbox
              data-adapttable-part="group-select"
              slotProps={{ input: { "aria-label": labels.selectAll } }}
              checked={groupState === "all"}
              indeterminate={groupState === "some"}
              onChange={() => selection.toggleGroupLeaves(entry.leafIds)}
            />
          )}
          <Typography
            component="span"
            data-adapttable-part={parts.label}
            variant="body2"
            sx={{ fontWeight: 600 }}
          >
            {labelContent}
          </Typography>
          <Typography
            component="span"
            data-adapttable-part="group-count"
            variant="body2"
            color="text.secondary"
          >
            {footer || more ? null : labels.groupCount(groupLeafCount(entry))}
          </Typography>
          {layout.labelAggregates.map(({ column, node }) => (
            <Box
              key={column.key}
              component="span"
              data-adapttable-part="group-aggregate"
              data-column={column.key}
              sx={{ marginInlineStart: "auto" }}
            >
              {node as ReactNode}
            </Box>
          ))}
        </Box>
      </TableCell>
      {layout.cells.map(({ column, node }) => (
        <TableCell
          key={column.key}
          {...getCellProps(column)}
          data-adapttable-part={
            node === undefined ? undefined : "group-aggregate"
          }
          data-column={node === undefined ? undefined : column.key}
        >
          {node as ReactNode}
        </TableCell>
      ))}
      {showActions && <TableCell />}
    </TableRow>
  );
}

/** Group header block for the mobile card list. */
export function GroupHeaderCard<TRow>({
  entry,
  columns,
  selection,
  labels,
  onToggleCollapse,
  onShowMore,
  compact = false,
}: Readonly<{
  entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  /** The card's columns, for captioning each subtotal. */
  columns: readonly ColumnDef<TRow>[];
  selection: SelectionState | null;
  labels: Required<TableLabels>;
  onToggleCollapse: (groupKey: string) => void;
  /** Reveal the next page of groups, or of one group's rows. */
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
  compact?: boolean;
}>): ReactElement {
  // A footer is the same row with the controls taken away: no chevron
  // (nothing to collapse from the bottom), no checkbox (the header's own
  // selects the group), and a caption saying what the numbers are.
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
    <Card
      data-adapttable-part={parts.card}
      data-collapsed={
        entry.kind === "group" && entry.collapsed ? "true" : undefined
      }
      variant="outlined"
    >
      <CardContent
        sx={compact ? { p: 1.25, "&:last-child": { pb: 1.25 } } : undefined}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            fontWeight: 600,
          }}
        >
          {footer || more ? (
            <GroupToggleSpacer />
          ) : (
            <GroupToggle
              expanded={expanded}
              expandLabel={labels.expandGroup}
              collapseLabel={labels.collapseGroup}
              onToggle={() => onToggleCollapse(entry.key)}
            />
          )}
          {selection && !footer && !more && (
            <Checkbox
              data-adapttable-part="group-select"
              slotProps={{ input: { "aria-label": labels.selectAll } }}
              checked={groupState === "all"}
              indeterminate={groupState === "some"}
              onChange={() => selection.toggleGroupLeaves(entry.leafIds)}
            />
          )}
          <Typography
            component="span"
            data-adapttable-part={parts.label}
            variant="body2"
            sx={{ fontWeight: 600 }}
          >
            {labelContent}
          </Typography>
          <Typography
            component="span"
            data-adapttable-part="group-count"
            variant="body2"
            color="text.secondary"
          >
            {footer || more ? null : labels.groupCount(groupLeafCount(entry))}
          </Typography>
        </Box>
        {groupAggregateEntries<TRow, ColumnDef<TRow>>(
          columns,
          entry.kind === "groupMore" ? undefined : entry.aggregateCells
        ).map(({ column, node }) => (
          <Box key={column.key} sx={{ display: "flex", gap: 1, mt: 0.5 }}>
            <Typography component="span" variant="body2" color="text.secondary">
              {resolveMobileLabel(column)}
            </Typography>
            <Typography
              component="span"
              data-adapttable-part="group-aggregate"
              data-column={column.key}
              variant="body2"
              sx={{ marginInlineStart: "auto" }}
            >
              {node as ReactNode}
            </Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
