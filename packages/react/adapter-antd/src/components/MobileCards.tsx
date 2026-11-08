import {
  type ColumnDef,
  type EditableCellEditing,
  type ReactMobileCardRenderer,
  type RowExpansionState,
  type UseDataTableResult,
} from "@adapttable/react";
import {
  type AssemblyFns,
  cellFlashAttr,
  type ConfirmHandler,
  type ExtraRow,
  groupAggregateEntries,
  type GroupedFlatEntry,
  type MobileCardBodyProps,
  mobileCardPropsEqual,
  mobileCardRegionProps,
  MobileCardsChrome,
  mobileCardSlots,
  resolveMobileLabel,
  resolveRowEditTrigger,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  rowClickProps,
  rowEditConflict,
  rowIsDirty,
  type RowReorderState,
  type RowStyle,
  treeCardStyle,
  type TreeEntry,
  useSummaryCells,
  type VirtualTableRow,
} from "@adapttable/react/adapter";
import {
  Card,
  Checkbox,
  ConfigProvider,
  Descriptions,
  Space,
  theme,
  Typography,
} from "antd";
import {
  type CSSProperties,
  memo,
  type ReactNode,
  useContext,
  useMemo,
} from "react";

import {
  OptionalEditableCell,
  OptionalExpandToggle,
  OptionalGroupHeaderCard,
  OptionalRowEditActions,
  OptionalRowReorderButtons,
  OptionalTreeToggle,
} from "./featureSlots";
import { ADAPTTABLE_GROUP, type AdaptTableGroupRow } from "./grouping";
import { MobileTarget } from "./mobileTarget";
import { RowActionButtons } from "./RowActionButtons";

/**
 * Stable list elements. An inline host is a new component every render,
 * which remounts the cards. A spacer stays a plain item, and the summary
 * already draws its own item, so it is not wrapped again.
 */
function AntdMobileCardHost(props: {
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
  readonly "data-passthrough"?: string;
  readonly "data-adapttable-part"?: string;
}) {
  "use no memo";
  if (props["data-passthrough"] != null) return <>{props.children}</>;
  if (props["data-adapttable-part"] === "virtual-spacer") {
    return <li aria-hidden style={{ height: props.style?.height }} />;
  }
  return <li {...props} />;
}

/** Name the real kit-owned field rows and label spans, without extra markup. */
function CardDescriptions({
  children,
  vertical = false,
}: Readonly<{ children: ReactNode; vertical?: boolean }>) {
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext);
  const prefix = getPrefixCls("descriptions");
  return (
    <Descriptions
      column={1}
      layout={vertical ? "vertical" : "horizontal"}
      size="small"
      colon={false}
      styles={{ label: { color: "inherit" } }}
      ref={(descriptions) => {
        const root = descriptions?.nativeElement;
        if (!root) return;
        // The label/value content can contain another table, so only the
        // Descriptions' own rows receive card hooks.
        for (const row of root.querySelectorAll("tr")) {
          if (row.closest("table")?.parentElement?.parentElement !== root)
            continue;
          row.dataset.adapttablePart = "card-row";
          for (const label of row.querySelectorAll<HTMLElement>("span")) {
            if (
              label.closest("tr") === row &&
              label.classList.contains(`${prefix}-item-label`)
            ) {
              label.dataset.adapttablePart = "card-label";
            }
          }
        }
      }}
    >
      {children}
    </Descriptions>
  );
}

/**
 * The mobile counterpart of the desktop footer summary: one trailing card
 * listing label → summary value for every visible column the `summaryRow`
 * result covers (absent keys render nothing — empty cells are table
 * alignment noise, not card content).
 */
function SummaryCard<TRow>({
  rows,
  columns,
  summaryRow,
}: Readonly<{
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  summaryRow: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
}>) {
  const cells = useSummaryCells(summaryRow, rows) ?? {};
  return (
    <Card size="small" data-adapttable-part="summary-card">
      <CardDescriptions>
        {columns
          .filter((column) => cells[column.key] !== undefined)
          .map((column) => (
            <Descriptions.Item
              key={column.key}
              label={resolveMobileLabel(column)}
            >
              {cells[column.key]}
            </Descriptions.Item>
          ))}
      </CardDescriptions>
    </Card>
  );
}

/** Per-card inputs for the memoized {@link CardItemBase}. */
/** An antd card body: the list's inputs, plus the row prefetch. */
interface CardItemProps<TRow> extends MobileCardBodyProps<TRow> {
  prefetch?: (row: TRow) => void;
}

