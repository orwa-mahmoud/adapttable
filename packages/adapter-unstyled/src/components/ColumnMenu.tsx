import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  columnReorderKeyProps,
  type Direction,
  REORDER_COLUMN_KEY,
  useColumnDragState,
  type UseColumnLayoutResult,
} from "@adapttable/core";
import {
  type ColumnDragState,
  columnMenuActions,
  type ColumnMenuChromeProps,
  type ColumnMenuLabels,
  type ColumnMenuRow,
  EyeIcon,
  filterColumnMenuRows,
  GripIcon,
  hideAllColumns,
  nextPinSide,
  pinActionLabel,
  PinIcon,
  showAllColumns,
  unpinAllColumns,
  useFeatureHost,
} from "@adapttable/core/adapter";
import { useState } from "react";
import { createPortal } from "react-dom";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import { MENU_PANEL_STYLE, useMenuPopover } from "./menuPopover";

/** Menu labels: the shared chrome contract plus the actions row's name. */
type ColumnMenuRowLabels = ColumnMenuLabels & {
  actions: string;
  reorderRow: string;
};

/** The eye toggle shared by data-column rows and the actions row. */
function VisibilityToggle({
  hidden,
  name,
  labels,
  classNames,
  onToggle,
  disabled = false,
}: Readonly<{
  hidden: boolean;
  name: string;
  labels: Pick<ColumnMenuLabels, "showColumn" | "hideColumn">;
  classNames: DataTableClassNames;
  onToggle: () => void;
  disabled?: boolean;
}>) {
  return (
    <button
      type="button"
      data-adapttable-part="column-menu-visibility"
      data-active={!hidden || undefined}
      aria-pressed={!hidden}
      aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
      className={classNames.columnMenuVisibility}
      disabled={disabled}
      onClick={onToggle}
    >
      <EyeIcon off={hidden} />
    </button>
  );
}

/** The row's name caption, shared by data-column rows and the actions row. */
function RowName({
  hidden,
  name,
  classNames,
}: Readonly<{
  hidden: boolean;
  name: string;
  classNames: DataTableClassNames;
}>) {
  return (
    <span
      data-adapttable-part="column-menu-label"
      data-hidden={hidden || undefined}
      className={classNames.columnMenuLabel}
    >
      {name}
    </span>
  );
}

/** The pin toggle shared by data-column rows and the actions row. */
function PinToggle({
  active,
  actionLabel,
  classNames,
  onClick,
  disabled = false,
}: Readonly<{
  active: boolean;
  /** What clicking will DO next (e.g. "Pin right: Actions"). */
  actionLabel: string;
  classNames: DataTableClassNames;
  onClick: () => void;
  disabled?: boolean;
}>) {
  return (
    <button
      type="button"
      data-adapttable-part="column-menu-pin"
      data-active={active || undefined}
      aria-pressed={active}
      aria-label={actionLabel}
      className={classNames.columnMenuPin}
      disabled={disabled}
      onClick={onClick}
    >
      <PinIcon />
    </button>
  );
}

interface ColumnMenuRowProps<TRow> {
  row: ColumnMenuRow<TRow>;
  layout: UseColumnLayoutResult<TRow>;
  labels: ColumnMenuLabels;
  classNames: DataTableClassNames;
  drag: ColumnDragState;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSortColumn?: (key: string, dir: "asc" | "desc") => void;
  onAutoSizeColumn?: (key: string) => void;
  onFilterColumn?: (key: string) => void;
}

