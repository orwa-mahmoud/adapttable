import type { Direction, UseColumnLayoutResult } from "@adapttable/core";
import {
  ACTIONS_COLUMN_KEY,
  columnMenuActions,
  columnMenuRows,
  columnReorderKeyProps,
  filterColumnMenuRows,
  hideAllColumns,
  REORDER_COLUMN_KEY,
  showAllColumns,
  unpinAllColumns,
  useColumnDragState,
} from "@adapttable/core";
import type {
  ColumnMenuChromeProps,
  ColumnMenuLabels,
  ColumnMenuRow,
} from "@adapttable/core/adapter";
import { nextPinSide, pinActionLabel } from "@adapttable/core/adapter";
import { useState } from "react";
import { Button, Dropdown, Form } from "react-bootstrap";

export interface ColumnMenuProps<TRow> extends ColumnMenuChromeProps<TRow> {
  labels: ColumnMenuLabels & { actions: string; reorderRow: string };
  hasRowActions?: boolean;
  hasRowReorder?: boolean;
  onAutoSize: () => void;
  onAutoSizeColumn?: (key: string) => void;
  onSortColumn?: (key: string, dir: "asc" | "desc") => void;
  onFilterColumn?: (key: string) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  dir?: Direction;
}

function ColumnMenuRowItem<TRow>({
  row,
  layout,
  labels,
  drag,
  sortBy,
  sortDir,
  onSortColumn,
  onAutoSizeColumn,
  onFilterColumn,
}: Readonly<{
  row: ColumnMenuRow<TRow>;
  layout: UseColumnLayoutResult<TRow>;
  labels: ColumnMenuLabels;
  drag: ReturnType<typeof useColumnDragState>;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSortColumn?: (key: string, dir: "asc" | "desc") => void;
  onAutoSizeColumn?: (key: string) => void;
  onFilterColumn?: (key: string) => void;
}>) {
  const { key, name, hidden, pinned, index, canMove, canHide, canPin } = row;
  const [open, setOpen] = useState(false);

  const actions = columnMenuActions(row, {
    labels,
    layout,
    sortBy,
    sortDir,
    onSortColumn,
    onAutoSizeColumn,
    onFilterColumn,
  });

  const dragProps = canMove
    ? {
        ...drag.rowDragProps(key, index),
        ...drag.dropProps(index, layout.move),
        ...drag.rowAttrs(key, index),
      }
    : {};

  return (
    <div
      data-adapttable-part="column-menu-item"
      data-hidden={hidden || undefined}
      data-pinned={pinned}
    >
      <div className="d-flex align-items-center gap-1 py-1" {...dragProps}>
        <Button
          size="sm"
          variant="light"
          disabled={!canMove}
          {...(canMove
            ? columnReorderKeyProps(
                key,
                index,
                layout.move,
                `${labels.moveStart} / ${labels.moveEnd}: ${name}`
              )
            : {})}
        >
          ⋮⋮
        </Button>
        <Button
          size="sm"
          variant="link"
          className="text-decoration-none"
          aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
          aria-pressed={!hidden}
          disabled={!canHide}
          onClick={() => layout.toggleVisible(key)}
        >
          {hidden ? "○" : "●"}
        </Button>
        <span
          className={`flex-grow-1 ${hidden ? "text-muted text-decoration-line-through" : ""}`}
        >
          {name}
        </span>
        <Button
          size="sm"
          variant={pinned ? "secondary" : "light"}
          aria-label={`${pinActionLabel(pinned, labels)}: ${name}`}
          disabled={!canPin}
          onClick={() => layout.setPinned(key, nextPinSide(pinned))}
        >
          📌
        </Button>
        <Button
          size="sm"
          variant="light"
          aria-expanded={open}
          aria-label={`${labels.columnActions}: ${name}`}
          onClick={() => setOpen((v) => !v)}
        >
          ⋯
        </Button>
      </div>

      {open && (
        <div
          className="d-flex flex-column ms-4 mb-1"
          data-adapttable-part="column-menu-submenu"
        >
          {actions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant="link"
              className="text-start text-decoration-none"
              data-adapttable-part="column-menu-action"
              disabled={action.disabled}
              onClick={() => {
                action.run();
                setOpen(false);
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function getReservedPinLabel(
  pinned: boolean,
  pinSide: "start" | "end",
  labels: ColumnMenuLabels
): string {
  if (pinned) {
    return labels.unpin;
  }
  if (pinSide === "end") {
    return labels.pinEnd;
  }
  return labels.pinStart;
}

function ReservedColumnRow({
  hidden,
  pinned,
  name,
  labels,
  pinSide,
  onToggle,
  onPin,
}: Readonly<{
  hidden: boolean;
  pinned: boolean;
  name: string;
  labels: ColumnMenuLabels;
  pinSide: "start" | "end";
  onToggle: () => void;
  onPin: () => void;
}>) {
  const pinLabel = getReservedPinLabel(pinned, pinSide, labels);

  return (
    <div
      className="d-flex align-items-center gap-1 py-1"
      data-adapttable-part="column-menu-item"
    >
      <Button
        size="sm"
        variant="link"
        aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
        aria-pressed={!hidden}
        onClick={onToggle}
      >
        {hidden ? "○" : "●"}
      </Button>
      <span
        className={`flex-grow-1 ${hidden ? "text-muted text-decoration-line-through" : ""}`}
      >
        {name}
      </span>
      <Button
        size="sm"
        variant={pinned ? "secondary" : "light"}
        aria-label={`${pinLabel}: ${name}`}
        onClick={onPin}
      >
        📌
      </Button>
    </div>
  );
}

export function ColumnMenu<TRow>({
  allColumns,
  layout,
  labels,
  hasRowActions = false,
  hasRowReorder = false,
  onAutoSize,
  onAutoSizeColumn,
  onSortColumn,
  onFilterColumn,
  sortBy,
  sortDir,
  dir,
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const [query, setQuery] = useState("");
  const rows = filterColumnMenuRows(columnMenuRows(allColumns, layout), query);

  const actionsHidden = layout.isHidden(ACTIONS_COLUMN_KEY);
  const actionsPinned = layout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  const reorderHidden = layout.isHidden(REORDER_COLUMN_KEY);
  const reorderPinned = layout.state.pinned[REORDER_COLUMN_KEY] !== undefined;

  return (
    <Dropdown align="end" dir={dir}>
      <Dropdown.Toggle
        size="sm"
        variant="outline-secondary"
        data-adapttable-part="column-menu-button"
      >
        {labels.columns}
      </Dropdown.Toggle>

      <Dropdown.Menu className="p-2" style={{ minWidth: 260 }}>
        <div className="small fw-semibold text-uppercase text-muted px-1 pb-1">
          {labels.columns}
        </div>

        <Form.Control
          type="search"
          size="sm"
          className="mb-2"
          data-adapttable-part="column-menu-search"
          placeholder={labels.searchColumns}
          aria-label={labels.searchColumns}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div
          className="d-flex gap-1 mb-2"
          data-adapttable-part="column-menu-bulk"
        >
          <Button
            size="sm"
            variant="link"
            onClick={() => showAllColumns(rows, layout)}
          >
            {labels.showAllColumns}
          </Button>
          <Button
            size="sm"
            variant="link"
            onClick={() => hideAllColumns(rows, layout)}
          >
            {labels.hideAllColumns}
          </Button>
          <Button
            size="sm"
            variant="link"
            onClick={() => unpinAllColumns(rows, layout)}
          >
            {labels.unpinAllColumns}
          </Button>
        </div>

        {rows.map((row) => (
          <ColumnMenuRowItem
            key={row.key}
            row={row}
            layout={layout}
            labels={labels}
            drag={drag}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortColumn={onSortColumn}
            onAutoSizeColumn={onAutoSizeColumn}
            onFilterColumn={onFilterColumn}
          />
        ))}

        {(hasRowReorder || hasRowActions) && <Dropdown.Divider />}

        {hasRowReorder && (
          <ReservedColumnRow
            hidden={reorderHidden}
            pinned={reorderPinned}
            name={labels.reorderRow}
            labels={labels}
            pinSide="start"
            onToggle={() => layout.toggleVisible(REORDER_COLUMN_KEY)}
            onPin={() =>
              layout.setPinned(
                REORDER_COLUMN_KEY,
                reorderPinned ? undefined : "start"
              )
            }
          />
        )}

        {hasRowActions && (
          <ReservedColumnRow
            hidden={actionsHidden}
            pinned={actionsPinned}
            name={labels.actions}
            labels={labels}
            pinSide="end"
            onToggle={() => layout.toggleVisible(ACTIONS_COLUMN_KEY)}
            onPin={() =>
              layout.setPinned(
                ACTIONS_COLUMN_KEY,
                actionsPinned ? undefined : "end"
              )
            }
          />
        )}

        <Dropdown.Divider />

        <Button size="sm" variant="link" onClick={onAutoSize}>
          {labels.autoSizeColumns}
        </Button>
        <Button size="sm" variant="link" onClick={() => layout.reset()}>
          {labels.resetColumns}
        </Button>
      </Dropdown.Menu>
    </Dropdown>
  );
}
