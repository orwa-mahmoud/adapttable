/**
 * Each feature's controls, built once from a kit's primitives.
 *
 * A kit calls one factory per feature entry with the primitives that feature
 * draws, and exports the component it returns. Every glyph, part name, label
 * and keyboard wiring lives here; the kit's primitives decide only the look.
 *
 * Every component here hands its props straight to a Chrome or a primitive,
 * so the module opts out of the compiler: a cache around a pass-through
 * outweighs the element it would save.
 */
"use no memo";

import type {
  AgentApprovalButtonProps,
  AgentApprovalListProps,
  BatchEditButtonProps,
  ColumnGroupToggleButtonProps,
  EditableCellActivateProps,
  EditableCellButtonProps,
  FilterHeaderMultiProps,
  FilterHeaderRangeProps,
  FilterHeaderSearchProps,
  FilterHeaderSelectProps,
  FindButtonProps,
  GroupMoreButtonSlotProps,
  RowEditButtonProps,
  RowMoveMenuSlotProps,
  RowReorderMoveButtonProps,
  TreeToggleButtonProps,
} from "@adapttable/core/binding";
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
  useRef,
} from "react";

import {
  ColumnGroupToggleChrome,
  type ColumnGroupToggleProps,
} from "../columns/ColumnGroupToggle";
import { GripIcon } from "../columns/icons";
import {
  AgentApprovalChrome,
  type AgentApprovalProps,
} from "../editing/AgentApprovalChrome";
import type { EditableCellSlots } from "../editing/EditableCellGate";
import {
  BatchEditBarChrome,
  type BatchEditBarProps,
  RowEditActionsChrome,
  type RowEditActionsProps,
} from "../editing/RowEditGate";
import {
  FilterHeaderChrome,
  FilterHeaderControlChrome,
  type FilterHeaderControlProps,
  type FilterHeaderRowProps,
  type FilterHeaderSlots,
} from "../filters/FilterHeaderRow";
import {
  FindBarChrome,
  type FindBarProps,
  type FindSearchProps,
} from "../find/FindBar";
import {
  GroupMoreButtonChrome,
  type GroupMoreButtonProps,
} from "../grouping/GroupMoreButton";
import { restoreFocusSoon } from "../overlays/restoreFocus";
import {
  RowReorderButtonsChrome,
  type RowReorderButtonsProps,
  RowReorderHandleChrome,
  type RowReorderHandleProps,
  type RowReorderHandleSlotProps,
} from "../rows/RowReorderHandle";
import { TreeCellChrome, type TreeCellProps } from "../tree/TreeCell";
import {
  TreeToggleChrome,
  type TreeToggleProps,
  type TreeToggleSlots,
} from "../tree/TreeToggle";
import { useMobileTarget } from "./mobileTarget";
import type { KitPrimitivesOf, KitTriggerProps } from "./primitives";

const FIND_GLYPH: Readonly<Record<FindButtonProps["kind"], string>> = {
  previous: "↑",
  next: "↓",
  close: "✕",
};

const ELLIPSIS: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const MULTI_TRIGGER: CSSProperties = {
  justifyContent: "space-between",
  textTransform: "none",
  minWidth: 0,
};

const MULTI_LIST: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  maxHeight: 220,
  minWidth: 160,
  overflow: "auto",
};

const ACTIVATE_STYLE: CSSProperties = {
  all: "unset",
  boxSizing: "border-box",
  display: "block",
  width: "100%",
  height: "100%",
  minHeight: "1.25em",
  cursor: "text",
  textAlign: "inherit",
};

const TREE_GLYPH: CSSProperties = {
  display: "inline-block",
  transition: "transform 150ms ease",
};

const REORDER_MOVE: CSSProperties = { minWidth: 44, minHeight: 44 };

/**
 * The find bar's search field and buttons.
 *
 * @public
 */
export function createFindBar(
  kit: KitPrimitivesOf<"TextInput" | "IconButton">
): (props: Readonly<FindBarProps>) => ReactElement {
  const { TextInput, IconButton } = kit;
  const slots = {
    Search: ({
      label,
      placeholder,
      value,
      focusRef,
      onChange,
      onKeyDown,
    }: Readonly<FindSearchProps>) => (
      <TextInput
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        elementRef={focusRef}
        data-adapttable-part="find-input"
        onValueChange={onChange}
        onKeyDown={onKeyDown}
        style={{ minWidth: "12em" }}
      />
    ),
    Button: ({ label, part, kind, disabled, onClick }: FindButtonProps) => (
      <IconButton
        variant="outlined"
        aria-label={label}
        data-adapttable-part={part}
        disabled={disabled}
        onClick={onClick}
      >
        {FIND_GLYPH[kind]}
      </IconButton>
    ),
  };
  return function FindBar(props) {
    return <FindBarChrome {...props} slots={slots} />;
  };
}