function ColumnMenuRowItem<TRow>({
  row,
  layout,
  labels,
  classNames,
  drag,
  sortBy,
  sortDir,
  onSortColumn,
  onAutoSizeColumn,
  onFilterColumn,
}: Readonly<ColumnMenuRowProps<TRow>>) {
  const { key, name, hidden, pinned, index, canMove, canHide, canPin } = row;
  const [open, setOpen] = useState(false);
  const featureHost = useFeatureHost<TRow>();
  const actions = columnMenuActions(row, {
    featureHost,
    labels,
    layout,
    sortBy,
    sortDir,
    onSortColumn,
    onAutoSizeColumn,
    onFilterColumn,
  });
  return (
    <div
      data-adapttable-part="column-menu-item"
      data-hidden={hidden || undefined}
      data-pinned={pinned}
      className={classNames.columnMenuItem}
      style={{ cursor: canMove ? "grab" : "default" }}
      {...(canMove
        ? {
            ...drag.rowDragProps(key, index),
            ...drag.dropProps(index, layout.move),
            ...drag.rowAttrs(key, index),
          }
        : {})}
    >
      <span
        data-adapttable-part="column-menu-grip"
        className={classNames.columnMenuGrip}
        aria-disabled={!canMove || undefined}
        {...(canMove
          ? columnReorderKeyProps(
              key,
              index,
              layout.move,
              `${labels.moveStart} / ${labels.moveEnd}: ${name}`
            )
          : {})}
      >
        <GripIcon />
      </span>
      <VisibilityToggle
        hidden={hidden}
        name={name}
        labels={labels}
        classNames={classNames}
        disabled={!canHide}
        onToggle={() => layout.toggleVisible(key)}
      />
      <RowName hidden={hidden} name={name} classNames={classNames} />
      <PinToggle
        active={pinned !== undefined}
        actionLabel={`${pinActionLabel(pinned, labels)}: ${name}`}
        classNames={classNames}
        disabled={!canPin}
        onClick={() => layout.setPinned(key, nextPinSide(pinned))}
      />
      <button
        type="button"
        data-adapttable-part="column-menu-more"
        aria-expanded={open}
        aria-label={`${labels.columnActions}: ${name}`}
        className={classNames.columnMenuMore}
        onClick={() => setOpen((value) => !value)}
      >
        ⋯
      </button>
      {open ? (
        <div
          data-adapttable-part="column-menu-submenu"
          className={classNames.columnMenuSubmenu}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              data-adapttable-part="column-menu-action"
              className={classNames.columnMenuAction}
              disabled={action.disabled}
              onClick={() => {
                action.run();
                setOpen(false);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface ActionsMenuRowProps<TRow> {
  layout: UseColumnLayoutResult<TRow>;
  labels: ColumnMenuRowLabels;
  classNames: DataTableClassNames;
}

/**
 * The injected row-actions column as a first-class menu row: the same eye
 * toggle as a data column plus a ONE-CLICK end-pin toggle (right ↔ unpinned).
 * The column always trails, so there is no left pin and no reorder grip.
 */
function ActionsMenuRowItem<TRow>({
  layout,
  labels,
  classNames,
}: Readonly<ActionsMenuRowProps<TRow>>) {
  const hidden = layout.isHidden(ACTIONS_COLUMN_KEY);
  const pinned = layout.state.pinned[ACTIONS_COLUMN_KEY] !== undefined;
  const name = labels.actions;
  return (
    <div
      data-adapttable-part="column-menu-item"
      data-actions=""
      data-hidden={hidden || undefined}
      data-pinned={pinned ? "end" : undefined}
      className={classNames.columnMenuItem}
    >
      <VisibilityToggle
        hidden={hidden}
        name={name}
        labels={labels}
        classNames={classNames}
        onToggle={() => layout.toggleVisible(ACTIONS_COLUMN_KEY)}
      />
      <RowName hidden={hidden} name={name} classNames={classNames} />
      <PinToggle
        active={pinned}
        actionLabel={`${pinned ? labels.unpin : labels.pinEnd}: ${name}`}
        classNames={classNames}
        onClick={() =>
          layout.setPinned(ACTIONS_COLUMN_KEY, pinned ? undefined : "end")
        }
      />
    </div>
  );
}

/**
 * The injected row-reorder column as a first-class menu row: the same eye
 * toggle as a data column plus a one-click start-pin toggle. The column
 * always leads, so there is no end pin and no reorder grip.
 */
function ReorderMenuRowItem<TRow>({
  layout,
  labels,
  classNames,
}: Readonly<ActionsMenuRowProps<TRow>>) {
  const hidden = layout.isHidden(REORDER_COLUMN_KEY);
  const pinned = layout.state.pinned[REORDER_COLUMN_KEY] !== undefined;
  const name = labels.reorderRow;
  return (
    <div
      data-adapttable-part="column-menu-item"
      data-reorder=""
      data-hidden={hidden || undefined}
      data-pinned={pinned ? "start" : undefined}
      className={classNames.columnMenuItem}
    >
      <VisibilityToggle
        hidden={hidden}
        name={name}
        labels={labels}
        classNames={classNames}
        onToggle={() => layout.toggleVisible(REORDER_COLUMN_KEY)}
      />
      <RowName hidden={hidden} name={name} classNames={classNames} />
      <PinToggle
        active={pinned}
        actionLabel={`${pinned ? labels.unpin : labels.pinStart}: ${name}`}
        classNames={classNames}
        onClick={() =>
          layout.setPinned(REORDER_COLUMN_KEY, pinned ? undefined : "start")
        }
      />
    </div>
  );
}

export interface ColumnMenuProps<TRow> extends ColumnMenuChromeProps<TRow> {
  classNames: DataTableClassNames;
  /** Resolved labels — the shared contract plus the actions row's name. */
  labels: ColumnMenuRowLabels;
  /**
   * Whether the table renders row actions. When true the menu lists the
   * injected actions column as a separated trailing row, so it hides and
   * end-pins like any data column.
   */
  hasRowActions?: boolean;
  /**
   * Whether the table renders a row-reorder column. When true the menu
   * lists it as a leading reserved row: hideable and start-pinnable.
   */
  hasRowReorder?: boolean;
  /** Size every rendered column to its content. */
  onAutoSize: () => void;
  /** Size one column to its content. */
  onAutoSizeColumn?: (key: string) => void;
  /** Sort one column from the submenu. */
  onSortColumn?: (key: string, dir: "asc" | "desc") => void;
  /** Open the filter UI from the submenu. */
  onFilterColumn?: (key: string) => void;
  /** Column key currently sorted by, if any. */
  sortBy?: string;
  /** Direction for `sortBy`. */
  sortDir?: "asc" | "desc";
  /**
   * Text direction. The panel portals to `document.body`, so it cannot
   * inherit `dir` from the table — without this, Arabic keeps LTR row
   * chrome (grip, eye, pin).
   */
  dir?: Direction;
}

/**
 * Column-management popover: a disclosure button + a panel where each column
 * has a drag grip (reorder), an eye toggle (show/hide), and a pin toggle.
 * Closes on outside-click or Escape. Ships no styles — target the
 * `data-adapttable-part` hooks or the `columnMenu*` className slots.
 */
export function ColumnMenu<TRow>({
  allColumns,
  layout,
  labels,
  classNames,
  hasRowActions,
  hasRowReorder,
  onAutoSize,
  onAutoSizeColumn,
  onSortColumn,
  onFilterColumn,
  sortBy,
  sortDir,
  dir,
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const { open, setOpen, rootRef, triggerRef, panelRef } = useMenuPopover();
  const [query, setQuery] = useState("");
  const rows = filterColumnMenuRows(columnMenuRows(allColumns, layout), query);

  return (
    <div
      ref={rootRef}
      data-adapttable-part="column-menu"
      className={classNames.columnMenu}
      style={{ position: "relative" }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        data-adapttable-part="column-menu-button"
        data-active={open || undefined}
        className={classNames.columnMenuButton}
        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
        onClick={() => setOpen((v) => !v)}
      >
        {labels.columns}
      </button>
      {open &&
        createPortal(
          <fieldset
            ref={panelRef}
            aria-label={labels.columns}
            dir={dir}
            data-adapttable-part="column-menu-panel"
            className={classNames.columnMenuPanel}
            style={MENU_PANEL_STYLE}
          >
            <div
              data-adapttable-part="column-menu-header"
              className={classNames.columnMenuHeader}
            >
              <span
                data-adapttable-part="column-menu-title"
                className={classNames.columnMenuTitle}
              >
                {labels.columns}
              </span>
            </div>
            <input
              type="search"
              data-adapttable-part="column-menu-search"
              className={classNames.columnMenuSearch}
              placeholder={labels.searchColumns}
              aria-label={labels.searchColumns}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div
              data-adapttable-part="column-menu-bulk"
              className={classNames.columnMenuBulk}
            >
              <button
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                className={classNames.columnMenuBulkButton}
                onClick={() => showAllColumns(rows, layout)}
              >
                {labels.showAllColumns}
              </button>
              <button
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                className={classNames.columnMenuBulkButton}
                onClick={() => hideAllColumns(rows, layout)}
              >
                {labels.hideAllColumns}
              </button>
              <button
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                className={classNames.columnMenuBulkButton}
                onClick={() => unpinAllColumns(rows, layout)}
              >
                {labels.unpinAllColumns}
              </button>
            </div>
            {rows.map((row) => (
              <ColumnMenuRowItem
                key={row.key}
                row={row}
                layout={layout}
                labels={labels}
                classNames={classNames}
                drag={drag}
                sortBy={sortBy}
                sortDir={sortDir}
                onSortColumn={onSortColumn}
                onAutoSizeColumn={onAutoSizeColumn}
                onFilterColumn={onFilterColumn}
              />
            ))}
            {(hasRowReorder === true || hasRowActions === true) && (
              <hr
                data-adapttable-part="column-menu-separator"
                className={classNames.columnMenuSeparator}
              />
            )}
            {hasRowReorder && (
              <ReorderMenuRowItem
                layout={layout}
                labels={labels}
                classNames={classNames}
              />
            )}
            {hasRowActions && (
              <ActionsMenuRowItem
                layout={layout}
                labels={labels}
                classNames={classNames}
              />
            )}
            <button
              type="button"
              data-adapttable-part="column-menu-auto-size"
              className={cx(classNames.columnMenuAutoSize)}
              onClick={onAutoSize}
            >
              {labels.autoSizeColumns}
            </button>
            <button
              type="button"
              data-adapttable-part="column-menu-reset"
              className={cx(classNames.columnMenuReset)}
              onClick={() => layout.reset()}
            >
              {labels.resetColumns}
            </button>
          </fieldset>,
          document.body
        )}
    </div>
  );
}
