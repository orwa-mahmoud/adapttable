/**
 * Unstyled kit controls — native HTML is this adapter's kit.
 * Same `data-adapttable-part` names the chrome and the e2e suite already use.
 */
import { filterLabel } from "@adapttable/core";
import type { TableSource } from "@adapttable/core";
import { useHeaderFilterOverlay } from "@adapttable/react";
import {
  AgentApprovalChrome,
  type AgentApprovalListProps,
  type AgentApprovalProps,
  BatchEditBarChrome,
  type BatchEditBarProps,
  type BatchEditButtonProps,
  type ColumnGroupToggleButtonProps,
  ColumnGroupToggleChrome,
  type ColumnGroupToggleProps,
  type EditableCellActivateProps,
  type EditableCellButtonProps,
  type EditableCellSlots,
  FilterHeaderChrome,
  FilterHeaderControlChrome,
  type FilterHeaderControlProps,
  type FilterHeaderMultiProps,
  type FilterHeaderRangeProps,
  type FilterHeaderRowProps,
  type FilterHeaderSearchProps,
  type FilterHeaderSelectProps,
  type FilterHeaderSlots,
  FindBarChrome,
  type FindBarProps,
  type FindButtonProps,
  type FindSearchProps,
  GripIcon,
  GroupMoreButtonChrome,
  type GroupMoreButtonProps,
  type GroupMoreButtonSlotProps,
  hasActiveHeaderFilter,
  RowEditActionsChrome,
  type RowEditActionsProps,
  type RowEditButtonProps,
  type RowMoveMenuSlotProps,
  RowReorderButtonsChrome,
  type RowReorderButtonsProps,
  RowReorderHandleChrome,
  type RowReorderHandleProps,
  type RowReorderHandleSlotProps,
  type RowReorderMoveButtonProps,
  TreeCellChrome,
  type TreeCellProps,
  type TreeToggleButtonProps,
  TreeToggleChrome,
  type TreeToggleProps,
  type TreeToggleSlots,
} from "@adapttable/react/adapter";
import { type ChangeEvent, useEffect, useRef } from "react";

import type { DataTableClassNames } from "../types";
import { AutoFilterForm } from "./AutoFilterForm";
import { FiltersIcon } from "./icons";

export type {
  AgentApprovalProps,
  BatchEditBarProps,
  ColumnGroupToggleProps,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
  FindBarProps,
  GroupMoreButtonProps,
  RowEditActionsProps,
  RowReorderButtonsProps,
  RowReorderHandleProps,
  TreeCellProps,
  TreeToggleProps,
};

const FIND_GLYPH: Record<string, string> = {
  previous: "↑",
  next: "↓",
  close: "✕",
};

const FIND_BUTTON: Record<string, string | number> = {
  border: "1px solid currentColor",
  borderRadius: "0.25em",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  lineHeight: 1,
  padding: "0.25em 0.5em",
};

const ICON_BUTTON = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "1.5em",
  height: "1.5em",
  flexShrink: 0,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
} as const;

const REORDER_BUTTON = {
  ...ICON_BUTTON,
  width: "1.75em",
  height: "1.75em",
  cursor: "grab",
} as const;

function HeaderSearch({
  label,
  placeholder,
  value,
  className,
  onChange,
}: Readonly<FilterHeaderSearchProps>) {
  return (
    <input
      type="search"
      value={value}
      aria-label={label}
      placeholder={placeholder}
      data-adapttable-part="filter-header-input"
      className={className}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
    />
  );
}

