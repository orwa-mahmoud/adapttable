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
import { memo, useMemo } from "react";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
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

/** An unstyled card body: the list's inputs, plus its class hooks. */
interface MobileCardProps<TRow> extends MobileCardBodyProps<TRow> {
  classNames: DataTableClassNames;
  /** The card answers a click. */
  clickable: boolean;
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
  classNames,
  isCellFlashing,
  selected,
  expanded,
  onToggleSelect,
  onToggleExpand,
  renderDetail,
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
  // Built once and used by both paths, so a custom card shows the very same
  // value node the built-in would have — cell renderers and editors included.
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
          toggleClassName={classNames.treeToggle}
          spacerClassName={classNames.treeSpacer}
          entry={treeEntry}
          labels={labels}
          onToggle={onToggleTree ?? (() => undefined)}
        />
      )}
      {onToggleSelect && (
        <label
          style={{
            display: "inline-flex",
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            data-adapttable-part="checkbox"
            aria-label={labels.selectRow}
            checked={selected}
            onChange={() => onToggleSelect(id)}
            className={classNames.checkbox}
          />
        </label>
      )}
      {onToggleExpand && (
        <OptionalExpandToggle
          id={id}
          expanded={Boolean(expanded)}
          onToggle={onToggleExpand}
          expandLabel={labels.expandRow}
          collapseLabel={labels.collapseRow}
        />
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
            <div
              key={column.key}
              data-adapttable-part="card-row"
              style={{
                minWidth: 0,
                overflowWrap: "anywhere",
                gridColumn: label ? undefined : "1 / -1",
              }}
              className={classNames.cardRow}
            >
              {label && (
                <span
                  data-adapttable-part="card-label"
                  className={classNames.cardLabel}
                >
                  {label}
                </span>
              )}
              <span
                data-adapttable-part="card-value"
                data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
                className={classNames.cardValue}
              >
                {value}
              </span>
            </div>
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
          className={classNames.rowReorderButtons}
          upClassName={classNames.rowReorderUp}
          downClassName={classNames.rowReorderDown}
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
        <div
          data-adapttable-part="card-actions"
          className={classNames.cardActions}
        >
          <RowActionButtons
            minTargetSize={44}
            row={row}
            actions={rowEdit.actions}
            confirm={confirm}
            labels={labels}
            classNames={classNames}
            layout={rowActionsLayout}
            render={renderRowActions}
          />
        </div>
      )}
      {expanded && renderDetail && (
        <div
          data-adapttable-part="card-detail"
          className={classNames.cardDetail}
        >
          {renderDetail(row)}
        </div>
      )}
    </MobileTarget.Provider>
  );
}

/** Mobile card-list rendering. */
export function MobileCards<TRow>(props: Readonly<SharedProps<TRow>>) {
  // The compiler's cache around these slots is larger than the slots.
  "use no memo";
  const {
    table,
    rows,
    classNames,
    summaryRow,
    paddingTop = 0,
    paddingBottom = 0,
    maxHeight,
    virtualScrollRef,
  } = props;
  const { columns, selection, labels } = table;
  const summary = useSummaryCells(summaryRow, rows);

  // `memo` erases generics at module level, so the memoized card is
  // instantiated here (once — the identity is stable for the list's life).
  const CardItem = useMemo(
    () =>
      memo(
        MobileCardBase<TRow>,
        mobileCardPropsEqual<TRow, MobileCardProps<TRow>>([
          "classNames",
          "clickable",
        ])
      ),
    []
  );

  const cards = mobileCardSlots(props, {
    card: (entry) => {
      const clickable = entry.body.onRowClick !== undefined;
      return {
        key: entry.key,
        part: entry.body.part ?? "card",
        props: {
          ...entry.itemProps,
          // The native list item is already a list item.
          role: undefined,
          style: { display: "block", ...entry.itemProps.style },
          "data-clickable": clickable ? "" : undefined,
          className: cx(classNames.card, entry.rowClass),
        },
        content: (
          <CardItem
            {...entry.body}
            classNames={classNames}
            clickable={clickable}
          />
        ),
      };
    },
    extraProps: (kind) => ({
      role: kind === "separator" ? "separator" : undefined,
      className:
        kind === "separator"
          ? classNames.separatorRow
          : classNames.fullWidthRow,
      style: { display: "block" },
    }),
    extraCell: (part, content, kind) => (
      <div
        data-adapttable-part={part}
        className={
          kind === "separator"
            ? classNames.separatorCell
            : classNames.fullWidthCell
        }
      >
        {content}
      </div>
    ),
    groupProps: {
      "data-adapttable-part": undefined,
      className: undefined,
      style: { display: "block" },
    },
    groupCard: (entry, grouping) => (
      <OptionalGroupHeaderCard
        entry={entry}
        columns={columns}
        selection={selection}
        labels={labels}
        compact={false}
        onToggleCollapse={(key) => grouping.collapsed.toggle(key)}
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
      dir={table.getTableProps().dir}
      scrollRef={virtualScrollRef}
      classNames={classNames}
      style={mobileCardListStyle(maxHeight)}
      listProps={table.getTableProps({ role: undefined })}
      paddingTop={paddingTop}
      paddingBottom={paddingBottom}
      cards={cards}
      summary={
        summary ? (
          <li
            data-adapttable-part="summary-card"
            className={cx(classNames.card, classNames.summaryCard)}
            style={{ display: "block" }}
          >
            {columns.map((column) =>
              summary[column.key] == null ? null : (
                <div
                  key={column.key}
                  data-adapttable-part="card-row"
                  className={classNames.cardRow}
                >
                  {resolveMobileLabel(column) && (
                    <span
                      data-adapttable-part="card-label"
                      className={classNames.cardLabel}
                    >
                      {resolveMobileLabel(column)}
                    </span>
                  )}
                  <span
                    data-adapttable-part="card-value"
                    className={classNames.cardValue}
                  >
                    {summary[column.key]}
                  </span>
                </div>
              )
            )}
          </li>
        ) : undefined
      }
    />
  );
}
