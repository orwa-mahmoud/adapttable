/** The card list rendered in place of the table on narrow screens. */
import {
  cellFlashAttr,
  type MobileCardBodyProps,
  mobileCardListStyle,
  mobileCardPropsEqual,
  mobileCardRegionProps,
  MobileCardsChrome,
  type MobileCardSlotKit,
  mobileCardSlots,
  resolveMobileLabel,
  resolveRowEditTrigger,
  rowEditConflict,
  type UseDataTableResult,
  useSummaryCells,
} from "@adapttable/react/adapter";
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Stack,
  Typography,
} from "@mui/material";
import {
  type ComponentType,
  type CSSProperties,
  memo,
  type ReactNode,
  useMemo,
} from "react";

import { type SharedProps } from "./DesktopTable";
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

/** A card body: the list's inputs, plus this kit's own. */
interface MobileCardProps<TRow> extends MobileCardBodyProps<TRow> {
  compact: boolean;
  dir?: "ltr" | "rtl";
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
  compact,
  dir,
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
      <CardContent
        sx={compact ? { p: 1.25, "&:last-child": { pb: 1.25 } } : undefined}
      >
        {treeEntry && (
          <OptionalTreeToggle
            entry={treeEntry}
            labels={labels}
            onToggle={onToggleTree ?? (() => undefined)}
          />
        )}
        {onToggleSelect && (
          <Checkbox
            style={{ minWidth: 44, minHeight: 44, alignItems: "center" }}
            slotProps={{ input: { "aria-label": labels.selectRow } }}
            checked={selected}
            onChange={() => onToggleSelect(id)}
          />
        )}
        {onToggleExpand && (
          <OptionalExpandToggle
            id={id}
            expanded={expanded}
            onToggle={onToggleExpand}
            dir={dir}
            expandLabel={labels.expandRow}
            collapseLabel={labels.collapseRow}
          />
        )}
        {renderCard ? (
          renderCard(row, {
            index,
            fields,
            selected,
            expanded,
          })
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))",
              gap: "0.75rem",
              minWidth: 0,
            }}
          >
            {fields.map(({ column, label, value }) => (
              <Box
                key={column.key}
                data-adapttable-part="card-row"
                sx={{
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  gridColumn: label ? undefined : "1 / -1",
                  backgroundColor: label ? "action.hover" : undefined,
                  borderRadius: 1,
                  p: label ? 1 : 0,
                }}
              >
                {label && (
                  <Typography
                    data-adapttable-part="card-label"
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    {label}
                  </Typography>
                )}
                {/* Cells are arbitrary ReactNode (often block elements) —
                a <p> wrapper would be invalid HTML. */}
                <Typography
                  component="div"
                  variant="body2"
                  data-adapttable-part="card-value"
                  data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
                >
                  {value}
                </Typography>
              </Box>
            ))}
          </div>
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
          <div data-adapttable-part="card-actions">
            <RowActionButtons
              minTargetSize={44}
              row={row}
              actions={rowEdit.actions}
              confirm={confirm}
              labels={labels}
              layout={rowActionsLayout}
              render={renderRowActions}
            />
          </div>
        )}
        {expanded && renderDetail && (
          // Inside the card — and therefore inside the measured element —
          // so virtualization keeps accurate card heights.
          <Box data-adapttable-part="card-detail" sx={{ mt: 1 }}>
            {renderDetail(row)}
          </Box>
        )}
      </CardContent>
    </MobileTarget.Provider>
  );
}

/**
 * Stable list elements. An inline host is a new component every render,
 * which remounts the cards. A spacer stays a plain box, and a group card
 * already draws its own surface, so it is not wrapped again.
 */
function MuiMobileCardHost(props: {
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
  readonly "data-passthrough"?: string;
  readonly "data-adapttable-part"?: string;
}) {
  "use no memo";
  if (props["data-adapttable-part"] === "virtual-spacer") {
    return <Box aria-hidden sx={{ height: props.style?.height }} />;
  }
  if (props["data-passthrough"] != null) return <>{props.children}</>;
  return <Card {...props} />;
}