function HeaderSelect({
  label,
  value,
  options,
  className,
  onChange,
}: Readonly<FilterHeaderSelectProps>) {
  return (
    <select
      aria-label={label}
      value={value}
      data-adapttable-part="filter-header-input"
      className={className}
      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
        onChange(event.target.value)
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function HeaderRange({ label, type, value, onChange }: FilterHeaderRangeProps) {
  return (
    <input
      type={type}
      value={value}
      aria-label={label}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
    />
  );
}

function HeaderMulti({
  label,
  summary,
  options,
  selected,
  className,
  menuClassName,
  onToggle,
}: Readonly<FilterHeaderMultiProps>) {
  return (
    <details style={{ position: "relative", width: "100%" }}>
      <summary
        aria-label={label}
        data-adapttable-part="filter-header-input"
        className={className}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          boxSizing: "border-box",
          width: "100%",
          paddingBlock: 4,
          paddingInline: 8,
          border: "1px solid color-mix(in srgb, CanvasText 24%, Canvas)",
          borderRadius: 6,
          background: "Canvas",
          overflow: "hidden",
          listStyle: "none",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {summary}
        </span>
        <span aria-hidden>▾</span>
      </summary>
      <fieldset
        aria-label={label}
        data-adapttable-part="filter-header-menu"
        className={menuClassName}
        style={{
          position: "absolute",
          zIndex: 8,
          top: "100%",
          insetInlineStart: 0,
          minWidth: "100%",
          minInlineSize: 0,
          maxHeight: 220,
          overflow: "auto",
          margin: 0,
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: "Canvas",
          color: "CanvasText",
          border: "1px solid color-mix(in srgb, CanvasText 24%, Canvas)",
          borderRadius: 6,
          boxShadow: "0 8px 20px rgb(0 0 0 / 12%)",
        }}
      >
        {options.map((option) => (
          <label
            key={option.value}
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                onToggle(option.value, event.target.checked);
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    </details>
  );
}

const headerSlots: FilterHeaderSlots = {
  Search: HeaderSearch,
  Select: HeaderSelect,
  Range: HeaderRange,
  Multi: HeaderMulti,
};

/**
 * The filter row under the column headers, drawn with this kit's controls.
 *
 * @public
 */
export function FilterHeaderRow<TRow>(
  props: Readonly<FilterHeaderRowProps<TRow>>
) {
  return <FilterHeaderChrome {...props} slots={headerSlots} />;
}

/**
 * One column's header filter, drawn with this kit's controls.
 *
 * @public
 */
export function FilterHeaderControl<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) {
  return <FilterHeaderControlChrome {...props} slots={headerSlots} />;
}

/** Filters icon on the column header — the same field the Filters panel draws. */
export function FilterHeaderTrigger<TRow>(
  props: Readonly<
    FilterHeaderControlProps<TRow> & { classNames?: DataTableClassNames }
  >
) {
  const active = hasActiveHeaderFilter(props);
  const { open, setOpen, source, sessionProps, resetKey } =
    useHeaderFilterOverlay(props, { pointerDismiss: false });
  return (
    <details
      key={resetKey}
      {...sessionProps}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      data-adapttable-part="filter-header-trigger"
      className={props.className ?? props.classNames?.filterHeaderTrigger}
      style={{ position: "relative", display: "inline-block" }}
    >
      <summary
        aria-label={filterLabel(props.def)}
        data-active={active ? "" : undefined}
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          padding: 2,
        }}
      >
        <FiltersIcon size={14} />
      </summary>
      <div
        data-adapttable-part="filter-header-cell"
        className={props.classNames?.filterHeaderCell}
        style={{
          position: "absolute",
          zIndex: 3,
          insetInlineStart: 0,
          top: "100%",
          minWidth: "20rem",
          padding: "0.5rem",
          background: "Canvas",
          color: "CanvasText",
          border: "1px solid currentColor",
        }}
      >
        <AutoFilterForm
          defs={[props.def]}
          source={source as TableSource<TRow>}
          labels={props.labels}
          registry={props.registry}
          classNames={props.classNames}
        />
      </div>
    </details>
  );
}

function FindSearch({
  label,
  placeholder,
  value,
  focusRef,
  onChange,
  onKeyDown,
}: Readonly<FindSearchProps>) {
  return (
    <input
      ref={focusRef}
      type="search"
      data-adapttable-part="find-input"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
      onKeyDown={onKeyDown}
      style={{ font: "inherit", padding: "0.25em 0.5em", minWidth: "12em" }}
    />
  );
}

function FindButton({ label, part, kind, disabled, onClick }: FindButtonProps) {
  return (
    <button
      type="button"
      data-adapttable-part={part}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={FIND_BUTTON}
    >
      {FIND_GLYPH[kind]}
    </button>
  );
}

/**
 * The find bar, drawn with this kit's input and buttons.
 *
 * @public
 */
export function FindBar(props: Readonly<FindBarProps>) {
  return (
    <FindBarChrome
      {...props}
      slots={{ Search: FindSearch, Button: FindButton }}
    />
  );
}

function RowEditButton({
  label,
  part,
  className,
  onClick,
}: Readonly<RowEditButtonProps>) {
  return (
    <button
      type="button"
      data-adapttable-part={part}
      className={className}
      aria-label={label}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/**
 * Save and cancel for a row being edited.
 *
 * @public
 */
export function RowEditActions<TRow>(
  props: Readonly<RowEditActionsProps<TRow>>
) {
  return <RowEditActionsChrome {...props} slots={{ Button: RowEditButton }} />;
}

function BatchButton({
  label,
  part,
  className,
  onClick,
}: Readonly<BatchEditButtonProps>) {
  return (
    <button
      type="button"
      data-adapttable-part={part}
      className={className}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/**
 * The bar that saves or discards a batch of edits.
 *
 * @public
 */
export function BatchEditBar<TRow>(props: Readonly<BatchEditBarProps<TRow>>) {
  return <BatchEditBarChrome {...props} slots={{ Button: BatchButton }} />;
}

function ApprovalList({
  part,
  label,
  className,
  children,
}: Readonly<AgentApprovalListProps>) {
  return (
    <div data-adapttable-part={part} aria-label={label} className={className}>
      {children}
    </div>
  );
}

/**
 * Approve or reject a pending agent write.
 *
 * @public
 */
export function AgentApproval(props: Readonly<AgentApprovalProps>) {
  return (
    <AgentApprovalChrome
      {...props}
      slots={{
        Approve: BatchButton,
        Reject: BatchButton,
        List: ApprovalList,
      }}
    />
  );
}

function TreeButton({
  label,
  expanded,
  loading,
  className,
  onClick,
}: Readonly<TreeToggleButtonProps>) {
  return (
    <button
      type="button"
      data-adapttable-part="tree-toggle"
      className={className}
      aria-expanded={expanded}
      aria-label={label}
      data-loading={loading ? "" : undefined}
      aria-busy={loading ? true : undefined}
      onClick={onClick}
      style={ICON_BUTTON}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          transform: expanded ? "rotate(90deg)" : "none",
          transition: "transform 150ms ease",
        }}
      >
        ▸
      </span>
    </button>
  );
}

const treeSlots: TreeToggleSlots = { Button: TreeButton };

/**
 * The expand/collapse control on a tree row.
 *
 * @public
 */
export function TreeToggle<TRow>(props: Readonly<TreeToggleProps<TRow>>) {
  return <TreeToggleChrome {...props} slots={treeSlots} />;
}

/**
 * A tree row's first cell: indentation, toggle and content.
 *
 * @public
 */
export function TreeCell<TRow>(props: Readonly<TreeCellProps<TRow>>) {
  return <TreeCellChrome {...props} slots={treeSlots} />;
}

function GroupToggleButton({
  label,
  expanded,
  className,
  onClick,
}: Readonly<ColumnGroupToggleButtonProps>) {
  return (
    <button
      type="button"
      data-adapttable-part="column-group-toggle"
      aria-expanded={expanded}
      aria-label={label}
      className={className}
      style={{ ...ICON_BUTTON, marginInlineEnd: "0.25em" }}
      onClick={onClick}
    >
      {expanded ? "▼" : "▶"}
    </button>
  );
}

/**
 * The control that collapses a grouped column header.
 *
 * @public
 */
export function ColumnGroupToggle(props: Readonly<ColumnGroupToggleProps>) {
  return (
    <ColumnGroupToggleChrome {...props} slots={{ Button: GroupToggleButton }} />
  );
}

function MoreButton({ label, onClick }: GroupMoreButtonSlotProps) {
  return (
    <button
      type="button"
      data-adapttable-part="group-more"
      onClick={onClick}
      style={{
        font: "inherit",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textDecoration: "underline",
        color: "inherit",
      }}
    >
      {label}
    </button>
  );
}

/**
 * The control that reveals the rest of a truncated group.
 *
 * @public
 */
export function GroupMoreButton(props: Readonly<GroupMoreButtonProps>) {
  return <GroupMoreButtonChrome {...props} slots={{ Button: MoreButton }} />;
}

function ReorderHandle({
  label,
  pressed,
  dragging,
  disabled,
  className,
  dragProps,
  onKeyDown,
}: Readonly<RowReorderHandleSlotProps>) {
  return (
    <button
      type="button"
      data-adapttable-part="row-reorder-handle"
      data-adapttable-grip=""
      data-dragging={dragging ? "" : undefined}
      className={className}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      style={{ ...REORDER_BUTTON, cursor: pressed ? "grabbing" : "grab" }}
      {...dragProps}
      onKeyDown={onKeyDown}
    >
      <GripIcon />
    </button>
  );
}

function RowMoveMenu({
  label,
  items,
  confirmation,
}: Readonly<RowMoveMenuSlotProps>) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (confirmation && detailsRef.current) detailsRef.current.open = true;
  }, [confirmation]);
  const finish = (action: () => void) => {
    action();
    if (detailsRef.current) detailsRef.current.open = false;
    triggerRef.current?.focus();
  };
  return (
    <details
      ref={detailsRef}
      data-adapttable-part="row-move-menu"
      style={{ display: "inline-block", position: "relative" }}
    >
      <summary
        ref={triggerRef}
        aria-label={label}
        data-adapttable-part="row-move-menu-trigger"
        style={{ ...REORDER_BUTTON, cursor: "pointer", listStyle: "none" }}
      >
        ⋮
      </summary>
      <div
        role="menu"
        aria-label={label}
        data-adapttable-part="row-move-menu-content"
        style={{
          position: "absolute",
          zIndex: 20,
          insetInlineStart: 0,
          minWidth: "12rem",
          padding: "0.5rem",
          border: "1px solid currentColor",
          borderRadius: "0.375rem",
          background: "Canvas",
          color: "CanvasText",
        }}
      >
        {confirmation ? (
          <div
            role="alertdialog"
            aria-label={confirmation.title}
            data-adapttable-part="row-move-confirmation"
          >
            <strong>{confirmation.title}</strong>
            <p>{confirmation.description}</p>
            <button
              type="button"
              onClick={() => finish(confirmation.onConfirm)}
            >
              {confirmation.confirmLabel}
            </button>{" "}
            <button type="button" onClick={() => finish(confirmation.onCancel)}>
              {confirmation.cancelLabel}
            </button>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.disabledReason}
              data-adapttable-part="row-move-menu-item"
              style={{
                display: "block",
                width: "100%",
                minHeight: "2.75rem",
                textAlign: "start",
              }}
              onClick={item.onSelect}
            >
              {item.label}
            </button>
          ))
        )}
      </div>
    </details>
  );
}

