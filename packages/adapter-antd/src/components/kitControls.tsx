/**
 * Ant Design kit controls — Input / Select / Button / Checkbox.
 * Same `data-adapttable-part` names the chrome and the e2e suite already use.
 */
import { filterLabel, useHeaderFilterOverlay } from "@adapttable/core";
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
  Button,
  Checkbox,
  Dropdown,
  Input,
  Popover,
  Select,
  Typography,
} from "antd";
import { type ReactNode, useEffect, useRef, useState } from "react";

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
    <Input
      size="small"
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
    <Select
      size="small"
      aria-label={label}
      value={value}
      className={className}
      data-adapttable-part="filter-header-input"
      onChange={onChange}
      getPopupContainer={(trigger: HTMLElement) => trigger.parentElement!}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      style={{ width: "100%" }}
    />
  );
}

function HeaderRange({ label, type, value, onChange }: FilterHeaderRangeProps) {
  return (
    <Input
      size="small"
      type={type}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

type HeaderMultiMenuProps = Pick<
  FilterHeaderMultiProps,
  "options" | "selected" | "menuClassName" | "onToggle"
>;

function HeaderMultiMenu({
  options,
  selected,
  menuClassName,
  onToggle,
}: Readonly<HeaderMultiMenuProps>) {
  return (
    <div
      data-adapttable-part="filter-header-menu"
      className={menuClassName}
      style={{
        maxHeight: 220,
        overflow: "auto",
        minWidth: 160,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: "var(--ant-color-bg-elevated, Canvas)",
        boxShadow: "var(--ant-box-shadow-secondary)",
        borderRadius: 8,
      }}
    >
      {options.map((option) => (
        <Checkbox
          key={option.value}
          checked={selected.includes(option.value)}
          onChange={(event) => onToggle(option.value, event.target.checked)}
        >
          {option.label}
        </Checkbox>
      ))}
    </div>
  );
}

function renderHeaderMultiMenu(
  props: Readonly<HeaderMultiMenuProps>,
  _origin: ReactNode
): ReactNode {
  return <HeaderMultiMenu {...props} />;
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
    <Dropdown
      trigger={["click"]}
      popupRender={renderHeaderMultiMenu.bind(null, {
        options,
        selected,
        menuClassName,
        onToggle,
      })}
    >
      <Button
        size="small"
        block
        aria-label={label}
        data-adapttable-part="filter-header-input"
        className={className}
      >
        <span
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
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
        </span>
      </Button>
    </Dropdown>
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
    {
      nestedSelector: ".ant-popover,.ant-select-dropdown,.ant-picker-dropdown",
    }
  );
  return (
    <Popover
      trigger={[]}
      open={open}
      placement="bottomLeft"
      destroyOnHidden
      content={
        <div
          {...sessionProps}
          data-adapttable-part="filter-header-cell"
          style={{ minWidth: "20rem" }}
        >
          <AutoFilterForm
            defs={[props.def]}
            source={source}
            labels={props.labels}
            registry={props.registry}
          />
        </div>
      }
    >
      <Button
        {...sessionProps}
        type={active ? "primary" : "text"}
        size="small"
        aria-label={filterLabel(props.def)}
        data-adapttable-part="filter-header-trigger"
        data-active={active ? "" : undefined}
        onClick={() => setOpen(!open)}
      >
        <FiltersIcon size={14} />
      </Button>
    </Popover>
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
      size="small"
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
    <Button
      type="default"
      size="small"
      data-adapttable-part={part}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {FIND_GLYPH[kind]}
    </Button>
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
      type="default"
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
}: Readonly<BatchEditButtonProps>) {
  return (
    <Button
      type="default"
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

function ApprovalButton({
  label,
  part,
  className,
  onClick,
}: Readonly<AgentApprovalButtonProps>) {
  return (
    <Button
      type="default"
      size="small"
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
    <Button
      type="text"
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
    </Button>
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
    <Button
      type="text"
      size="small"
      data-adapttable-part="column-group-toggle"
      aria-expanded={expanded}
      aria-label={label}
      className={className}
      onClick={onClick}
    >
      {expanded ? "▼" : "▶"}
    </Button>
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
      type="link"
      size="small"
      data-adapttable-part="group-more"
      // Group headers toggle on click; revealing more rows must not also
      // fold the group the reader is reading.
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
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
    <Button
      type="text"
      size="small"
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
    </Button>
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

  const content = (
    <div
      role={confirmation ? undefined : "menu"}
      aria-label={confirmation ? undefined : label}
      data-adapttable-part="row-move-menu-content"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: "12rem",
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          confirmationRef.current?.onCancel();
          close();
        }
      }}
    >
      {confirmation ? (
        <div
          role="alertdialog"
          aria-label={confirmation.title}
          data-adapttable-part="row-move-confirmation"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <Typography.Text strong>{confirmation.title}</Typography.Text>
          <Typography.Text>{confirmation.description}</Typography.Text>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              size="small"
              onClick={() => {
                confirmation.onCancel();
                close();
              }}
            >
              {confirmation.cancelLabel}
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={() => {
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
          <Button
            key={item.id}
            type="text"
            role="menuitem"
            block
            disabled={item.disabled}
            title={item.disabledReason}
            data-adapttable-part="row-move-menu-item"
            style={{ height: "auto", textAlign: "start", whiteSpace: "normal" }}
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
                width: "100%",
              }}
            >
              <Typography.Text>{item.label}</Typography.Text>
              {item.disabledReason ? (
                <Typography.Text type="secondary">
                  {item.disabledReason}
                </Typography.Text>
              ) : null}
            </span>
          </Button>
        ))
      )}
    </div>
  );

  return (
    <span data-adapttable-part="row-move-menu">
      <Popover
        open={open}
        trigger="click"
        placement="bottomLeft"
        content={content}
        onOpenChange={(next) => {
          if (!next) {
            confirmationRef.current?.onCancel();
            restoreTriggerFocus();
          }
          setOpen(next);
        }}
      >
        <Button
          ref={triggerRef}
          type="text"
          size="small"
          aria-label={label}
          data-adapttable-part="row-move-menu-trigger"
          onClick={(event) => event.stopPropagation()}
        >
          ⋮
        </Button>
      </Popover>
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
    <Button
      type="text"
      size="small"
      data-adapttable-part={part}
      aria-label={label}
      disabled={disabled}
      className={className}
      onClick={onClick}
    >
      {part === "row-reorder-up" ? "↑" : "↓"}
    </Button>
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
      type="default"
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
