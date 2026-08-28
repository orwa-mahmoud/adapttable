/**
 * MUI kit controls — TextField / Button / IconButton / Checkbox.
 * Same `data-adapttable-part` names the chrome and the e2e suite already use.
 */
import { filterLabel, useHeaderFilterOverlay } from "@adapttable/core";
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
import {
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Popper,
  TextField,
} from "@mui/material";
import { useId, useRef, useState } from "react";

import { FiltersIcon } from "../icons";
import { AutoFilterForm } from "./AutoFilterForm";

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

const ACTIVATE_STYLE = {
  all: "unset",
  boxSizing: "border-box",
  display: "block",
  width: "100%",
  height: "100%",
  minHeight: "1.25em",
  cursor: "text",
  textAlign: "inherit",
} as const;

function HeaderSearch({
  label,
  placeholder,
  value,
  className,
  onChange,
}: FilterHeaderSearchProps) {
  return (
    <TextField
      size="small"
      type="search"
      hiddenLabel
      fullWidth
      value={value}
      placeholder={placeholder}
      className={className}
      onChange={(event) => onChange(event.target.value)}
      data-adapttable-part="filter-header-input"
      slotProps={{ htmlInput: { "aria-label": label } }}
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
    <TextField
      select
      size="small"
      hiddenLabel
      fullWidth
      value={value}
      className={className}
      onChange={(event) => onChange(event.target.value)}
      data-adapttable-part="filter-header-input"
      slotProps={{
        select: { native: false },
        htmlInput: { "aria-label": label },
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

function HeaderRange({ label, type, value, onChange }: FilterHeaderRangeProps) {
  return (
    <TextField
      size="small"
      hiddenLabel
      fullWidth
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{
        htmlInput: { "aria-label": label },
      }}
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
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const open = Boolean(anchor);
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        fullWidth
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-adapttable-part="filter-header-input"
        className={className}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{
          justifyContent: "space-between",
          textTransform: "none",
          minWidth: 0,
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
      </Button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: {
            className: menuClassName,
            sx: { maxHeight: 220, minWidth: 160, px: 1, py: 0.5 },
          },
        }}
      >
        <div data-adapttable-part="filter-header-menu">
          {options.map((option) => (
            <FormControlLabel
              key={option.value}
              label={option.label}
              sx={{ display: "flex", mx: 1 }}
              control={
                <Checkbox
                  size="small"
                  checked={selected.includes(option.value)}
                  onChange={(_, checked) => onToggle(option.value, checked)}
                />
              }
            />
          ))}
        </div>
      </Menu>
    </>
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

/** Funnel on the column header — the same field the Filters panel draws. */
export function FilterHeaderTrigger<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) {
  const active = hasActiveHeaderFilter(props);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { open, setOpen, source, sessionProps } = useHeaderFilterOverlay(
    props,
    {
      nestedSelector: "[role='listbox'],.MuiMenu-root,.MuiPopover-root",
    }
  );
  return (
    <>
      <IconButton
        {...sessionProps}
        ref={triggerRef}
        size="small"
        aria-label={filterLabel(props.def)}
        data-adapttable-part="filter-header-trigger"
        data-active={active ? "" : undefined}
        onClick={() => setOpen(!open)}
      >
        <FiltersIcon size={14} />
      </IconButton>
      <Popper
        open={open}
        anchorEl={triggerRef.current}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
      >
        <Paper
          {...sessionProps}
          elevation={8}
          data-adapttable-part="filter-header-cell"
          sx={{ minWidth: "20rem", p: 1 }}
        >
          <AutoFilterForm
            defs={[props.def]}
            source={source}
            labels={props.labels}
            registry={props.registry}
          />
        </Paper>
      </Popper>
    </>
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
    <TextField
      inputRef={focusRef}
      size="small"
      type="search"
      hiddenLabel
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      slotProps={{
        htmlInput: {
          "aria-label": label,
          "data-adapttable-part": "find-input",
        },
      }}
      sx={{ minWidth: "12em" }}
    />
  );
}

function FindButton({ label, part, kind, disabled, onClick }: FindButtonProps) {
  return (
    <IconButton
      type="button"
      size="small"
      data-adapttable-part={part}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {FIND_GLYPH[kind]}
    </IconButton>
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
}: RowEditButtonProps) {
  return (
    <Button
      type="button"
      size="small"
      data-adapttable-part={part}
      className={className}
      aria-label={label}
      onClick={onClick}
    >
      {label}
    </Button>
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
}: BatchEditButtonProps) {
  return (
    <Button
      type="button"
      size="small"
      data-adapttable-part={part}
      className={className}
      onClick={onClick}
    >
      {label}
    </Button>
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

function TreeButton({
  label,
  expanded,
  loading,
  className,
  onClick,
}: TreeToggleButtonProps) {
  return (
    <IconButton
      type="button"
      size="small"
      data-adapttable-part="tree-toggle"
      className={className}
      aria-expanded={expanded}
      aria-label={label}
      data-loading={loading ? "" : undefined}
      aria-busy={loading ? true : undefined}
      onClick={onClick}
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
    </IconButton>
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
}: ColumnGroupToggleButtonProps) {
  return (
    <IconButton
      type="button"
      size="small"
      data-adapttable-part="column-group-toggle"
      aria-expanded={expanded}
      aria-label={label}
      className={className}
      onClick={onClick}
    >
      {expanded ? "▼" : "▶"}
    </IconButton>
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
    <Button
      type="button"
      size="small"
      variant="text"
      data-adapttable-part="group-more"
      onClick={onClick}
    >
      {label}
    </Button>
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
  className,
  dragProps,
  onKeyDown,
}: RowReorderHandleSlotProps) {
  return (
    <IconButton
      type="button"
      size="small"
      data-adapttable-part="row-reorder-handle"
      data-adapttable-grip=""
      data-dragging={dragging ? "" : undefined}
      className={className}
      aria-label={label}
      aria-pressed={pressed}
      sx={{ cursor: pressed ? "grabbing" : "grab" }}
      {...dragProps}
      onKeyDown={onKeyDown}
    >
      <GripIcon />
    </IconButton>
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
    <IconButton
      type="button"
      size="small"
      data-adapttable-part={part}
      aria-label={label}
      disabled={disabled}
      className={className}
      onClick={onClick}
    >
      {part === "row-reorder-up" ? "↑" : "↓"}
    </IconButton>
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
      style={ACTIVATE_STYLE}
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
    <Button
      type="button"
      size="small"
      data-adapttable-part={part}
      className={className}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

/** This kit's controls for the editable-cell gate. */
export const editableCellSlots: EditableCellSlots = {
  Activate: ActivateCell,
  Button: EditGateButton,
};