/** What the card list's callbacks read beside each card's entry. */
interface CardSlotInputs<TRow> extends Pick<
  SharedProps<TRow>,
  "cardClassName" | "dir"
> {
  readonly table: UseDataTableResult<TRow>;
  readonly CardItem: ComponentType<MobileCardProps<TRow>>;
  readonly compact: boolean;
}

/** This kit's card host, body, extra-row cell and group card. */
function cardSlotKit<TRow>({
  table,
  CardItem,
  cardClassName,
  dir,
  compact,
}: CardSlotInputs<TRow>): MobileCardSlotKit<TRow> {
  const { columns, selection, labels } = table;
  return {
    card: (entry) => {
      const className =
        [cardClassName, entry.rowClass].filter(Boolean).join(" ") || undefined;
      return {
        key: entry.key,
        props: { ...entry.itemProps, variant: "outlined", className },
        content: (
          <CardItem
            {...entry.body}
            className={className}
            compact={compact}
            dir={dir}
          />
        ),
      };
    },
    extraCell: (part, content) => (
      <CardContent data-adapttable-part={part}>{content}</CardContent>
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
  };
}

/** Mobile MUI card list. */
export function MobileCards<TRow>(props: Readonly<SharedProps<TRow>>) {
  // The compiler's cache around these slots is larger than the slots.
  "use no memo";
  const {
    table,
    cardClassName,
    rows,
    size,
    dir,
    summaryRow,
    paddingTop = 0,
    paddingBottom = 0,
    maxHeight,
    virtualScrollRef,
  } = props;
  const { columns, labels } = table;
  const compact = size === "small";
  // The summary renders as a final card. Header groups and multi-sort are
  // desktop-only concerns: cards have no column grid for a group to span and
  // no clickable headers to shift-click.
  const summaryCells = useSummaryCells(summaryRow, rows);

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () =>
      memo(
        MobileCardBase<TRow>,
        mobileCardPropsEqual<TRow, MobileCardProps<TRow>>(["compact", "dir"])
      ),
    []
  );

  const cards = mobileCardSlots(
    props,
    cardSlotKit({ table, CardItem, cardClassName, dir, compact })
  );

  // The summary card sits above the trailing spacer, which is where this
  // list drew it before the shared structure owned the spacer.
  if (summaryCells) {
    cards.push({
      key: "summary",
      props: { "data-passthrough": "" },
      content: (
        <Card
          data-adapttable-part="summary-card"
          variant="outlined"
          role="listitem"
        >
          <CardContent
            sx={compact ? { p: 1.25, "&:last-child": { pb: 1.25 } } : undefined}
          >
            {columns.map((column) => {
              const value = summaryCells[column.key];
              // Unlike the desktop footer, a card has no columns to keep
              // aligned, so columns without a summary are simply skipped.
              if (value === undefined) return null;
              return (
                <Box
                  key={column.key}
                  data-adapttable-part="card-row"
                  sx={{ mb: compact ? 0.5 : 1 }}
                >
                  {resolveMobileLabel(column) && (
                    <Typography
                      data-adapttable-part="card-label"
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {resolveMobileLabel(column)}
                    </Typography>
                  )}
                  <Typography component="div" variant="body2">
                    {value}
                  </Typography>
                </Box>
              );
            })}
          </CardContent>
        </Card>
      ),
    });
  }

  return (
    <MobileCardsChrome
      regionProps={mobileCardRegionProps(
        table.getTableProps()["aria-label"],
        labels.table,
        maxHeight
      )}
      scrollRef={virtualScrollRef}
      style={mobileCardListStyle(maxHeight)}
      hosts={{ List: Stack, Card: MuiMobileCardHost }}
      listProps={{
        spacing: compact ? 1 : 1.5,
        role: "list",
        "aria-label": table.getTableProps()["aria-label"],
      }}
      listStyle={{ margin: undefined, padding: undefined }}
      paddingTop={paddingTop}
      paddingBottom={paddingBottom}
      cards={cards}
    />
  );
}
