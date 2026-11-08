import {
  cellFlashAttr,
  type MobileCardBodyProps,
  mobileCardListStyle,
  mobileCardPropsEqual,
  mobileCardRegionProps,
  MobileCardsChrome,
  mobileCardSlots,
  resolveMobileLabel,
  resolveRowEditTrigger,
  rowEditConflict,
  type SharedTableRenderProps,
  useSummaryCells,
} from "@adapttable/react/adapter";
import { Box, Card, Checkbox, Group, Stack, Text } from "@mantine/core";
import {
  type CSSProperties,
  memo,
  type ReactNode,
  type RefObject,
  useId,
  useMemo,
} from "react";

import type { Density } from "../density";
import {
  OptionalEditableCell,
  OptionalExpandToggle,
  OptionalGroupHeaderCard,
  OptionalRowEditActions,
  OptionalRowReorderButtons,
  OptionalTreeToggle,
} from "./featureSlots";
import { MobileTarget } from "./mobileTarget";
import { RowActionButtons } from "./RowActionButtons";

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
  | "rowActionsLayout"
  | "renderRowActions"
  | "confirm"
  | "getRowId"
  | "onRowClick"
  | "rowClassName"
  | "isCellFlashing"
  | "rowStyle"
  | "rowHeight"
  | "renderRowDetail"
  | "renderCard"
  | "summaryRow"
  | "expansion"
  | "editing"
  | "grouping"
  | "tree"
  | "rowEntries"
  | "paddingTop"
  | "paddingBottom"
  | "measureElement"
  | "rowReorder"
  | "windowStart"
  | "cardSetSize"
  | "pinnedTopRows"
  | "pinnedBottomRows"
  | "pinnedSummaryTop"
  | "pinnedSummaryBottom"
  | "extraRows"
  | "assembly"
  | "maxHeight"
  | "virtualScrollRef"
> {
  bodyRef: RefObject<HTMLDivElement | null>;
  className?: string;
  density?: Density;
}

/** A card body: the list's inputs, plus this kit's own. */
interface MobileCardProps<TRow> extends MobileCardBodyProps<TRow> {
  cardPadding: string;
  cardGap: string | number;
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
  rowActionsLayout,
  renderRowActions,
  isCellFlashing,
  selected,
  expanded,
  onToggleSelect,
  onToggleExpand,
  renderDetail,
  cardGap,
  editing,
  rows,
  getRowId,
  treeEntry,
  onToggleTree,
  rowReorder,
  windowStart,
  rowCount,
  renderCard,
}: Readonly<MobileCardProps<TRow>>) {
  // Built once and used by both paths, so a custom card shows the very
  // same value node the built-in would have — cell renderers and editors
  // included.
  const selectionId = useId();
  const fields = columns.map((column) => ({
    column,
    label: resolveMobileLabel(column),
    value: (
      <OptionalEditableCell
        // Built inside the map, so it needs its own key: React reads these
        // as a list even though a card renders them one at a time.
        key={column.key}
        editing={editing}
        row={row}
        column={column}
        rowId={id}
        rowIndex={index}
        rows={rows}
        columns={columns}
        rowKey={getRowId}
        editLabel={labels.editCell}
        undoLabel={labels.undoEdit}
      />
    ),
  }));

  const rowEdit = resolveRowEditTrigger(
    rowActions,
    editing?.rowEditing,
    row,
    id
  );
  const rowConflict = rowEditConflict(editing, id);
  return (
    <MobileTarget.Provider value={true}>
      <Stack gap={cardGap}>
        {(treeEntry ?? onToggleSelect ?? onToggleExpand) && (
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Group gap="xs">
              {treeEntry && (
                <OptionalTreeToggle
                  entry={treeEntry}
                  labels={labels}
                  onToggle={onToggleTree ?? (() => undefined)}
                />
              )}
              {onToggleSelect && (
                <label
                  htmlFor={selectionId}
                  style={{
                    display: "inline-flex",
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Checkbox
                    id={selectionId}
                    aria-label={labels.selectRow}
                    checked={selected}
                    onChange={() => onToggleSelect(id)}
                    styles={{
                      body: { minHeight: 44, alignItems: "center" },
                      input: { cursor: "pointer" },
                    }}
                  />
                </label>
              )}
            </Group>
            {onToggleExpand && (
              <OptionalExpandToggle
                id={id}
                expanded={Boolean(expanded)}
                onToggle={onToggleExpand}
                expandLabel={labels.expandRow}
                collapseLabel={labels.collapseRow}
              />
            )}
          </Group>
        )}
        {renderCard ? (
          renderCard(row, {
            index,
            fields,
            selected,
            expanded,
          })
        ) : (
          <Box
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))",
              gap:
                typeof cardGap === "number"
                  ? cardGap
                  : `var(--mantine-spacing-${cardGap})`,
            }}
          >
            {fields.map(({ column, label, value }) => (
              <Box
                key={column.key}
                data-adapttable-part="card-row"
                style={{
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  gridColumn: label ? undefined : "1 / -1",
                  borderRadius: "var(--mantine-radius-sm)",
                }}
                p={label ? "xs" : 0}
                bg={label ? "var(--mantine-color-default-hover)" : undefined}
              >
                {label && (
                  <Text
                    data-adapttable-part="card-label"
                    fz="xs"
                    c="var(--mantine-color-text)"
                    fw={500}
                  >
                    {label}
                  </Text>
                )}
                {/* Cells are arbitrary ReactNode (often block elements) —
                a <p> wrapper would be invalid HTML. */}
                <Text
                  component="div"
                  fz={label ? "sm" : "md"}
                  fw={label ? undefined : 600}
                  data-adapttable-part="card-value"
                  data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
                >
                  {value}
                </Text>
              </Box>
            ))}
          </Box>
        )}
        {rowReorder && (
          <OptionalRowReorderButtons
            reorder={rowReorder}
            labels={labels}
            localIndex={index}
            row={row}
            windowStart={windowStart}
            rowCount={rowCount}
          />
        )}
        {expanded && renderDetail && (
          <div data-adapttable-part="card-detail">{renderDetail(row)}</div>
        )}
        {editing?.rowEditing && (
          <OptionalRowEditActions
            rowEditing={editing.rowEditing}
            row={row}
            rowId={id}
            showBegin={rowEdit.showBegin}
            icons={editing.rowEditIcons}
            conflict={rowConflict}
            labels={labels}
          />
        )}
        {rowEdit.actions.length > 0 && (
          <Box
            data-adapttable-part="card-actions"
            pt="sm"
            style={{
              borderTop: "1px solid var(--mantine-color-default-border)",
            }}
          >
            <RowActionButtons
              minTargetSize={44}
              row={row}
              actions={rowEdit.actions}
              confirm={confirm}
              labels={labels}
              layout={rowActionsLayout}
              render={renderRowActions}
            />
          </Box>
        )}
      </Stack>
    </MobileTarget.Provider>
  );
}

