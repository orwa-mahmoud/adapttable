/**
 * Native slots for chrome unit tests. Not a product widget — not exported
 * from `@adapttable/core`. Recreates the markup the tests already assert.
 */
import type { ChangeEvent, ReactNode } from "react";

import type { TableAssistantSlots } from "../assistant/assistantSlots";
import type {
  ColumnGroupToggleButtonProps,
  ColumnGroupToggleSlots,
} from "../columns/ColumnGroupToggle";
import { GripIcon } from "../columns/icons";
import type {
  AgentApprovalListProps,
  AgentApprovalSlots,
} from "../editing/AgentApprovalChrome";
import type {
  EditableCellActivateProps,
  EditableCellButtonProps,
  EditableCellSlots,
} from "../editing/EditableCellGate";
import type {
  BatchEditBarSlots,
  BatchEditButtonProps,
  RowEditActionsSlots,
  RowEditButtonProps,
} from "../editing/RowEditGate";
import type {
  FilterHeaderMultiProps,
  FilterHeaderRangeProps,
  FilterHeaderSearchProps,
  FilterHeaderSelectProps,
  FilterHeaderSlots,
} from "../filters/FilterHeaderRow";
import type {
  FindBarSlots,
  FindButtonProps,
  FindSearchProps,
} from "../find/FindBar";
import type {
  GroupMoreButtonSlotProps,
  GroupMoreButtonSlots,
} from "../grouping/GroupMoreButton";
import type {
  RowMoveMenuSlotProps,
  RowReorderButtonsSlots,
  RowReorderHandleSlotProps,
  RowReorderHandleSlots,
  RowReorderMoveButtonProps,
} from "../rows/RowReorderHandle";
import type {
  TreeToggleButtonProps,
  TreeToggleSlots,
} from "../tree/TreeToggle";

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
    <details
      data-adapttable-part="filter-header-menu"
      className={menuClassName}
      style={{ position: "relative", width: "100%" }}
    >
      <summary
        aria-label={label}
        data-adapttable-part="filter-header-input"
        className={className}
        style={{
          cursor: "pointer",
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {summary}
      </summary>
      <fieldset
        aria-label={label}
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

export const filterHeaderTestSlots: FilterHeaderSlots = {
  Search: HeaderSearch,
  Select: HeaderSelect,
  Range: HeaderRange,
  Multi: HeaderMulti,
};

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

export const findBarTestSlots: FindBarSlots = {
  Search: FindSearch,
  Button: FindButton,
};

function RowEditButton({
  label,
  part,
  icon,
  className,
  onClick,
}: RowEditButtonProps) {
  // Stands in for a kit: a node is the glyph, `false` asks for text, and
  // nothing at all leaves the choice here — which is the label, since a test
  // slot has no glyphs of its own.
  const glyph = icon === false || icon === undefined ? undefined : icon;
  return (
    <button
      type="button"
      data-adapttable-part={part}
      data-icon={glyph === undefined ? undefined : ""}
      className={className}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {(glyph as ReactNode) ?? label}
    </button>
  );
}

export const rowEditTestSlots: RowEditActionsSlots = {
  Button: RowEditButton,
};

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

export const batchEditTestSlots: BatchEditBarSlots = {
  Button: BatchButton,
};

function ApprovalList({
  part,
  label,
  className,
  children,
}: AgentApprovalListProps) {
  return (
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

export const agentApprovalTestSlots: AgentApprovalSlots = {
  Approve: BatchButton,
  Reject: BatchButton,
  List: ApprovalList,
  Action: BatchButton,
};

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

export const editableCellTestSlots: EditableCellSlots = {
  Activate: ActivateCell,
  Button: EditGateButton,
};

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

export const treeToggleTestSlots: TreeToggleSlots = { Button: TreeButton };

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

export const columnGroupTestSlots: ColumnGroupToggleSlots = {
  Button: GroupToggleButton,
};

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

export const groupMoreTestSlots: GroupMoreButtonSlots = {
  Button: MoreButton,
};

function ReorderHandle({
  label,
  pressed,
  dragging,
  disabled,
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
      disabled={disabled}
      style={{ ...REORDER_BUTTON, cursor: pressed ? "grabbing" : "grab" }}
      {...dragProps}
      onKeyDown={onKeyDown}
    >
      <GripIcon />
    </button>
  );
}

function RowMoveMenu({ label, items, confirmation }: RowMoveMenuSlotProps) {
  return (
    <div aria-label={label}>
      {confirmation ? (
        <div role="alertdialog" aria-label={confirmation.title}>
          <p>{confirmation.description}</p>
          <button type="button" onClick={confirmation.onConfirm}>
            {confirmation.confirmLabel}
          </button>
          <button type="button" onClick={confirmation.onCancel}>
            {confirmation.cancelLabel}
          </button>
        </div>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            title={item.disabledReason}
            onClick={item.onSelect}
          >
            {item.label}
          </button>
        ))
      )}
    </div>
  );
}

export const rowReorderHandleTestSlots: RowReorderHandleSlots = {
  Handle: ReorderHandle,
  Menu: RowMoveMenu,
};

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

export const rowReorderButtonsTestSlots: RowReorderButtonsSlots = {
  Button: ReorderMove,
  Menu: RowMoveMenu,
};

/**
 * Plain-HTML assistant slots, for testing the chrome's own behaviour.
 *
 * A kit's real components are verified in that kit's own suite; what these
 * exercise is the structure, keyboard and announcements the chrome owns.
 */
export const tableAssistantTestSlots: TableAssistantSlots = {
  Window: ({ label, part, className, style, children }) => (
    <dialog
      open
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={style}
    >
      {children}
    </dialog>
  ),
  Suggestion: ({ title, description, icon, part, className, onClick }) => (
    <button
      type="button"
      data-adapttable-part={part}
      className={className}
      onClick={onClick}
    >
      {icon}
      <span>{title}</span>
      {description ? <span>{description}</span> : null}
    </button>
  ),
  Panel: ({ label, part, className, children }) => (
    <section
      aria-label={label}
      data-adapttable-part={part}
      className={className}
    >
      {children}
    </section>
  ),
  Sheet: ({ label, part, className, open, onClose, children }) =>
    open ? (
      <dialog
        open
        aria-modal="true"
        aria-label={label}
        data-adapttable-part={part}
        className={className}
      >
        {children}
        <button type="button" data-testid="sheet-backdrop" onClick={onClose}>
          {label}
        </button>
      </dialog>
    ) : null,
  Button: ({
    label,
    part,
    className,
    onClick,
    disabled,
    children,
    expanded,
    icon,
    iconOnly,
  }) => (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {iconOnly ? null : (children ?? label)}
    </button>
  ),
  Composer: ({
    label,
    placeholder,
    part,
    className,
    value,
    disabled,
    onChange,
    onKeyDown,
  }) => (
    <textarea
      aria-label={label}
      placeholder={placeholder}
      data-adapttable-part={part}
      className={className}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      onKeyDown={onKeyDown}
    />
  ),
  Badge: ({ label, part, className, tone }) => (
    <span data-adapttable-part={part} className={className} data-tone={tone}>
      {label}
    </span>
  ),
};
