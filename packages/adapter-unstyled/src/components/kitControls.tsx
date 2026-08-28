/**
 * Unstyled kit controls — native HTML is this adapter's kit.
 * Same `data-adapttable-part` names the chrome and the e2e suite already use.
 */
import {
  filterLabel,
  type TableSource,
  useHeaderFilterOverlay,
} from "@adapttable/core";
import {
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
} from "@adapttable/core/adapter";
import type { ChangeEvent } from "react";

import type { DataTableClassNames } from "../types";
import { AutoFilterForm } from "./AutoFilterForm";
import { FiltersIcon } from "./icons";

export type {
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
}: FilterHeaderSearchProps) {
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
}: FilterHeaderSelectProps) {
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
}: FilterHeaderMultiProps) {
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

export function FilterHeaderRow<TRow>(
  props: Readonly<FilterHeaderRowProps<TRow>>
) {
  return <FilterHeaderChrome {...props} slots={headerSlots} />;
}

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
}: FindSearchProps) {
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
}: RowEditButtonProps) {
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
}: BatchEditButtonProps) {
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

export function BatchEditBar<TRow>(props: Readonly<BatchEditBarProps<TRow>>) {
  return <BatchEditBarChrome {...props} slots={{ Button: BatchButton }} />;
}

function TreeButton({
  label,
  expanded,
  loading,
  className,
  onClick,
}: TreeToggleButtonProps) {
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

export function TreeToggle<TRow>(props: Readonly<TreeToggleProps<TRow>>) {
  return <TreeToggleChrome {...props} slots={treeSlots} />;
}

export function TreeCell<TRow>(props: Readonly<TreeCellProps<TRow>>) {
  return <TreeCellChrome {...props} slots={treeSlots} />;
}

function GroupToggleButton({
  label,
  expanded,
  className,
  onClick,
}: ColumnGroupToggleButtonProps) {
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

export function GroupMoreButton(props: Readonly<GroupMoreButtonProps>) {
  return <GroupMoreButtonChrome {...props} slots={{ Button: MoreButton }} />;
}

function ReorderHandle({
  label,
  pressed,
  dragging,
  className,
  dragProps,
  onKeyDown,
}: RowReorderHandleSlotProps) {
  return (
    <button
      type="button"
      data-adapttable-part="row-reorder-handle"
      data-adapttable-grip=""
      data-dragging={dragging ? "" : undefined}
      className={className}
      aria-label={label}
      aria-pressed={pressed}
      style={{ ...REORDER_BUTTON, cursor: pressed ? "grabbing" : "grab" }}
      {...dragProps}
      onKeyDown={onKeyDown}
    >
      <GripIcon />
    </button>
  );
}

export function RowReorderHandle<TRow>(
  props: Readonly<RowReorderHandleProps<TRow>>
) {
  return (
    <RowReorderHandleChrome {...props} slots={{ Handle: ReorderHandle }} />
  );
}

function ReorderMove({
  label,
  part,
  disabled,
  className,
  onClick,
}: RowReorderMoveButtonProps) {
  return (
    <button
      type="button"
      data-adapttable-part={part}
      aria-label={label}
      disabled={disabled}
      className={className}
      style={REORDER_BUTTON}
      onClick={onClick}
    >
      {part === "row-reorder-up" ? "↑" : "↓"}
    </button>
  );
}

export function RowReorderButtons<TRow>(
  props: Readonly<RowReorderButtonsProps<TRow>>
) {
  return <RowReorderButtonsChrome {...props} slots={{ Button: ReorderMove }} />;
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
}: EditableCellActivateProps) {
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
}: EditableCellButtonProps) {
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

export const editableCellSlots: EditableCellSlots = {
  Activate: ActivateCell,
  Button: EditGateButton,
};
