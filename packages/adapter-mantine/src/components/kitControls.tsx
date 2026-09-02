/**
 * Mantine kit controls — TextInput / NativeSelect / Button / ActionIcon / Checkbox.
 * Same `data-adapttable-part` names the chrome and the e2e suite already use.
 */
import {
  filterLabel,
  type TableSource,
  useHeaderFilterOverlay,
} from "@adapttable/core";
import {
  AgentApprovalChrome,
  type AgentApprovalButtonProps,
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
} from "@adapttable/core/adapter";
import {
  ActionIcon,
  Button,
  Checkbox,
  Menu,
  NativeSelect,
  Paper,
  Popover,
  Portal,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useRef, useState } from "react";

import { FiltersIcon } from "../icons";
import { AutoFilterForm } from "./AutoFilterForm";

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
    <TextInput
      size="xs"
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      className={className}
      data-adapttable-part="filter-header-input"
      onChange={(event) => onChange(event.currentTarget.value)}
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
    <NativeSelect
      size="xs"
      aria-label={label}
      value={value}
      className={className}
      data-adapttable-part="filter-header-input"
      onChange={(event) => onChange(event.currentTarget.value)}
      data={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
    />
  );
}

function HeaderRange({ label, type, value, onChange }: FilterHeaderRangeProps) {
  return (
    <TextInput
      size="xs"
      type={type}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
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
    <Popover withinPortal position="bottom-start" shadow="sm">
      <Popover.Target>
        <Button
          type="button"
          size="compact-xs"
          variant="default"
          fullWidth
          aria-label={label}
          data-adapttable-part="filter-header-input"
          className={className}
          justify="space-between"
          styles={{ label: { minWidth: 0, width: "100%" } }}
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
      </Popover.Target>
      <Popover.Dropdown
        data-adapttable-part="filter-header-menu"
        className={menuClassName}
        p="xs"
      >
        <Stack gap={6} mah={220} style={{ overflow: "auto" }}>
          {options.map((option) => (
            <Checkbox
              key={option.value}
              size="xs"
              label={option.label}
              checked={selected.includes(option.value)}
              onChange={(event) =>
                onToggle(option.value, event.currentTarget.checked)
              }
            />
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
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
  const { setOpen, source, sessionProps, resetKey } = useHeaderFilterOverlay(
    props,
    {
      nestedSelector: ".mantine-Popover-dropdown,.mantine-Combobox-dropdown",
    }
  );
  return (
    <span {...sessionProps} style={{ display: "inline-flex" }}>
      <Popover
        key={resetKey}
        onChange={setOpen}
        closeOnClickOutside={false}
        position="bottom-start"
        shadow="md"
      >
        <Popover.Target>
          <ActionIcon
            variant={active ? "light" : "subtle"}
            size="sm"
            aria-label={filterLabel(props.def)}
            data-adapttable-part="filter-header-trigger"
            data-active={active ? "" : undefined}
          >
            <FiltersIcon size={14} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown
          {...sessionProps}
          data-adapttable-part="filter-header-cell"
          p="sm"
          miw="20rem"
        >
          <AutoFilterForm
            defs={[props.def]}
            source={source as TableSource<TRow>}
            labels={props.labels}
            registry={props.registry}
          />
        </Popover.Dropdown>
      </Popover>
    </span>
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
    <TextInput
      ref={focusRef}
      size="xs"
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      data-adapttable-part="find-input"
      onChange={(event) => onChange(event.currentTarget.value)}
      onKeyDown={onKeyDown}
      style={{ minWidth: "12em" }}
    />
  );
}

function FindButton({ label, part, kind, disabled, onClick }: FindButtonProps) {
  return (
    <ActionIcon
      type="button"
      size="sm"
      variant="default"
      data-adapttable-part={part}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {FIND_GLYPH[kind]}
    </ActionIcon>
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
    <Button
      type="button"
      size="xs"
      variant="default"
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
}: Readonly<BatchEditButtonProps>) {
  return (
    <Button
      type="button"
      size="xs"
      variant="default"
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

function ApprovalButton({
  label,
  part,
  className,
  onClick,
}: Readonly<AgentApprovalButtonProps>) {
  return (
    <Button
      type="button"
      size="xs"
      variant="default"
      data-adapttable-part={part}
      className={className}
      onClick={onClick}
    >
      {label}
    </Button>
  );
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
        Approve: ApprovalButton,
        Reject: ApprovalButton,
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
    <ActionIcon
      type="button"
      size="sm"
      variant="subtle"
      color="gray"
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
    </ActionIcon>
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
    <ActionIcon
      type="button"
      size="sm"
      variant="subtle"
      color="gray"
      data-adapttable-part="column-group-toggle"
      aria-expanded={expanded}
      aria-label={label}
      className={className}
      onClick={onClick}
    >
      {expanded ? "▼" : "▶"}
    </ActionIcon>
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
      variant="subtle"
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
}: Readonly<RowReorderHandleSlotProps>) {
  return (
    <ActionIcon
      type="button"
      size="sm"
      variant="subtle"
      color="gray"
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
    </ActionIcon>
  );
}

export function RowMoveMenu({
  label,
  items,
  confirmation,
}: Readonly<RowMoveMenuSlotProps>) {
  const [opened, setOpened] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const setMenuOpen = (next: boolean) => {
    setOpened(next);
    if (!next) queueMicrotask(() => triggerRef.current?.focus());
  };
  const finish = (callback: () => void) => {
    callback();
    setOpened(false);
    queueMicrotask(() => triggerRef.current?.focus());
  };
  if (confirmation) {
    return (
      <>
        <span data-adapttable-part="row-move-menu">
          <ActionIcon
            ref={triggerRef}
            type="button"
            size="sm"
            variant="subtle"
            color="gray"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded="true"
            data-adapttable-part="row-move-menu-trigger"
          >
            ⋮
          </ActionIcon>
        </span>
        <Portal>
          <Paper
            shadow="md"
            p="sm"
            data-adapttable-part="row-move-menu-content"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              minWidth: "12rem",
              transform: "translate(-50%, -50%)",
              zIndex: 400,
            }}
          >
            <Stack
              gap="xs"
              role="alertdialog"
              aria-label={confirmation.title}
              data-adapttable-part="row-move-confirmation"
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                finish(confirmation.onCancel);
              }}
            >
              <Text fw={600} size="sm">
                {confirmation.title}
              </Text>
              <Text size="sm">{confirmation.description}</Text>
              <Button
                type="button"
                size="compact-xs"
                onClick={() => finish(confirmation.onConfirm)}
              >
                {confirmation.confirmLabel}
              </Button>
              <Button
                type="button"
                size="compact-xs"
                variant="default"
                onClick={() => finish(confirmation.onCancel)}
              >
                {confirmation.cancelLabel}
              </Button>
            </Stack>
          </Paper>
        </Portal>
      </>
    );
  }
  return (
    <span data-adapttable-part="row-move-menu">
      <Menu
        withinPortal
        position="bottom-start"
        shadow="sm"
        opened={opened}
        onChange={setMenuOpen}
        closeOnItemClick={false}
      >
        <Menu.Target>
          <ActionIcon
            ref={triggerRef}
            type="button"
            size="sm"
            variant="subtle"
            color="gray"
            aria-label={label}
            aria-haspopup="menu"
            aria-expanded={opened}
            data-adapttable-part="row-move-menu-trigger"
          >
            ⋮
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown
          aria-label={label}
          data-adapttable-part="row-move-menu-content"
          miw="12rem"
          p="xs"
        >
          {items.map((item) => (
            <Menu.Item
              key={item.id}
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
          ))}
        </Menu.Dropdown>
      </Menu>
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
    <ActionIcon
      type="button"
      size="sm"
      variant="subtle"
      color="gray"
      data-adapttable-part={part}
      aria-label={label}
      disabled={disabled}
      className={className}
      onClick={onClick}
    >
      {part === "row-reorder-up" ? "↑" : "↓"}
    </ActionIcon>
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
      variant="default"
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
