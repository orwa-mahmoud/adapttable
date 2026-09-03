/**
 * Base UI kit controls — TextField / Button / IconButton / Checkbox.
 * Same `data-adapttable-part` names the chrome and the e2e suite already use.
 */
import { filterLabel, useHeaderFilterOverlay } from "@adapttable/core";
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
} from "@adapttable/core/adapter";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { useEffect, useRef, useState } from "react";

import { FiltersIcon } from "../icons";
import { Button, IconButton, Text, TextField } from "../ui";
import { AutoFilterForm } from "./AutoFilterForm";
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
}: Readonly<FilterHeaderSelectProps>) {
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
}: Readonly<FilterHeaderMultiProps>) {
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
}: Readonly<FindSearchProps>) {
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
      size="1"
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
  className,
  dragProps,
  onKeyDown,
}: Readonly<RowReorderHandleSlotProps>) {
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

function RowMoveMenu({
  label,
  items,
  confirmation,
}: Readonly<RowMoveMenuSlotProps>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmationRef = useRef(confirmation);
  confirmationRef.current = confirmation;
  useEffect(() => {
    if (confirmation) setOpen(true);
  }, [confirmation]);

  const restoreTriggerFocus = () => {
    queueMicrotask(() => triggerRef.current?.focus());
  };
  const close = () => {
    setOpen(false);
    restoreTriggerFocus();
  };

  return (
    <span data-adapttable-part="row-move-menu">
      <Menu.Root
        open={open}
        onOpenChange={(next, eventDetails) => {
          if (
            !next &&
            confirmationRef.current &&
            (eventDetails.reason === "focus-out" ||
              eventDetails.reason === "item-press")
          ) {
            eventDetails.cancel();
            return;
          }
          if (!next) {
            confirmationRef.current?.onCancel();
            restoreTriggerFocus();
          }
          setOpen(next);
        }}
      >
        <Menu.Trigger
          render={
            <IconButton
              ref={triggerRef}
              type="button"
              size="1"
              variant="ghost"
              aria-label={label}
              data-adapttable-part="row-move-menu-trigger"
              onClick={(event) => event.stopPropagation()}
            >
              ⋮
            </IconButton>
          }
        />
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={4}>
            <Menu.Popup
              aria-label={label}
              finalFocus={triggerRef}
              data-adapttable-part="row-move-menu-content"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                minWidth: "12rem",
                padding: 8,
                background: "var(--at-surface, #fff)",
                border: "1px solid var(--at-border, #d0d7de)",
                borderRadius: 8,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {confirmation ? (
                <div
                  role="alertdialog"
                  aria-label={confirmation.title}
                  data-adapttable-part="row-move-confirmation"
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <Text weight="bold">{confirmation.title}</Text>
                  <Text>{confirmation.description}</Text>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <Button
                      type="button"
                      size="1"
                      variant="soft"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        confirmation.onCancel();
                        close();
                      }}
                    >
                      {confirmation.cancelLabel}
                    </Button>
                    <Button
                      type="button"
                      size="1"
                      variant="solid"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        confirmation.onConfirm();
                        close();
                      }}
                    >
                      {confirmation.confirmLabel}
                    </Button>
                  </div>
                </div>
              ) : (
                items.map((item) => (
                  <Menu.Item
                    key={item.id}
                    disabled={item.disabled}
                    closeOnClick={false}
                    title={item.disabledReason}
                    data-adapttable-part="row-move-menu-item"
                    style={{
                      height: "auto",
                      justifyContent: "flex-start",
                      textAlign: "start",
                      whiteSpace: "normal",
                    }}
                    onClick={() => {
                      item.onSelect();
                      setTimeout(() => {
                        if (!confirmationRef.current) close();
                      }, 0);
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}
                    >
                      <Text>{item.label}</Text>
                      {item.disabledReason ? (
                        <Text size="1" color="gray">
                          {item.disabledReason}
                        </Text>
                      ) : null}
                    </span>
                  </Menu.Item>
                ))
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
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

/** This kit's controls for the editable-cell gate. */
export const editableCellSlots: EditableCellSlots = {
  Activate: ActivateCell,
  Button: EditGateButton,
};
