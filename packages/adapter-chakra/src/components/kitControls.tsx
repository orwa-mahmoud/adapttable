/**
 * Chakra kit controls — Input / NativeSelect / Button / IconButton / Checkbox.
 * Same `data-adapttable-part` names the chrome and the e2e suite already use.
 */
import { filterLabel } from "@adapttable/core";
import { useHeaderFilterOverlay } from "@adapttable/react";
import {
  type AgentApprovalButtonProps,
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
  restoreFocusSoon,
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
import {
  Button,
  IconButton,
  Input,
  Menu,
  Popover,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

import { FiltersIcon, iconForRowEditPart } from "../icons";
import { AutoFilterForm } from "./AutoFilterForm";
import { KitPortal } from "./kitPortal";
import { Checkbox, NativeSelect } from "./primitives";

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
}: Readonly<FilterHeaderSearchProps>) {
  return (
    <Input
      size="xs"
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
}: Readonly<FilterHeaderSelectProps>) {
  return (
    <span className={className} style={{ display: "block", width: "100%" }}>
      <NativeSelect
        size="xs"
        aria-label={label}
        value={value}
        data-adapttable-part="filter-header-input"
        w="100%"
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </span>
  );
}

function HeaderRange({ label, type, value, onChange }: FilterHeaderRangeProps) {
  return (
    <Input
      size="xs"
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
}: Readonly<FilterHeaderMultiProps>) {
  return (
    <Popover.Root positioning={{ placement: "bottom-start" }} lazyMount>
      <Popover.Trigger asChild>
        <Button
          type="button"
          size="xs"
          variant="outline"
          width="100%"
          justifyContent="space-between"
          aria-label={label}
          data-adapttable-part="filter-header-input"
          className={className}
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
      </Popover.Trigger>
      <KitPortal>
        <Popover.Positioner>
          <Popover.Content
            width="max-content"
            minWidth="160px"
            p={2}
            className={menuClassName}
            data-adapttable-part="filter-header-menu"
          >
            <Stack gap={1.5} maxH="220px" overflowY="auto">
              {options.map((option) => (
                <Checkbox
                  key={option.value}
                  size="sm"
                  checked={selected.includes(option.value)}
                  onToggle={() =>
                    onToggle(option.value, !selected.includes(option.value))
                  }
                >
                  {option.label}
                </Checkbox>
              ))}
            </Stack>
          </Popover.Content>
        </Popover.Positioner>
      </KitPortal>
    </Popover.Root>
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
  const { open, setOpen, source, sessionProps } = useHeaderFilterOverlay(props);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(event) => setOpen(event.open)}
      positioning={{ placement: "bottom-start" }}
      closeOnInteractOutside={false}
      lazyMount
    >
      <Popover.Trigger asChild>
        <IconButton
          {...sessionProps}
          type="button"
          size="xs"
          variant={active ? "solid" : "ghost"}
          aria-label={filterLabel(props.def)}
          data-adapttable-part="filter-header-trigger"
          data-active={active ? "" : undefined}
        >
          <FiltersIcon size={14} />
        </IconButton>
      </Popover.Trigger>
      <KitPortal>
        <Popover.Positioner>
          <Popover.Content
            {...sessionProps}
            width="max-content"
            minWidth="20rem"
            p={2}
            data-adapttable-part="filter-header-cell"
          >
            <AutoFilterForm
              defs={[props.def]}
              source={source}
              labels={props.labels}
              registry={props.registry}
            />
          </Popover.Content>
        </Popover.Positioner>
      </KitPortal>
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
}: Readonly<FindSearchProps>) {
  return (
    <Input
      ref={focusRef}
      size="xs"
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      data-adapttable-part="find-input"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      minW="12em"
    />
  );
}