/** One card. Memoized by {@link cardItemPropsEqual} at the call site. */
function CardItemBase<TRow>(props: Readonly<CardItemProps<TRow>>) {
  const {
    row,
    index: rowIndex,
    id,
    columns,
    labels,
    confirm,
    rowActions,
    rowActionsLayout,
    renderRowActions,
    className,
    style,
    isCellFlashing,
    selected,
    expanded,
    onToggleSelect,
    onToggleExpand,
    renderDetail,
    onRowClick,
    prefetch,
    editing,
    rows,
    getRowId,
    treeEntry,
    onToggleTree,
    rowReorder,
    windowStart,
    rowCount,
    renderCard,
  } = props;
  const rowEdit = resolveRowEditTrigger(
    rowActions,
    editing?.rowEditing,
    row,
    id
  );
  const rowConflict = rowEditConflict(editing, id);
  const actions = rowEdit.actions.length > 0 ? rowEdit.actions : null;
  // Built once and used by both paths, so a custom card shows the very same
  // value node the built-in would have — cell renderers and editors included.
  const { token } = theme.useToken();
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
        rowIndex={rowIndex}
        rows={rows}
        columns={columns}
        rowKey={getRowId}
        editLabel={labels.editCell}
        undoLabel={labels.undoEdit}
      />
    ),
  }));
  return (
    <MobileTarget.Provider value={true}>
      <Card
        size="small"
        className={className}
        style={{
          ...style,
          // Ant Design's block card cannot use an intrinsic min-height to
          // override a fixed desktop row height. Keep that height as a floor.
          height: style?.height === undefined ? undefined : "auto",
          minHeight: style?.height ?? style?.minHeight,
        }}
        data-stagger=""
        data-selected={selected ? "" : undefined}
        data-dirty={rowIsDirty(editing, id) ? "" : undefined}
        {...rowClickProps(row, onRowClick, rowIndex)}
        onMouseEnter={prefetch ? () => prefetch(row) : undefined}
        title={
          (treeEntry ?? onToggleSelect) ? (
            <Space size="small">
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
                  checked={selected}
                  aria-label={labels.selectRow}
                  onChange={() => onToggleSelect(id)}
                />
              )}
            </Space>
          ) : undefined
        }
        extra={
          (onToggleExpand ?? actions ?? editing?.rowEditing) ? (
            <Space size="small" data-adapttable-part="card-actions">
              {onToggleExpand && (
                <OptionalExpandToggle
                  id={id}
                  expanded={Boolean(expanded)}
                  onToggle={onToggleExpand}
                  expandLabel={labels.expandRow}
                  collapseLabel={labels.collapseRow}
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
              {actions && (
                <RowActionButtons
                  minTargetSize={44}
                  row={row}
                  actions={actions}
                  confirm={confirm}
                  labels={labels}
                  layout={rowActionsLayout}
                  render={renderRowActions}
                />
              )}
            </Space>
          ) : undefined
        }
      >
        {renderCard ? (
          renderCard(row, { index: rowIndex, fields, selected, expanded })
        ) : (
          // The whole `Descriptions` goes, not just its items: a
          // `Descriptions.Item` only means anything inside one.
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))",
              gap: 12,
            }}
          >
            {fields.map(({ column, label, value }) => (
              <div
                key={column.key}
                style={{
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  gridColumn: label ? undefined : "1 / -1",
                  padding: label ? 8 : 0,
                  background: label ? token.colorFillQuaternary : undefined,
                  borderRadius: token.borderRadiusSM,
                }}
              >
                <CardDescriptions vertical>
                  <Descriptions.Item label={label}>
                    <div
                      data-adapttable-part="card-value"
                      data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
                      // The item's content box is a flex row; the value spans
                      // it, as a card field does in every other kit.
                      style={{ flex: "1 1 auto", minWidth: 0 }}
                    >
                      {value}
                    </div>
                  </Descriptions.Item>
                </CardDescriptions>
              </div>
            ))}
          </div>
        )}
        {rowReorder && (
          <OptionalRowReorderButtons
            reorder={rowReorder}
            labels={labels}
            localIndex={rowIndex}
            row={row}
            windowStart={windowStart}
            rowCount={rowCount}
          />
        )}
        {expanded && renderDetail ? (
          <div data-adapttable-part="card-detail" style={{ marginTop: 8 }}>
            {renderDetail(row)}
          </div>
        ) : null}
      </Card>
    </MobileTarget.Provider>
  );
}

