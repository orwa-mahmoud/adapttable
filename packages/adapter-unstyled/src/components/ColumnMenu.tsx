import type { UseColumnLayoutResult } from "@adapttable/core";
import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  columnReorderKeyProps,
  useColumnDragState,
} from "@adapttable/core";
import type {
  ColumnDragState,
  ColumnMenuChromeProps,
  ColumnMenuLabels,
  ColumnMenuRow,
} from "@adapttable/core/adapter";
import {
  EyeIcon,
  GripIcon,
  nextPinSide,
  pinActionLabel,
  PinIcon,
} from "@adapttable/core/adapter";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import { MENU_PANEL_STYLE, useMenuPopover } from "./menuPopover";

/** Menu labels: the shared chrome contract plus the actions row's name. */
type ColumnMenuRowLabels = ColumnMenuLabels & { actions: string };

/** The eye toggle shared by data-column rows and the actions row. */
function VisibilityToggle({
  hidden,
  name,
  labels,
  classNames,
  onToggle,
}: Readonly<{
  hidden: boolean;
  name: string;
  labels: Pick<ColumnMenuLabels, "showColumn" | "hideColumn">;
  classNames: DataTableClassNames;
  onToggle: () => void;
}>) {
  return (
    <button
      type="button"
      data-adapttable-part="column-menu-visibility"
      data-active={!hidden || undefined}
      aria-pressed={!hidden}
      aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
      className={classNames.columnMenuVisibility}
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
}: Readonly<{
  active: boolean;
  /** What clicking will DO next (e.g. "Pin right: Actions"). */
  actionLabel: string;
  classNames: DataTableClassNames;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      data-adapttable-part="column-menu-pin"
      data-active={active || undefined}
      aria-pressed={active}
      aria-label={actionLabel}
      className={classNames.columnMenuPin}
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
}

function ColumnMenuRowItem<TRow>({
  row,
  layout,
  labels,
  classNames,
  drag,
}: Readonly<ColumnMenuRowProps<TRow>>) {
  const { key, name, hidden, pinned, index } = row;
  return (
    <div
      data-adapttable-part="column-menu-item"
      data-hidden={hidden || undefined}
      data-pinned={pinned}
      className={classNames.columnMenuItem}
      style={{ cursor: "grab" }}
      {...drag.rowDragProps(key, index)}
      {...drag.dropProps(index, layout.move)}
      {...drag.rowAttrs(key, index)}
    >
      <span
        data-adapttable-part="column-menu-grip"
        className={classNames.columnMenuGrip}
        {...columnReorderKeyProps(
          key,
          index,
          layout.move,
          `${labels.moveStart} / ${labels.moveEnd}: ${name}`
        )}
      >
        <GripIcon />
      </span>
      <VisibilityToggle
        hidden={hidden}
        name={name}
        labels={labels}
        classNames={classNames}
        onToggle={() => layout.toggleVisible(key)}
      />
      <RowName hidden={hidden} name={name} classNames={classNames} />
      <PinToggle
        active={pinned !== undefined}
        actionLabel={`${pinActionLabel(pinned, labels)}: ${name}`}
        classNames={classNames}
        onClick={() => layout.setPinned(key, nextPinSide(pinned))}
      />
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
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const { open, setOpen, rootRef, triggerRef } = useMenuPopover();

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
      {open && (
        <fieldset
          aria-label={labels.columns}
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
          {columnMenuRows(allColumns, layout).map((row) => (
            <ColumnMenuRowItem
              key={row.key}
              row={row}
              layout={layout}
              labels={labels}
              classNames={classNames}
              drag={drag}
            />
          ))}
          {hasRowActions && (
            <>
              <hr
                data-adapttable-part="column-menu-separator"
                className={classNames.columnMenuSeparator}
              />
              <ActionsMenuRowItem
                layout={layout}
                labels={labels}
                classNames={classNames}
              />
            </>
          )}
          <button
            type="button"
            data-adapttable-part="column-menu-reset"
            className={cx(classNames.columnMenuReset)}
            onClick={() => layout.reset()}
          >
            {labels.resetColumns}
          </button>
        </fieldset>
      )}
    </div>
  );
}