function FindButton({ label, part, kind, disabled, onClick }: FindButtonProps) {
  return (
    <IconButton
      type="button"
      size="xs"
      variant="outline"
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
  icon,
  className,
  onClick,
}: Readonly<RowEditButtonProps>) {
  const glyph = iconForRowEditPart(part, icon);
  if (!glyph) {
    return (
      <Button
        type="button"
        size="xs"
        variant="outline"
        data-adapttable-part={part}
        className={className}
        aria-label={label}
        onClick={onClick}
      >
        {label}
      </Button>
    );
  }
  return (
    <IconButton
      type="button"
      size="xs"
      variant="ghost"
      data-adapttable-part={part}
      className={className}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {glyph}
    </IconButton>
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
    <Button
      type="button"
      size="xs"
      variant="outline"
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

function ApprovalList({
  part,
  label,
  className,
  children,
}: Readonly<AgentApprovalListProps>) {
  return (
    // A real list: its children are the proposed changes, one <li> each, and
    // the element carries that everywhere rather than only where ARIA does.
    <ul
      data-adapttable-part={part}
      aria-label={label}
      className={className}
      style={{ listStyle: "none", margin: 0, padding: 0 }}
    >
      {children}
    </ul>
  );
}

/**
 * Approve or reject a pending agent write.
 *
 * @public
 */
function ApprovalAction({
  label,
  part,
  className,
  onClick,
}: Readonly<AgentApprovalButtonProps>) {
  return (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      data-adapttable-part={part}
      className={className}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export function AgentApproval(props: Readonly<AgentApprovalProps>) {
  return (
    <AgentApprovalChrome
      {...props}
      slots={{
        Approve: BatchButton,
        Reject: BatchButton,
        List: ApprovalList,
        Action: ApprovalAction,
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
    <IconButton
      type="button"
      size="xs"
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
    <IconButton
      type="button"
      size="xs"
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
      size="xs"
      variant="ghost"
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
  disabled,
  className,
  dragProps,
  onKeyDown,
}: Readonly<RowReorderHandleSlotProps>) {
  return (
    <IconButton
      type="button"
      size="xs"
      variant="ghost"
      data-adapttable-part="row-reorder-handle"
      data-adapttable-grip=""
      data-dragging={dragging ? "" : undefined}
      className={className}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      cursor={pressed ? "grabbing" : "grab"}
      {...dragProps}
      onKeyDown={onKeyDown}
    >
      <GripIcon />
    </IconButton>
  );
}

function RowMoveMenu({
  label,
  items,
  confirmation,
}: Readonly<RowMoveMenuSlotProps>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hadConfirmationRef = useRef(false);
  useEffect(() => {
    const shouldOpen = Boolean(confirmation) && !hadConfirmationRef.current;
    hadConfirmationRef.current = Boolean(confirmation);
    if (shouldOpen) setOpen(true);
  }, [confirmation]);
  const setMenuOpen = (next: boolean) => {
    setOpen(next);
    if (!next) queueMicrotask(() => restoreFocusSoon(triggerRef.current));
  };
  const finish = (callback: () => void) => {
    callback();
    setMenuOpen(false);
  };
  return (
    <span data-adapttable-part="row-move-menu">
      <Menu.Root
        open={open}
        onOpenChange={(event) => setMenuOpen(event.open)}
        closeOnSelect={false}
        positioning={{ placement: "bottom-start" }}
      >
        <Menu.Trigger asChild>
          <IconButton
            ref={triggerRef}
            type="button"
            size="xs"
            variant="ghost"
            aria-label={label}
            aria-haspopup="menu"
            aria-expanded={open}
            data-adapttable-part="row-move-menu-trigger"
          >
            ⋮
          </IconButton>
        </Menu.Trigger>
        <KitPortal>
          <Menu.Positioner>
            <Menu.Content
              aria-label={label}
              data-adapttable-part="row-move-menu-content"
              minW="12rem"
              p={2}
            >
              {confirmation ? (
                <Stack
                  gap={2}
                  role="alertdialog"
                  aria-label={confirmation.title}
                  data-adapttable-part="row-move-confirmation"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.stopPropagation();
                      return;
                    }
                    if (event.key !== "Escape") return;
                    event.preventDefault();
                    finish(confirmation.onCancel);
                  }}
                >
                  <Text fontWeight="semibold" fontSize="sm">
                    {confirmation.title}
                  </Text>
                  <Text fontSize="sm">{confirmation.description}</Text>
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => finish(confirmation.onConfirm)}
                  >
                    {confirmation.confirmLabel}
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => finish(confirmation.onCancel)}
                  >
                    {confirmation.cancelLabel}
                  </Button>
                </Stack>
              ) : (
                items.map((item) => (
                  <Menu.Item
                    key={item.id}
                    value={item.id}
                    disabled={item.disabled}
                    title={item.disabledReason}
                    data-adapttable-part="row-move-menu-item"
                    onClick={item.onSelect}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      item.onSelect();
                    }}
                  >
                    {item.label}
                  </Menu.Item>
                ))
              )}
            </Menu.Content>
          </Menu.Positioner>
        </KitPortal>
      </Menu.Root>
    </span>
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
    <IconButton
      type="button"
      size="xs"
      minW="11"
      minH="11"
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
}: Readonly<EditableCellButtonProps>) {
  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
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