/**
 * Stable list elements. An inline host is a new component every render,
 * which remounts the cards. A spacer stays a plain div, and a group card
 * already draws its own surface, so it is not wrapped again.
 */
function MantineMobileCardHost(props: {
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
  readonly "data-passthrough"?: string;
  readonly "data-adapttable-part"?: string;
}) {
  "use no memo";
  if (props["data-adapttable-part"] === "virtual-spacer") {
    return <div aria-hidden style={{ height: props.style?.height }} />;
  }
  if (props["data-passthrough"] != null) return <>{props.children}</>;
  return <Card {...props} />;
}

/** Mobile rendering: one Mantine Card per row with labelled key/value rows. */
export function MobileCards<TRow>(props: Readonly<MobileCardsProps<TRow>>) {
  // The compiler's cache around these slots is larger than the slots.
  "use no memo";
  const {
    table,
    rows,
    bodyRef,
    className,
    paddingTop = 0,
    paddingBottom = 0,
    density = "comfortable",
    summaryRow,
    maxHeight,
    virtualScrollRef,
  } = props;
  const { columns, selection, labels } = table;
  const compact = density === "compact";
  const cardPadding = compact ? "sm" : "md";
  const cardGap = compact ? 4 : "xs";
  // Header groups and multi-sort are desktop-only: cards have no column axis
  // to span a group label across or to chain a sort on, so neither renders
  // here. The footer summary still applies — it closes the list as one card.
  const summaryCells = useSummaryCells(summaryRow, rows);

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () =>
      memo(
        MobileCardBase<TRow>,
        mobileCardPropsEqual<TRow, MobileCardProps<TRow>>([
          "cardPadding",
          "cardGap",
        ])
      ),
    []
  );

  const cards = mobileCardSlots(props, {
    card: (entry) => ({
      key: entry.key,
      props: {
        ...entry.itemProps,
        style: {
          borderColor: entry.selected
            ? "var(--mantine-primary-color-filled)"
            : undefined,
          ...entry.itemProps.style,
        },
        className: entry.rowClass,
        withBorder: true,
        radius: "md",
        padding: cardPadding,
      },
      content: (
        <CardItem {...entry.body} cardPadding={cardPadding} cardGap={cardGap} />
      ),
    }),
    extraCell: (part, content) => (
      <div data-adapttable-part={part}>{content}</div>
    ),
    groupCard: (entry, grouping) => (
      <OptionalGroupHeaderCard
        entry={entry}
        columns={columns}
        selection={selection}
        labels={labels}
        compact={compact}
        onToggleCollapse={(groupKey) => grouping.collapsed.toggle(groupKey)}
        onShowMore={grouping.showMore}
      />
    ),
  });

  const summary = summaryCells ? (
    <Card
      data-adapttable-part="summary-card"
      withBorder
      radius="md"
      padding={cardPadding}
      role="listitem"
    >
      <Stack gap={cardGap}>
        {columns
          .filter((column) => summaryCells[column.key] !== undefined)
          .map((column) => (
            <div key={column.key} data-adapttable-part="card-row">
              {resolveMobileLabel(column) && (
                <Text
                  data-adapttable-part="card-label"
                  fz="xs"
                  c="dimmed"
                  tt="uppercase"
                  fw={500}
                >
                  {resolveMobileLabel(column)}
                </Text>
              )}
              <Text component="div" fz="sm" fw={600}>
                {summaryCells[column.key]}
              </Text>
            </div>
          ))}
      </Stack>
    </Card>
  ) : null;

  return (
    <MobileCardsChrome
      regionProps={mobileCardRegionProps(
        table.getTableProps()["aria-label"],
        labels.table,
        maxHeight
      )}
      scrollRef={virtualScrollRef}
      style={mobileCardListStyle(maxHeight)}
      classNames={{ cards: className }}
      hosts={{ List: Stack, Card: MantineMobileCardHost }}
      listProps={{
        gap: compact ? "xs" : "sm",
        ref: bodyRef,
        ...table.getTableProps({ role: "list" }),
      }}
      listStyle={{ margin: undefined, padding: undefined }}
      paddingTop={paddingTop}
      paddingBottom={paddingBottom}
      cards={cards}
      summary={summary}
    />
  );
}
