/** The card list rendered in place of the table on narrow screens. */
import {
  type ColumnDef,
  type EditableCellEditing,
  type ReactMobileCardRenderer,
} from "@adapttable/react";
import {
  bodyRowEntries,
  cellFlashAttr,
  type ConfirmHandler,
  EXTRA_ROW_PARTS,
  isExtraEntry,
  mobileCardListStyle,
  mobileCardRegionProps,
  MobileCardsChrome,
  type MobileCardSlot,
  orderedCardEntries,
  pinnedSummaryPart,
  pinnedSummaryRowId,
  pinnedSummarySideFromId,
  resolveMobileLabel,
  resolveRowEditTrigger,
  resolveRowStyle,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  rowClickProps,
  rowEditConflict,
  rowEditingSignature,
  rowFlashSignature,
  rowIsDirty,
  rowReorderSignature,
  rowStyleSignature,
  type TableLabels,
  treeCardStyle,
  type TreeEntry,
  useSummaryCells,
} from "@adapttable/react/adapter";
import {
  type ComponentProps,
  type CSSProperties,
  memo,
  type ReactNode,
  useId,
  useMemo,
} from "react";

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

/** Drop row-interaction props on pinned summary cards. */
function unlessPinned<T>(
  side: ReturnType<typeof pinnedSummarySideFromId>,
  value: T | undefined
): T | undefined {
  return side ? undefined : value;
}

function unlessPinnedMatch(
  side: ReturnType<typeof pinnedSummarySideFromId>,
  match: ((id: string) => boolean) | undefined,
  id: string
): boolean {
  return Boolean(unlessPinned(side, match)?.(id));
}

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

/** Per-card inputs for the memoized {@link MobileCardBase}. */
interface MobileCardProps<TRow> {
  /** Replace the card's body — see `BaseDataTableProps.renderCard`. */
  renderCard?: ReactMobileCardRenderer<TRow>;
  /** This card's place in the tree, when the table is one. */
  treeEntry?: TreeEntry<TRow>;
  /** Open or close this node. */
  onToggleTree?: (id: string) => void;
  row: TRow;
  index: number;
  /** Stable row id (selection / expansion key). */
  id: string;
  columns: readonly ColumnDef<TRow>[];
  labels: Required<TableLabels>;
  confirm: ConfirmHandler;
  rowActions?: RowAction<TRow>[];
  rowActionsLayout?: RowActionsLayout;
  renderRowActions?: RowActionsRenderer<TRow>;
  /** Static list class merged with resolved `rowClassName` output. */
  className?: string;
  /** Resolved `rowStyle` + `rowHeight`. Compared via `styleSignature`. */
  style?: CSSProperties;
  styleSignature: string;
  /**
   * Flashing column keys for this card, joined. Compared instead of
   * `isCellFlashing`, which stays referentially stable while the marks move.
   */
  flashSignature: string;
  isCellFlashing?: (rowId: string, columnKey: string) => boolean;
  selected: boolean;
  expanded: boolean;
  /** Selection toggle — present only when selection is enabled. */
  onToggleSelect?: (id: string) => void;
  /** Expansion toggle — present only when expansion is enabled. */
  onToggleExpand?: (id: string) => void;
  renderDetail?: (row: TRow) => ReactNode;
  onRowClick?: (row: TRow) => void;
  measureElement?: (node: Element | null) => void;
  compact: boolean;
  dir?: "ltr" | "rtl";
  accentColor?: BaseUiAccentColor;
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
  /** Headless reorder; uncompared — visual churn is `reorderSignature`. */
  rowReorder: SharedProps<TRow>["rowReorder"];
  windowStart: number;
  rowCount: number;
  /** Rows in the whole dataset, for `aria-setsize`. */
  setSize: number;
  reorderSignature: string | null;
  part?: string;
  ariaLabel?: string;
}

