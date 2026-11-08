/** The card list rendered in place of the table on narrow screens. */
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
  useSummaryCells,
} from "@adapttable/react/adapter";
import { type ComponentProps, memo, useId, useMemo } from "react";

import type { BaseUiAccentColor } from "../types";
import { Box, Card, Flex, Text } from "../ui";
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
import { Checkbox } from "./primitives";
import { RowActionButtons } from "./RowActionButtons";

/**
 * Stable list elements. An inline host is a new component every render,
 * which remounts the cards. A spacer stays a plain box, and a group card
 * already draws its own surface, so it is not wrapped again.
 */
function BaseUiMobileCardHost(
  props: ComponentProps<typeof Card> & {
    readonly "data-passthrough"?: string;
    readonly "data-adapttable-part"?: string;
  }
) {
  "use no memo";
  if (props["data-adapttable-part"] === "virtual-spacer") {
    return <Box aria-hidden style={{ height: props.style?.height }} />;
  }
  if (props["data-passthrough"] != null) return <>{props.children}</>;
  return <Card {...props} />;
}

/** Join the static class hook with a conditional per-row class. */
function joinClasses(
  base: string | undefined,
  extra: string | undefined
): string | undefined {
  if (base && extra) return `${base} ${extra}`;
  return base ?? extra;
}

/** A Base UI card body: the list's inputs, plus its size, direction and accent. */
interface MobileCardProps<TRow> extends MobileCardBodyProps<TRow> {
  compact: boolean;
  dir?: "ltr" | "rtl";
  accentColor?: BaseUiAccentColor;
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
  dir,
  accentColor,
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
  "use no memo";
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
      {treeEntry && (
        <OptionalTreeToggle
          entry={treeEntry}
          labels={labels}
          onToggle={onToggleTree ?? (() => undefined)}
        />
      )}
      {onToggleSelect && (
        <Box mb="2">
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
              onToggle={() => onToggleSelect(id)}
            />
          </label>
        </Box>
      )}
      {onToggleExpand && (
        <Box mb="2">
          <OptionalExpandToggle
            id={id}
            expanded={Boolean(expanded)}
            onToggle={onToggleExpand}
            dir={dir}
            expandLabel={labels.expandRow}
            collapseLabel={labels.collapseRow}
          />
        </Box>
      )}
      {renderCard ? (
        renderCard(row, { index, fields, selected, expanded })
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
              style={{
                minWidth: 0,
                overflowWrap: "anywhere",
                gridColumn: label ? undefined : "1 / -1",
                background: label ? "var(--adapttable-soft)" : undefined,
                borderRadius: "var(--adapttable-radius)",
                padding: label ? "0.5rem" : undefined,
              }}
            >
              {label && (
                <Text
                  data-adapttable-part="card-label"
                  as="div"
                  size="1"
                  style={{ color: "inherit" }}
                >
                  {label}
                </Text>
              )}
              <Text
                as="div"
                size="2"
                data-adapttable-part="card-value"
                data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
              >
                {value}
              </Text>
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
      {expanded && (
        <Box data-adapttable-part="card-detail" pt="1">
          {renderDetail?.(row)}
        </Box>
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
        <Box data-adapttable-part="card-actions">
          <RowActionButtons
            minTargetSize={44}
            row={row}
            actions={rowEdit.actions}
            confirm={confirm}
            labels={labels}
            layout={rowActionsLayout}
            render={renderRowActions}
            accentColor={accentColor}
          />
        </Box>
      )}
    </MobileTarget.Provider>
  );
}

/** Mobile Base UI card list. */
export function MobileCards<TRow>(props: Readonly<SharedProps<TRow>>) {
  // The compiler's cache around these slots is larger than the slots.
  "use no memo";
  const {
    table,
    rows,
    size,
    accentColor,
    dir,
    summaryRow,
    className,
    paddingTop = 0,
    paddingBottom = 0,
    maxHeight,
    virtualScrollRef,
  } = props;
  const { columns, selection, labels } = table;
  const compact = size === "1";
  const summary = useSummaryCells(summaryRow, rows);

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () =>
      memo(
        MobileCardBase<TRow>,
        mobileCardPropsEqual<TRow, MobileCardProps<TRow>>([
          "compact",
          "dir",
          "accentColor",
        ])
      ),
    []
  );

  const cards = mobileCardSlots(props, {
    card: (entry) => {
      const cardClass = joinClasses(className, entry.rowClass);
      return {
        key: entry.key,
        props: {
          ...entry.itemProps,
          size: compact ? "1" : "2",
          className: cardClass,
        },
        content: (
          <CardItem
            {...entry.body}
            className={cardClass}
            compact={compact}
            dir={dir}
            accentColor={accentColor}
          />
        ),
      };
    },
    extraCell: (part, content) => (
      <Box data-adapttable-part={part}>{content}</Box>
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

  return (
    <MobileCardsChrome
      regionProps={mobileCardRegionProps(
        table.getTableProps()["aria-label"],
        labels.table,
        maxHeight
      )}
      scrollRef={virtualScrollRef}
      style={mobileCardListStyle(maxHeight)}
      hosts={{ List: Flex, Card: BaseUiMobileCardHost }}
      listProps={{
        direction: "column",
        gap: compact ? "2" : "3",
        role: "list",
        "aria-label": table.getTableProps()["aria-label"],
      }}
      listStyle={{ margin: undefined, padding: undefined }}
      paddingTop={paddingTop}
      paddingBottom={paddingBottom}
      cards={cards}
      summary={
        summary ? (
          <Card
            data-adapttable-part="summary-card"
            size={compact ? "1" : "2"}
            role="listitem"
            className={className}
          >
            {columns.map((column) => {
              const value = summary[column.key];
              // Columns absent from the summary are skipped — a card has no grid
              // to keep aligned, so empty entries are just noise.
              if (value === undefined) return null;
              return (
                <Box
                  key={column.key}
                  data-adapttable-part="card-row"
                  mb={compact ? "1" : "2"}
                >
                  {resolveMobileLabel(column) && (
                    <Text
                      data-adapttable-part="card-label"
                      as="div"
                      size="1"
                      color="gray"
                      style={{ textTransform: "uppercase" }}
                    >
                      {resolveMobileLabel(column)}
                    </Text>
                  )}
                  <Text as="div" size="2" weight="bold">
                    {value}
                  </Text>
                </Box>
              );
            })}
          </Card>
        ) : undefined
      }
    />
  );
}