/**
 * The drag handle for reordering a row.
 *
 * @public
 */
export function RowReorderHandle<TRow>(
  props: Readonly<RowReorderHandleProps<TRow>>
) {
  return (
    <RowReorderHandleChrome
      {...props}
      slots={{ Handle: ReorderHandle, Menu: RowMoveMenu }}
    />
  );
}

function ReorderMove({
  label,
  part,
  disabled,
  className,
  onClick,
}: Readonly<RowReorderMoveButtonProps>) {
  return (
    <button
      type="button"
      data-adapttable-part={part}
      aria-label={label}
      disabled={disabled}
      className={className}
      style={{ ...REORDER_BUTTON, minWidth: "2.75rem", minHeight: "2.75rem" }}
      onClick={onClick}
    >
      {part === "row-reorder-up" ? "↑" : "↓"}
    </button>
  );
}

/**
 * Keyboard-reachable move-up and move-down for a row.
 *
 * @public
 */
export function RowReorderButtons<TRow>(
  props: Readonly<RowReorderButtonsProps<TRow>>
) {
  return (
    <RowReorderButtonsChrome
      {...props}
      slots={{ Button: ReorderMove, Menu: RowMoveMenu }}
    />
  );
}

function ActivateCell({
  title,
  className,
  saveStatus,
  dirty,
  activateRef,
  display,
  onDoubleClick,
  onClick,
  onKeyDown,
}: Readonly<EditableCellActivateProps>) {
  return (
    <button
      ref={activateRef}
      type="button"
      title={title}
      className={className}
      data-save={saveStatus}
      data-dirty={dirty ? "" : undefined}
      aria-busy={saveStatus === "saving" ? true : undefined}
      data-adapttable-part="edit-cell-activate"
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={{
        all: "unset",
        boxSizing: "border-box",
        display: "block",
        width: "100%",
        height: "100%",
        minHeight: "1.25em",
        cursor: "text",
        textAlign: "inherit",
      }}
    >
      {display}
    </button>
  );
}

function EditGateButton({
  label,
  part,
  className,
  onMouseDown,
  onClick,
}: Readonly<EditableCellButtonProps>) {
  return (
    <button
      type="button"
      data-adapttable-part={part}
      className={className}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** This kit's controls for the editable-cell gate. */
export const editableCellSlots: EditableCellSlots = {
  Activate: ActivateCell,
  Button: EditGateButton,
};
