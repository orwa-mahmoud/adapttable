import {
  type ColumnDef,
  type ConfirmHandler,
  type EditableCellEditing,
  resolveDisabledReason,
  type RowAction,
  rowClickProps,
  rowEditingSignature,
  runRowAction,
  type SharedTableRenderProps,
  type TableLabels,
  useSummaryCells,
} from "@adapttable/core";
import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  memo,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useMemo,
} from "react";

import type { Density } from "../density";
import { EditableDataCell } from "./EditableCell";
import { ExpandToggle } from "./ExpandToggle";
import { GroupHeaderCard } from "./GroupHeader";

/**
 * Props for {@link MobileCards}: the card-relevant slice of core's shared
 * render contract (no header/pinning/resize concerns on mobile) plus the
 * Mantine-specific extras.
 */
export interface MobileCardsProps<TRow> extends Pick<
  SharedTableRenderProps<TRow>,
  | "table"
  | "rows"
  | "rowActions"
  | "confirm"
  | "getRowId"
  | "onRowClick"
  | "rowClassName"
  | "renderRowDetail"
  | "summaryRow"
  | "expansion"
  | "editing"
  | "grouping"
  | "rowEntries"
  | "paddingTop"
  | "paddingBottom"
  | "measureElement"
> {
  bodyRef: RefObject<HTMLDivElement | null>;
  className?: string;
  density?: Density;
}

function mobileLabel<TRow>(column: ColumnDef<TRow>): string {
  return (
    column.mobileLabel ??
    (typeof column.header === "string" ? column.header : column.key)
  );
}

/** Per-card inputs for the memoized {@link MobileCardBase}. */
interface MobileCardProps<TRow> {
  row: TRow;
  index: number;
  /** Stable row id (selection / expansion key). */
  id: string;
  columns: ColumnDef<TRow>[];
  labels: Required<TableLabels>;
  confirm: ConfirmHandler;
  rowActions?: RowAction<TRow>[];
  /** Resolved `rowClassName(row, index)`, compared as a plain string. */
  className?: string;
  selected: boolean;
  expanded: boolean;
  /** Selection toggle — present only when selection is enabled. */
  onToggleSelect?: (id: string) => void;
  /** Expansion toggle — present only when `renderRowDetail` is set. */
  onToggleExpand?: (id: string) => void;
  renderDetail?: (row: TRow) => ReactNode;
  onRowClick?: (row: TRow) => void;
  measureElement?: (node: Element | null) => void;
  cardPadding: string;
  cardGap: string | number;
  /**
   * Opt-in editing bundle — uncompared. Its identity changes on every
   * keystroke anywhere in the table; the per-row visual churn is
   * fingerprinted by `editingSignature` instead. A held card keeps an
   * older bundle safely: its handlers read live state through refs.
   */
  editing?: EditableCellEditing<TRow>;
  /** Page rows for Tab advance — uncompared (see `editing`). */
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  /** Memo digest from {@link rowEditingSignature}. */
  editingSignature: string | null;
}

/** The card props the memo comparator deliberately skips (see `editing`). */
type UncomparedCardProp = "editing" | "rows" | "getRowId";

/** Every card prop the memo comparator checks with `Object.is`. */
const COMPARED_CARD_PROPS: readonly Exclude<
  keyof MobileCardProps<unknown>,
  UncomparedCardProp
>[] = [
  "row",
  "index",
  "id",
  "columns",
  "labels",
  "confirm",
  "rowActions",
  "className",
  "selected",
  "expanded",
  "onToggleSelect",
  "onToggleExpand",
  "renderDetail",
  "onRowClick",
  "measureElement",
  "cardPadding",
  "cardGap",
  "editingSignature",
];

/**
 * `React.memo` comparator: re-render a card only when one of its VISUAL
 * inputs changes — a search keystroke or another card's checkbox re-renders
 * the list shell, but every unchanged card bails out here (column accessors
 * are not re-invoked).
 */
function mobileCardPropsEqual<TRow>(
  prev: Readonly<MobileCardProps<TRow>>,
  next: Readonly<MobileCardProps<TRow>>
): boolean {
  return COMPARED_CARD_PROPS.every((key) => Object.is(prev[key], next[key]));
}