/**
 * Save and cancel for a row being edited.
 *
 * @param kit - The kit's buttons.
 * @param iconFor - The kit's glyph for a row-edit part, or nothing for a text
 *   button.
 *
 * @public
 */
export function createRowEditActions(
  kit: KitPrimitivesOf<"Button" | "IconButton">,
  iconFor: (part: string, icon: unknown) => ReactNode
): <TRow>(props: Readonly<RowEditActionsProps<TRow>>) => ReactElement {
  const { Button, IconButton } = kit;
  function RowEditButton({
    label,
    part,
    icon,
    className,
    onClick,
  }: Readonly<RowEditButtonProps>) {
    const targetStyle = useMobileTarget();
    const glyph = iconFor(part, icon);
    if (glyph == null)
      return (
        <Button
          style={targetStyle}
          data-adapttable-part={part}
          className={className}
          aria-label={label}
          onClick={onClick}
        >
          {label}
        </Button>
      );
    return (
      <IconButton
        style={targetStyle}
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
  const slots = { Button: RowEditButton };
  return function RowEditActions(props) {
    return <RowEditActionsChrome {...props} slots={slots} />;
  };
}

function textButton(
  Button: KitPrimitivesOf<"Button">["Button"],
  variant?: "text" | "outlined"
) {
  return function ActionButton({
    label,
    part,
    className,
    onClick,
  }: Readonly<BatchEditButtonProps | AgentApprovalButtonProps>) {
    return (
      <Button
        variant={variant}
        data-adapttable-part={part}
        className={className}
        onClick={onClick}
      >
        {label}
      </Button>
    );
  };
}

/**
 * The bar that saves or discards a batch of edits.
 *
 * @public
 */
export function createBatchEditBar(
  kit: KitPrimitivesOf<"Button">
): <TRow>(props: Readonly<BatchEditBarProps<TRow>>) => ReactElement {
  const slots = { Button: textButton(kit.Button) };
  return function BatchEditBar(props) {
    return <BatchEditBarChrome {...props} slots={slots} />;
  };
}

function ApprovalList({
  part,
  label,
  className,
  children,
}: Readonly<AgentApprovalListProps<ReactNode>>) {
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

/**
 * Approve or reject a pending agent write.
 *
 * @public
 */
export function createAgentApproval(
  kit: KitPrimitivesOf<"Button">
): (props: Readonly<AgentApprovalProps>) => ReactElement {
  const decide = textButton(kit.Button);
  const slots = {
    Approve: decide,
    Reject: decide,
    List: ApprovalList,
    Action: textButton(kit.Button, "text"),
  };
  return function AgentApproval(props) {
    return <AgentApprovalChrome {...props} slots={slots} />;
  };
}

function treeSlots(kit: KitPrimitivesOf<"IconButton">): TreeToggleSlots {
  const { IconButton } = kit;
  function TreeButton({
    label,
    expanded,
    loading,
    className,
    onClick,
  }: Readonly<TreeToggleButtonProps>) {
    const targetStyle = useMobileTarget();
    return (
      <IconButton
        style={targetStyle}
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
            ...TREE_GLYPH,
            transform: expanded ? "rotate(90deg)" : "none",
          }}
        >
          ▸
        </span>
      </IconButton>
    );
  }
  return { Button: TreeButton };
}

/**
 * The expand/collapse control on a tree row.
 *
 * @public
 */
export function createTreeToggle(
  kit: KitPrimitivesOf<"IconButton">
): <TRow>(props: Readonly<TreeToggleProps<TRow>>) => ReactElement | null {
  const slots = treeSlots(kit);
  return function TreeToggle(props) {
    return <TreeToggleChrome {...props} slots={slots} />;
  };
}

/**
 * A tree row's first cell: indentation, toggle and content.
 *
 * @public
 */
export function createTreeCell(
  kit: KitPrimitivesOf<"IconButton">
): <TRow>(props: Readonly<TreeCellProps<TRow>>) => ReactElement {
  const slots = treeSlots(kit);
  return function TreeCell(props) {
    return <TreeCellChrome {...props} slots={slots} />;
  };
}

/**
 * The control that collapses a grouped column header.
 *
 * @public
 */
export function createColumnGroupToggle(
  kit: KitPrimitivesOf<"IconButton">
): (props: Readonly<ColumnGroupToggleProps>) => ReactElement {
  const { IconButton } = kit;
  const slots = {
    Button: ({
      label,
      expanded,
      className,
      onClick,
    }: Readonly<ColumnGroupToggleButtonProps>) => (
      <IconButton
        data-adapttable-part="column-group-toggle"
        aria-expanded={expanded}
        aria-label={label}
        className={className}
        onClick={onClick}
      >
        {expanded ? "▼" : "▶"}
      </IconButton>
    ),
  };
  return function ColumnGroupToggle(props) {
    return <ColumnGroupToggleChrome {...props} slots={slots} />;
  };
}

/**
 * The control that reveals the rest of a truncated group.
 *
 * @public
 */
export function createGroupMoreButton(
  kit: KitPrimitivesOf<"Button">
): (props: Readonly<GroupMoreButtonProps>) => ReactElement | null {
  const { Button } = kit;
  const slots = {
    Button: ({ label, onClick }: GroupMoreButtonSlotProps) => (
      <Button
        variant="text"
        data-adapttable-part="group-more"
        onClick={onClick}
      >
        {label}
      </Button>
    ),
  };
  return function GroupMoreButton(props) {
    return <GroupMoreButtonChrome {...props} slots={slots} />;
  };
}

/** What the keyboard move menu draws with. */
type RowMoveKit = KitPrimitivesOf<
  "IconButton" | "Button" | "Menu" | "Popover" | "Text"
>;

function rowMoveMenu(kit: RowMoveKit) {
  const { IconButton, Button, Menu, Popover, Text } = kit;
  return function RowMoveMenu({
    label,
    items,
    confirmation,
  }: Readonly<RowMoveMenuSlotProps>) {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const trigger = (props: KitTriggerProps) => (
      <IconButton
        {...props}
        elementRef={(node: HTMLButtonElement | null) => {
          triggerRef.current = node;
          assignRef(props.elementRef, node);
        }}
        aria-label={label}
        data-adapttable-part="row-move-menu-trigger"
      >
        ⋮
      </IconButton>
    );
    // The host answers by re-rendering, which can swap the trigger (the
    // confirmation's for the menu's); read the ref after that render.
    const finish = (action: () => void) => {
      action();
      window.setTimeout(() => restoreFocusSoon(triggerRef.current), 0);
    };
    if (confirmation) {
      return (
        <span data-adapttable-part="row-move-menu">
          <Popover
            open
            role="dialog"
            part="row-move-menu-content"
            onOpenChange={(open) => {
              if (!open) finish(confirmation.onCancel);
            }}
            trigger={trigger}
          >
            <div
              role="alertdialog"
              aria-label={confirmation.title}
              data-adapttable-part="row-move-confirmation"
            >
              <Text variant="title">{confirmation.title}</Text>
              <Text as="p">{confirmation.description}</Text>
              <Button onClick={() => finish(confirmation.onConfirm)}>
                {confirmation.confirmLabel}
              </Button>
              <Button onClick={() => finish(confirmation.onCancel)}>
                {confirmation.cancelLabel}
              </Button>
            </div>
          </Popover>
        </span>
      );
    }
    return (
      <span data-adapttable-part="row-move-menu">
        <Menu
          aria-label={label}
          part="row-move-menu-content"
          itemPart="row-move-menu-item"
          items={items}
          trigger={trigger}
        />
      </span>
    );
  };
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === "function") ref(node);
  else if (ref) (ref as { current: T | null }).current = node;
}