/** The card props the memo comparator deliberately skips (see `editing`). */
type UncomparedCardProp =
  "editing" | "rows" | "getRowId" | "rowReorder" | "style" | "isCellFlashing";

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
  "rowActionsLayout",
  "renderRowActions",
  "className",
  "styleSignature",
  "flashSignature",
  "selected",
  "expanded",
  "onToggleSelect",
  "onToggleExpand",
  "renderDetail",
  "onRowClick",
  "measureElement",
  "compact",
  "dir",
  "accentColor",
  "editingSignature",
  "reorderSignature",
  "windowStart",
  "rowCount",
  "setSize",
  // Or a folder opens and its own chevron never turns.
  "treeEntry",
  "part",
  "ariaLabel",
];

/**
 * `React.memo` comparator: re-render a card only when one of its VISUAL
 * inputs changes — a search keystroke or another card's checkbox re-renders
 * the list shell, but every unchanged card bails out here.
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
export function MobileCards<TRow>({
  table,
  rows,
  rowActions,
  rowActionsLayout,
  renderRowActions,
  confirm,
  getRowId,
  size,
  accentColor,
  dir,
  onRowClick,
  rowClassName,
  isCellFlashing,
  rowStyle,
  rowHeight,
  renderRowDetail,
  summaryRow,
  expansion,
  editing,
  grouping,
  tree,
  className,
  rowEntries,
  paddingTop = 0,
  paddingBottom = 0,
  measureElement,
  rowReorder,
  windowStart = 0,
  cardSetSize = 0,
  pinnedTopRows = [],
  pinnedBottomRows = [],
  pinnedSummaryTop = [],
  pinnedSummaryBottom = [],
  extraRows,
  assembly,
  renderCard,
  maxHeight,
  virtualScrollRef,
}: Readonly<SharedProps<TRow>>) {
  // The compiler's cache around these slots is larger than the slots.
  "use no memo";
  const { columns, selection, labels } = table;
  const entries = orderedCardEntries(
    rows,
    getRowId,
    rowEntries,
    pinnedTopRows,
    pinnedBottomRows,
    pinnedSummaryTop,
    pinnedSummaryBottom
  );
  const flatCardSlots = assembly?.insertExtraRows
    ? assembly.insertExtraRows(
        bodyRowEntries(entries, tree),
        extraRows,
        (entry) => entry.key
      )
    : bodyRowEntries(entries, tree);
  const compact = size === "1";
  const summary = useSummaryCells(summaryRow, rows);

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () => memo(MobileCardBase<TRow>, mobileCardPropsEqual),
    []
  );

  const cardFor = (
    row: TRow,
    index: number,
    key: string,
    treeEntry?: TreeEntry<TRow>
  ): MobileCardSlot => {
    const side = pinnedSummarySideFromId(key);
    const id = side ? key : getRowId(row);
    const part = side ? pinnedSummaryPart(side) : undefined;
    const rowStyleValue = resolveRowStyle(rowStyle, rowHeight, row, index);
    return {
      key,
      props: {
        ref: measureElement,
        "data-index": index,
        // A windowed list has only a slice of its items in the DOM, so each
        // one states where it sits and how many there are; a complete list
        // needs neither, because assistive tech can simply count.
        "aria-posinset":
          cardSetSize > rows.length ? windowStart + index + 1 : undefined,
        "aria-setsize": cardSetSize > rows.length ? cardSetSize : undefined,
        "data-adapttable-part": part ?? "card",
        "data-stagger": "",
        "data-selected": unlessPinnedMatch(side, selection?.isSelected, id)
          ? ""
          : undefined,
        "aria-label": side ? labels.pinnedSummaryRow : undefined,
        "data-dirty": rowIsDirty(editing, id) ? "" : undefined,
        size: compact ? "1" : "2",
        role: "listitem",
        className: joinClasses(className, rowClassName?.(row, index)),
        ...rowClickProps(row, unlessPinned(side, onRowClick), index),
        style: {
          minHeight: "max-content",
          ...treeCardStyle(treeEntry?.level ?? 0),
          ...rowStyleValue,
        },
      },
      content: (
        <CardItem
          row={row}
          index={index}
          id={id}
          columns={columns}
          labels={labels}
          confirm={confirm}
          rowActions={unlessPinned(side, rowActions)}
          rowActionsLayout={rowActionsLayout}
          renderRowActions={unlessPinned(side, renderRowActions)}
          className={joinClasses(className, rowClassName?.(row, index))}
          style={rowStyleValue}
          styleSignature={rowStyleSignature(rowStyleValue)}
          flashSignature={rowFlashSignature(isCellFlashing, id, columns)}
          isCellFlashing={isCellFlashing}
          selected={unlessPinnedMatch(side, selection?.isSelected, id)}
          expanded={unlessPinnedMatch(side, expansion?.isExpanded, id)}
          onToggleSelect={unlessPinned(side, selection?.toggle)}
          onToggleExpand={unlessPinned(side, expansion?.toggle)}
          renderDetail={unlessPinned(side, renderRowDetail)}
          onRowClick={unlessPinned(side, onRowClick)}
          measureElement={measureElement}
          compact={compact}
          dir={dir}
          accentColor={accentColor}
          editing={editing}
          rows={rows}
          getRowId={getRowId}
          editingSignature={rowEditingSignature(editing, id)}
          treeEntry={unlessPinned(side, treeEntry)}
          onToggleTree={unlessPinned(side, tree?.expansion.toggle)}
          rowReorder={unlessPinned(side, rowReorder)}
          windowStart={windowStart}
          rowCount={rows.length}
          setSize={cardSetSize}
          reorderSignature={rowReorderSignature(rowReorder, id, index)}
          renderCard={unlessPinned(side, renderCard)}
          part={part}
          ariaLabel={side ? labels.pinnedSummaryRow : undefined}
        />
      ),
    };
  };

  const extraSlot = (entry: {
    key: string;
    kind: "separator" | "fullWidth";
    render?: () => unknown;
  }): MobileCardSlot => ({
    key: entry.key,
    part: EXTRA_ROW_PARTS[entry.kind].row,
    props: {
      role: entry.kind === "separator" ? "separator" : "listitem",
      "aria-label":
        entry.kind === "separator" ? labels.rowSeparator : undefined,
    },
    content: (
      <Box data-adapttable-part={EXTRA_ROW_PARTS[entry.kind].cell}>
        {entry.kind === "fullWidth" ? (entry.render?.() as ReactNode) : null}
      </Box>
    ),
  });

  function groupedSlots(): MobileCardSlot[] {
    if (!grouping) return [];
    const slots: MobileCardSlot[] = [];
    for (const [index, row] of pinnedSummaryTop.entries()) {
      slots.push(cardFor(row, index, pinnedSummaryRowId("top", index)));
    }
    for (const entry of grouping.entries) {
      if (isExtraEntry(entry)) {
        slots.push(extraSlot(entry));
        continue;
      }
      if (
        entry.kind === "group" ||
        entry.kind === "groupFooter" ||
        entry.kind === "groupMore"
      ) {
        slots.push({
          key: entry.key,
          props: { "data-passthrough": "" },
          content: (
            <OptionalGroupHeaderCard
              entry={entry}
              columns={columns}
              selection={selection}
              labels={labels}
              compact={compact}
              onToggleCollapse={(groupKey) =>
                grouping.collapsed.toggle(groupKey)
              }
              onShowMore={grouping.showMore}
            />
          ),
        });
        continue;
      }
      slots.push(cardFor(entry.row, entry.index, entry.key));
    }
    for (const [index, row] of pinnedSummaryBottom.entries()) {
      slots.push(cardFor(row, index, pinnedSummaryRowId("bottom", index)));
    }
    return slots;
  }

  function flatSlots(): MobileCardSlot[] {
    return flatCardSlots.map((slot) =>
      isExtraEntry(slot)
        ? extraSlot(slot)
        : cardFor(slot.row, slot.index, slot.key, slot.treeEntry)
    );
  }

  const cards = grouping ? groupedSlots() : flatSlots();

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