/** One card. Memoized by {@link mobileCardPropsEqual} at the call site. */
function MobileCardBase<TRow>({
  row,
  index,
  id,
  columns,
  labels,
  confirm,
  rowActions,
  className,
  selected,
  expanded,
  onToggleSelect,
  onToggleExpand,
  renderDetail,
  onRowClick,
  measureElement,
  cardPadding,
  cardGap,
  editing,
  rows,
  getRowId,
}: Readonly<MobileCardProps<TRow>>) {
  return (
    <Card
      {...rowClickProps(row, onRowClick)}
      className={className}
      ref={measureElement}
      data-index={index}
      withBorder
      radius="md"
      padding={cardPadding}
      role="listitem"
      data-stagger=""
    >
      <Stack gap={cardGap}>
        {onToggleSelect && (
          <Checkbox
            aria-label={labels.selectRow}
            checked={selected}
            onChange={() => onToggleSelect(id)}
          />
        )}
        {onToggleExpand && (
          <Group justify="flex-end">
            <ExpandToggle
              expanded={expanded}
              expandLabel={labels.expandRow}
              collapseLabel={labels.collapseRow}
              onToggle={() => onToggleExpand(id)}
            />
          </Group>
        )}
        {columns.map((column) => (
          <div key={column.key}>
            <Text fz="xs" c="dimmed" tt="uppercase" fw={500}>
              {mobileLabel(column)}
            </Text>
            {/* Cells are arbitrary ReactNode (often block elements) —
                a <p> wrapper would be invalid HTML. */}
            <Text component="div" fz="sm">
              <EditableDataCell
                editing={editing}
                row={row}
                column={column}
                rowId={id}
                rows={rows}
                columns={columns}
                rowKey={getRowId}
                editLabel={labels.editCell}
                display={
                  column.Cell ? (
                    <column.Cell row={row} rowIndex={index} />
                  ) : (
                    column.accessor?.(row)
                  )
                }
              />
            </Text>
          </div>
        ))}
        {expanded && renderDetail && <div>{renderDetail(row)}</div>}
        {rowActions && rowActions.length > 0 && (
          <Group gap={4} justify="flex-end" pt={4}>
            {rowActions.map((action) => {
              if (action.isHidden?.(row)) return null;
              const reason = resolveDisabledReason(
                action.disabledReason?.(row)
              );
              const disabled =
                reason !== undefined || (action.isDisabled?.(row) ?? false);
              // The disabled attribute already blocks activation, so attach
              // the handler only when the action can run.
              const run = disabled
                ? undefined
                : () => runRowAction(action, row, confirm, labels.cancel);
              return action.icon ? (
                <Tooltip
                  key={action.key}
                  label={reason ?? action.label}
                  withArrow
                  openDelay={200}
                >
                  <ActionIcon
                    variant="subtle"
                    color={action.color}
                    size="sm"
                    disabled={disabled}
                    aria-label={action.label}
                    onClick={run}
                  >
                    {action.icon}
                  </ActionIcon>
                </Tooltip>
              ) : (
                <Button
                  key={action.key}
                  variant="subtle"
                  color={action.color}
                  size="compact-sm"
                  disabled={disabled}
                  onClick={run}
                >
                  {action.label}
                </Button>
              );
            })}
          </Group>
        )}
      </Stack>
    </Card>
  );
}

/** Mobile rendering: one Mantine Card per row with labelled key/value rows. */
export function MobileCards<TRow>({
  table,
  rows,
  rowActions,
  confirm,
  getRowId,
  bodyRef,
  className,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
  density = "comfortable",
  onRowClick,
  rowClassName,
  renderRowDetail,
  summaryRow,
  expansion,
  editing,
  grouping,
}: Readonly<MobileCardsProps<TRow>>) {
  const { columns, selection, labels } = table;
  const compact = density === "compact";
  const cardPadding = compact ? "sm" : "md";
  const cardGap = compact ? 4 : "xs";
  const entries =
    rowEntries ??
    rows.map((row, index) => ({
      row,
      index,
      key: getRowId(row),
    }));
  // Header groups and multi-sort are desktop-only: cards have no column axis
  // to span a group label across or to chain a sort on, so neither renders
  // here. The footer summary still applies — it closes the list as one card.
  const summaryCells = useSummaryCells(summaryRow, rows);

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () => memo(MobileCardBase<TRow>, mobileCardPropsEqual),
    []
  );

  const renderCard = (row: TRow, index: number, key: string): ReactElement => {
    const id = getRowId(row);
    return (
      <CardItem
        key={key}
        row={row}
        index={index}
        id={id}
        columns={columns}
        labels={labels}
        confirm={confirm}
        rowActions={rowActions}
        className={rowClassName?.(row, index)}
        selected={selection ? selection.isSelected(id) : false}
        expanded={expansion ? expansion.isExpanded(id) : false}
        onToggleSelect={selection ? selection.toggle : undefined}
        onToggleExpand={
          expansion && renderRowDetail ? expansion.toggle : undefined
        }
        renderDetail={renderRowDetail}
        onRowClick={onRowClick}
        measureElement={measureElement}
        cardPadding={cardPadding}
        cardGap={cardGap}
        editing={editing}
        rows={rows}
        getRowId={getRowId}
        editingSignature={rowEditingSignature(editing, id)}
      />
    );
  };

  return (
    <Stack
      gap={compact ? "xs" : "sm"}
      ref={bodyRef}
      className={className}
      {...table.getTableProps({ role: "list" })}
    >
      {paddingTop > 0 && <div aria-hidden style={{ height: paddingTop }} />}
      {grouping
        ? grouping.entries.map((entry) =>
            entry.kind === "group" ? (
              <GroupHeaderCard
                key={entry.key}
                entry={entry}
                selection={selection}
                labels={labels}
                padding={cardPadding}
                onToggleCollapse={(key) => grouping.collapsed.toggle(key)}
              />
            ) : (
              renderCard(entry.row, entry.index, entry.key)
            )
          )
        : entries.map(({ row, index, key }) => renderCard(row, index, key))}
      {paddingBottom > 0 && (
        <div aria-hidden style={{ height: paddingBottom }} />
      )}
      {summaryCells && (
        <Card withBorder radius="md" padding={cardPadding} role="listitem">
          <Stack gap={cardGap}>
            {columns
              .filter((column) => summaryCells[column.key] !== undefined)
              .map((column) => (
                <div key={column.key}>
                  <Text fz="xs" c="dimmed" tt="uppercase" fw={500}>
                    {mobileLabel(column)}
                  </Text>
                  <Text component="div" fz="sm" fw={600}>
                    {summaryCells[column.key]}
                  </Text>
                </div>
              ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