/**
 * The drag handle for reordering a row, with its keyboard move menu.
 *
 * @public
 */
export function createRowReorderHandle(
  kit: KitPrimitivesOf<"IconButton" | "Button" | "Menu" | "Popover" | "Text">
): <TRow>(props: Readonly<RowReorderHandleProps<TRow>>) => ReactElement {
  const { IconButton } = kit;
  function Handle({
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
        data-adapttable-part="row-reorder-handle"
        data-adapttable-grip=""
        data-dragging={dragging ? "" : undefined}
        className={className}
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        style={{ cursor: pressed ? "grabbing" : "grab" }}
        {...dragProps}
        onKeyDown={onKeyDown}
      >
        <GripIcon />
      </IconButton>
    );
  }
  const slots = { Handle, Menu: rowMoveMenu(kit) };
  return function RowReorderHandle(props) {
    return <RowReorderHandleChrome {...props} slots={slots} />;
  };
}

/**
 * Keyboard-reachable move-up and move-down for a row.
 *
 * @public
 */
export function createRowReorderButtons(
  kit: KitPrimitivesOf<"IconButton" | "Button" | "Menu" | "Popover" | "Text">
): <TRow>(props: Readonly<RowReorderButtonsProps<TRow>>) => ReactElement {
  const { IconButton } = kit;
  function Move({
    label,
    part,
    disabled,
    className,
    onClick,
  }: Readonly<RowReorderMoveButtonProps>) {
    return (
      <IconButton
        style={REORDER_MOVE}
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
  const slots = { Button: Move, Menu: rowMoveMenu(kit) };
  return function RowReorderButtons(props) {
    return <RowReorderButtonsChrome {...props} slots={slots} />;
  };
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
}: Readonly<EditableCellActivateProps<ReactNode>>) {
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

/**
 * The editable cell's activation target and its gate buttons.
 *
 * @public
 */
export function createEditableCellSlots(
  kit: KitPrimitivesOf<"Button">
): EditableCellSlots {
  const { Button } = kit;
  return {
    Activate: ActivateCell,
    Button: ({
      label,
      part,
      className,
      onMouseDown,
      onClick,
    }: Readonly<EditableCellButtonProps>) => (
      <Button
        data-adapttable-part={part}
        className={className}
        onMouseDown={onMouseDown}
        onClick={onClick}
      >
        {label}
      </Button>
    ),
  };
}

/** What the header filters draw with. */
type FilterHeaderKit = KitPrimitivesOf<
  "TextInput" | "Select" | "Button" | "Checkbox" | "Popover"
>;

function headerSlots(kit: FilterHeaderKit): FilterHeaderSlots {
  const { TextInput, Select, Button, Checkbox, Popover } = kit;
  return {
    Search: ({
      label,
      placeholder,
      value,
      className,
      onChange,
    }: Readonly<FilterHeaderSearchProps>) => (
      <TextInput
        type="search"
        fullWidth
        aria-label={label}
        placeholder={placeholder}
        value={value}
        className={className}
        rootPart="filter-header-input"
        onValueChange={onChange}
      />
    ),
    Select: ({
      label,
      value,
      options,
      className,
      onChange,
    }: Readonly<FilterHeaderSelectProps>) => (
      <Select
        fullWidth
        aria-label={label}
        value={value}
        options={options}
        className={className}
        rootPart="filter-header-input"
        onValueChange={onChange}
      />
    ),
    Range: ({ label, type, value, onChange }: FilterHeaderRangeProps) => (
      <TextInput
        fullWidth
        type={type}
        aria-label={label}
        value={value}
        onValueChange={onChange}
      />
    ),
    Multi: ({
      label,
      summary,
      options,
      selected,
      className,
      menuClassName,
      onToggle,
    }: Readonly<FilterHeaderMultiProps>) => (
      <Popover
        role="menu"
        part="filter-header-menu"
        className={menuClassName}
        trigger={(trigger) => (
          <Button
            {...trigger}
            variant="outlined"
            fullWidth
            aria-label={label}
            data-adapttable-part="filter-header-input"
            className={className}
            style={MULTI_TRIGGER}
          >
            <span style={ELLIPSIS}>{summary}</span>
            <span aria-hidden>▾</span>
          </Button>
        )}
      >
        <div style={MULTI_LIST}>
          {options.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => onToggle(option.value, checked)}
            />
          ))}
        </div>
      </Popover>
    ),
  };
}

/**
 * The filter row under the column headers.
 *
 * @public
 */
export function createFilterHeaderRow(
  kit: KitPrimitivesOf<
    "TextInput" | "Select" | "Button" | "Checkbox" | "Popover"
  >
): <TRow>(props: Readonly<FilterHeaderRowProps<TRow>>) => ReactElement | null {
  const slots = headerSlots(kit);
  return function FilterHeaderRow(props) {
    return <FilterHeaderChrome {...props} slots={slots} />;
  };
}

/**
 * One column's header filter.
 *
 * @public
 */
export function createFilterHeaderControl(
  kit: KitPrimitivesOf<
    "TextInput" | "Select" | "Button" | "Checkbox" | "Popover"
  >
): <TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) => ReactElement | null {
  const slots = headerSlots(kit);
  return function FilterHeaderControl(props) {
    return <FilterHeaderControlChrome {...props} slots={slots} />;
  };
}
