/**
 * Base UI kit controls — TextField / Button / IconButton / Checkbox.
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
import { Popover } from "@base-ui/react/popover";

import { FiltersIcon } from "../icons";
import { Button, IconButton, TextField } from "../ui";
import { AutoFilterForm } from "./AutoFilterForm";
import { Checkbox, NativeSelect } from "./primitives";

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
    <TextField.Root
      size="1"
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      className={className}
      data-adapttable-part="filter-header-input"
      onChange={(event) => onChange(event.target.value)}
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
    <span className={className} style={{ display: "block", width: "100%" }}>
      <NativeSelect
        size="1"
        width="100%"
        aria-label={label}
        value={value}
        options={options}
        data-adapttable-part="filter-header-input"
        onValueChange={onChange}
      />
    </span>
  );
}

function HeaderRange({ label, type, value, onChange }: FilterHeaderRangeProps) {
  return (
    <TextField.Root
      size="1"
      type={type}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
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
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            type="button"
            size="1"
            variant="outline"
            aria-label={label}
            data-adapttable-part="filter-header-input"
            className={className}
            style={{ width: "100%", justifyContent: "space-between" }}
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
        }
      />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4}>
          <Popover.Popup
            className={menuClassName}
            data-adapttable-part="filter-header-menu"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 160,
              maxHeight: 220,
              overflow: "auto",
              padding: 8,
            }}
          >
            {options.map((option) => (
              <Checkbox
                key={option.value}
                size="1"
                checked={selected.includes(option.value)}
                onToggle={() =>
                  onToggle(option.value, !selected.includes(option.value))
                }
              >
                {option.label}
              </Checkbox>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
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

/** Funnel on the column header — the same field the Filters panel draws. */
export function FilterHeaderTrigger<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) {
  const active = hasActiveHeaderFilter(props);
  const { open, setOpen, source, sessionProps } = useHeaderFilterOverlay(
    props,
    { nestedSelector: "[role='listbox'],[data-base-ui-portal]" }
  );
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next, eventDetails) => {
        if (
          !next &&
          (eventDetails.reason === "outside-press" ||
            eventDetails.reason === "focus-out")
        ) {
          eventDetails.cancel();
          return;
        }
        setOpen(next);
      }}
    >
      <Popover.Trigger
        render={
          <IconButton
            {...sessionProps}
            type="button"
            size="1"
            variant={active ? "soft" : "ghost"}
            aria-label={filterLabel(props.def)}
            data-adapttable-part="filter-header-trigger"
            data-active={active ? "" : undefined}
          >
            <FiltersIcon size={14} />
          </IconButton>
        }
      />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4}>
          <Popover.Popup
            {...sessionProps}
            data-adapttable-part="filter-header-cell"
            style={{ minWidth: "20rem", padding: 8 }}
          >
            <AutoFilterForm
              defs={[props.def]}
              source={source}
              labels={props.labels}
              registry={props.registry}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
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
    <TextField.Root
      ref={focusRef}
      size="1"
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      data-adapttable-part="find-input"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      style={{ minWidth: "12em" }}
    />
  );
}

function FindButton({ label, part, kind, disabled, onClick }: FindButtonProps) {
  return (
    <IconButton
      type="button"
      size="1"
      variant="soft"
      data-adapttable-part={part}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {FIND_GLYPH[kind]}
    </IconButton>
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
    <Button
      type="button"
      size="1"
      variant="soft"
      data-adapttable-part={part}
      className={className}
      aria-label={label}
      onClick={onClick}
    >
      {label}
    </Button>
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
    <Button
      type="button"
      size="1"
      variant="soft"
      data-adapttable-part={part}
      className={className}
      onClick={onClick}
    >
      {label}
    </Button>
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
    <IconButton
      type="button"
      size="1"
      variant="ghost"
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
    <IconButton
      type="button"
      size="1"
      variant="ghost"
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

export function ColumnGroupToggle(props: Readonly<ColumnGroupToggleProps>) {
  return (
    <ColumnGroupToggleChrome {...props} slots={{ Button: GroupToggleButton }} />
  );
}

function MoreButton({ label, onClick }: GroupMoreButtonSlotProps) {
  return (
    <Button
      type="button"
      size="1"
      variant="ghost"
      data-adapttable-part="group-more"
      onClick={onClick}
    >
      {label}
    </Button>
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
    <IconButton
      type="button"
      size="1"
      variant="ghost"
      data-adapttable-part="row-reorder-handle"
      data-adapttable-grip=""
      data-dragging={dragging ? "" : undefined}
      className={className}
      aria-label={label}
      aria-pressed={pressed}
      style={{ cursor: pressed ? "grabbing" : "grab" }}
      {...dragProps}
      onKeyDown={onKeyDown}
    >
      <GripIcon />
    </IconButton>
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
    <IconButton
      type="button"
      size="1"
      variant="ghost"
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
      size="1"
      variant="soft"
      data-adapttable-part={part}
      className={className}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export const editableCellSlots: EditableCellSlots = {
  Activate: ActivateCell,
  Button: EditGateButton,
};
