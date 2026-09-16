import {
  type Direction,
  groupAggregateEntries,
  type GroupedFlatEntry,
  groupLeafCount,
  groupRowLayout,
  groupSelectionState,
  type TableLabels,
} from "@adapttable/core";
import { type ColumnDef, type SelectionState } from "@adapttable/react";
import {
  ExpandChevron,
  groupIndentStyle,
  groupRowParts,
  GroupToggleSpacer,
  resolveMobileLabel,
} from "@adapttable/react/adapter";
import { Box, Card, HStack, IconButton, Table, Text } from "@chakra-ui/react";
import type { ReactElement, ReactNode } from "react";

import { subtleText } from "../styles";
import { GroupMoreButton } from "./kitControls";
import { Checkbox } from "./primitives";

/** Chevron toggle for a row-group's collapse state (mirrors {@link ExpandToggle}). */
function GroupExpandToggle({
  open,
  dir,
  labels,
  onToggle,
}: Readonly<{
  open: boolean;
  dir?: Direction;
  labels: Pick<Required<TableLabels>, "expandGroup" | "collapseGroup">;
  onToggle: () => void;
}>) {
  return (
    <IconButton
      size="xs"
      variant="ghost"
      data-adapttable-part="group-toggle"
      aria-expanded={open}
      aria-label={open ? labels.collapseGroup : labels.expandGroup}
      onClick={onToggle}
    >
      <ExpandChevron open={open} dir={dir} />
    </IconButton>
  );
}

/** Kit-native (Chakra) group header row for the desktop table. */
export function GroupHeaderRow<TRow>({
  entry,
  columns,
  leadingCells,
  showActions,
  getCellProps,
  selection,
  labels,
  dir,
  accentColor,
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
  dir?: Direction;
  accentColor?: string;
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
    entry.kind === "groupMore" ? undefined : entry.aggregateCells,
    entry.kind === "groupMore" ? undefined : entry.aggregateOps
  );

  return (
    <Table.Row
      data-adapttable-part={parts.row}
      data-collapsed={
        entry.kind === "group" && entry.collapsed ? "true" : undefined
      }
      fontWeight="semibold"
    >
      <Table.Cell
        colSpan={leadingCells + layout.labelColumns.length}
        data-adapttable-part={parts.cell}
        style={groupIndentStyle(entry.level)}
      >
        <HStack gap={2} w="full">
          {footer || more ? (
            <GroupToggleSpacer />
          ) : (
            <GroupExpandToggle
              open={expanded}
              dir={dir}
              labels={labels}
              onToggle={() => onToggleCollapse(entry.key)}
            />
          )}
          {selection && !footer && !more && (
            <Box data-adapttable-part="group-select">
              <Checkbox
                aria-label={labels.selectAll}
                checked={groupState === "all"}
                indeterminate={groupState === "some"}
                colorPalette={accentColor}
                onToggle={() => selection.toggleGroupLeaves(entry.leafIds)}
              />
            </Box>
          )}
          <Text as="span" data-adapttable-part={parts.label}>
            {labelContent}
          </Text>
          <Text as="span" data-adapttable-part="group-count" {...subtleText}>
            {footer || more ? null : labels.groupCount(groupLeafCount(entry))}
          </Text>
          {layout.labelAggregates.map(({ column, node }) => (
            <Box
              key={column.key}
              data-adapttable-part="group-aggregate"
              data-column={column.key}
              ms="auto"
            >
              {node as ReactNode}
            </Box>
          ))}
        </HStack>
      </Table.Cell>
      {layout.cells.map(({ column, node }) => (
        <Table.Cell
          key={column.key}
          {...getCellProps(column)}
          data-adapttable-part={
            node === undefined ? undefined : "group-aggregate"
          }
          data-column={node === undefined ? undefined : column.key}
        >
          {node as ReactNode}
        </Table.Cell>
      ))}
      {showActions && <Table.Cell />}
    </Table.Row>
  );
}

/** Group header block for the mobile card list. */
export function GroupHeaderCard<TRow>({
  entry,
  columns,
  selection,
  labels,
  dir,
  accentColor,
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
  dir?: Direction;
  accentColor?: string;
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

  return (
    <Card.Root
      data-adapttable-part={parts.card}
      data-collapsed={
        entry.kind === "group" && entry.collapsed ? "true" : undefined
      }
      variant="outline"
      fontWeight="semibold"
    >
      <Card.Body>
        <HStack gap={2}>
          {footer || more ? (
            <GroupToggleSpacer />
          ) : (
            <GroupExpandToggle
              open={expanded}
              dir={dir}
              labels={labels}
              onToggle={() => onToggleCollapse(entry.key)}
            />
          )}
          {selection && !footer && !more && (
            <Box data-adapttable-part="group-select">
              <Checkbox
                aria-label={labels.selectAll}
                checked={groupState === "all"}
                indeterminate={groupState === "some"}
                colorPalette={accentColor}
                onToggle={() => selection.toggleGroupLeaves(entry.leafIds)}
              />
            </Box>
          )}
          <Text as="span" data-adapttable-part={parts.label}>
            {labelContent}
          </Text>
          <Text as="span" data-adapttable-part="group-count" {...subtleText}>
            {footer || more ? null : labels.groupCount(groupLeafCount(entry))}
          </Text>
        </HStack>
        {groupAggregateEntries<TRow, ColumnDef<TRow>>(
          columns,
          entry.kind === "groupMore" ? undefined : entry.aggregateCells,
          entry.kind === "groupMore" ? undefined : entry.aggregateOps
        ).map(({ column, node }) => (
          <HStack key={column.key} gap="2" mt="1">
            <Text as="span" {...subtleText}>
              {resolveMobileLabel(column)}
            </Text>
            <Text
              as="span"
              data-adapttable-part="group-aggregate"
              data-column={column.key}
              ms="auto"
            >
              {node as ReactNode}
            </Text>
          </HStack>
        ))}
      </Card.Body>
    </Card.Root>
  );
}