/**
 * Mobile layout: one antd `Card` per row with an antd `Descriptions`
 * label/value list, an optional selection checkbox, an optional expandable
 * detail section, and row actions. Shown instead of the table on narrow
 * viewports so columns never get cramped. Each card is memoized on its own
 * inputs, so a toolbar re-render (e.g. a search keystroke) re-renders no
 * unchanged card.
 *
 * @typeParam TRow - The row type.
 */
export function MobileCards<TRow>(
  props: Readonly<{
    table: UseDataTableResult<TRow>;
    /** Class applied to every card (merged before `rowClassName`). */
    cardClassName?: string;
    rows: readonly TRow[];
    rowActions?: readonly RowAction<TRow>[];
    rowActionsLayout?: RowActionsLayout;
    renderRowActions?: RowActionsRenderer<TRow>;
    confirm: ConfirmHandler;
    getRowId: (row: TRow) => string;
    prefetch?: (row: TRow) => void;
    /** Row activation handler — see `BaseDataTableProps.onRowClick`. */
    onRowClick?: (row: TRow) => void;
    /** Conditional per-row class — see `BaseDataTableProps.rowClassName`. */
    rowClassName?: (row: TRow, index: number) => string | undefined;
    /**
     * Mark cells a patch just changed — `data-flash` on the card value. Omit
     * and nothing is marked.
     */
    isCellFlashing?: (rowId: string, columnKey: string) => boolean;
    /** Conditional per-row style — see `BaseDataTableProps.rowStyle`. */
    rowStyle?: RowStyle<TRow>;
    /** Per-row height — see `BaseDataTableProps.rowHeight`. */
    rowHeight?: number | ((row: TRow, index: number) => number);
    tableLabel?: string;
    /** Tighter card rhythm for the `"compact"` density. */
    compact?: boolean;
    /** Row-expansion state — present only when `renderRowDetail` is set. */
    expansion?: RowExpansionState;
    /** Detail-panel renderer — see `BaseDataTableProps.renderRowDetail`. */
    renderRowDetail?: (row: TRow) => ReactNode;
    /** Replace each card's body — see `BaseDataTableProps.renderCard`. */
    renderCard?: ReactMobileCardRenderer<TRow>;
    /** Footer summary builder — see `BaseDataTableProps.summaryRow`. */
    summaryRow?: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
    /** Opt-in editing bundle — omit and cells stay display-only. */
    editing?: EditableCellEditing<TRow>;
    /**
     * Opt-in grouping bundle — when set, cards iterate flat group/leaf entries
     * instead of the leaf-only virtual window.
     */
    /** Hierarchy, when the host declared one. */
    tree?: {
      entries: readonly TreeEntry<TRow>[];
      expansion: { toggle: (id: string) => void };
    };
    grouping?: {
      collapsed: { toggle: (key: string) => void };
      entries: readonly GroupedFlatEntry<TRow>[];
      /** Reveal the next page of groups, or of one group's rows. */
      showMore: (entry: {
        scope: "groups" | "rows";
        groupKey?: string;
      }) => void;
    };
    /**
     * Windowed entries to render — the virtual slice when virtualization is on,
     * `undefined` to render every source row (the non-windowed default).
     */
    rowEntries?: readonly VirtualTableRow<TRow>[];
    /** Spacer height (px) reserving the rows scrolled off the top. */
    paddingTop?: number;
    /** Spacer height (px) reserving the rows still below the window. */
    paddingBottom?: number;
    /** Card measurement callback for the virtual window. */
    measureElement?: (node: Element | null) => void;
    rowReorder?: RowReorderState<TRow>;
    windowStart?: number;
    /** Rows in the whole dataset, for the cards' `aria-setsize`. */
    cardSetSize?: number;
    pinnedTopRows?: readonly TRow[];
    pinnedBottomRows?: readonly TRow[];
    pinnedSummaryTop?: readonly TRow[];
    pinnedSummaryBottom?: readonly TRow[];
    extraRows?: readonly ExtraRow[];
    /** Present when `extraRows()` composed the splice. Absent on a plain table. */
    assembly?: Partial<AssemblyFns<TRow>>;
    /** Attach the virtualizer to the card scroll region. */
    listRef?: (node: HTMLElement | null) => void;
    /** Clip style when the host passed `maxHeight`. */
    listStyle?: CSSProperties;
  }>
) {
  // The compiler's cache around these slots is larger than the slots.
  "use no memo";
  const {
    table,
    cardClassName,
    rows,
    prefetch,
    tableLabel,
    compact = false,
    summaryRow,
    paddingTop = 0,
    paddingBottom = 0,
    measureElement,
    listRef,
    listStyle,
  } = props;
  const { labels, selection, columns } = table;

  const CardItem = useMemo(
    () =>
      memo(
        CardItemBase<TRow>,
        mobileCardPropsEqual<TRow, CardItemProps<TRow>>(["prefetch"])
      ),
    []
  );

  const toGroupRow = (
    entry: Extract<
      GroupedFlatEntry<TRow>,
      { kind: "group" | "groupFooter" | "groupMore" }
    >
  ): AdaptTableGroupRow => ({
    [ADAPTTABLE_GROUP]: true,
    key: entry.key,
    label: entry.label,
    level: entry.level,
    footer: entry.kind === "groupFooter",
    more:
      entry.kind === "groupMore"
        ? {
            scope: entry.scope,
            groupKey: entry.groupKey,
            remaining: entry.remaining,
          }
        : undefined,
    count:
      (entry.kind === "group" ? entry.serverCount : undefined) ??
      entry.leafIds.length,
    leafIds: entry.leafIds,
    aggregateCells:
      entry.kind === "groupMore"
        ? undefined
        : (entry.aggregateCells as Partial<Record<string, ReactNode>>),
    aggregateOps: entry.kind === "groupMore" ? undefined : entry.aggregateOps,
    collapsed: entry.kind === "group" && entry.collapsed,
  });

  const cards = mobileCardSlots(props, {
    card: (entry) => {
      const { body, itemProps } = entry;
      return {
        key: entry.key,
        props: {
          ref: measureElement,
          "data-index": entry.index,
          "aria-posinset": itemProps["aria-posinset"],
          "aria-setsize": itemProps["aria-setsize"],
          "data-adapttable-part": itemProps["data-adapttable-part"],
          "aria-label": itemProps["aria-label"],
          style: treeCardStyle(body.treeEntry?.level ?? 0),
        },
        content: (
          <CardItem
            {...body}
            className={
              [cardClassName, entry.rowClass].filter(Boolean).join(" ") ||
              undefined
            }
            prefetch={prefetch}
          />
        ),
      };
    },
    extraProps: (kind) => ({
      role: kind === "separator" ? "separator" : undefined,
    }),
    extraCell: (part, content) => (
      <div data-adapttable-part={part}>{content}</div>
    ),
    groupProps: { ref: measureElement, "data-adapttable-part": undefined },
    groupCard: (entry, grouping) => (
      <OptionalGroupHeaderCard
        group={toGroupRow(entry)}
        labels={labels}
        onToggle={() => grouping.collapsed.toggle(entry.key)}
        selection={selection ?? undefined}
        onShowMore={grouping.showMore}
        aggregateNodes={
          entry.kind !== "groupMore" && entry.aggregateCells
            ? groupAggregateEntries<TRow, ColumnDef<TRow>>(
                columns,
                entry.aggregateCells,
                entry.aggregateOps
              ).map(({ column, node }) => (
                <Space key={column.key} size="small">
                  <Typography.Text type="secondary">
                    {resolveMobileLabel(column)}
                  </Typography.Text>
                  <Typography.Text
                    data-column={column.key}
                    data-adapttable-part="group-aggregate"
                  >
                    {node as ReactNode}
                  </Typography.Text>
                </Space>
              ))
            : undefined
        }
      />
    ),
  });
  if (summaryRow) {
    cards.push({
      key: "summary",
      props: { "data-passthrough": "" },
      content: (
        <li>
          <SummaryCard rows={rows} columns={columns} summaryRow={summaryRow} />
        </li>
      ),
    });
  }

  return (
    <MobileCardsChrome
      regionProps={mobileCardRegionProps(
        tableLabel,
        labels.table,
        listStyle?.maxHeight
      )}
      scrollRef={listRef}
      style={listStyle}
      hosts={{ Card: AntdMobileCardHost }}
      listProps={{ "aria-label": tableLabel }}
      listStyle={{
        listStyle: "none",
        display: "flex",
        flexDirection: "column",
        gap: compact ? 4 : 8,
      }}
      paddingTop={paddingTop}
      paddingBottom={paddingBottom}
      cards={cards}
    />
  );
}
