import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  columnReorderKeyProps,
  REORDER_COLUMN_KEY,
  useColumnDragState,
  type UseColumnLayoutResult,
} from "@adapttable/core";
import {
  type ColumnMenuAction,
  columnMenuActions,
  type ColumnMenuLabels,
  type ColumnMenuRow,
  type ColumnMenuSlotProps,
  type ColumnRenameEditorState,
  EyeIcon,
  filterColumnMenuRows,
  GripIcon,
  hideAllColumns,
  LiveRegion,
  nextPinSide,
  pinActionLabel,
  PinIcon,
  showAllColumns,
  unpinAllColumns,
  useColumnRenameEditor,
  useFeatureHost,
} from "@adapttable/core/adapter";
import { Button, Divider, Flex, Input, Popover, theme } from "antd";
import { type ComponentRef, useEffect, useRef, useState } from "react";

/** Menu labels plus the actions-column display name. */
type MenuLabels = ColumnMenuLabels & { actions: string; reorderRow: string };

/** The shared Columns-menu contract, declared once in core. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow>;

const ignoreColumnRename = () => undefined;

function useAdapterColumnRename<TRow>(
  row: ColumnMenuRow<TRow>,
  labels: ColumnMenuLabels,
  onRenameColumn: ((key: string, name: string) => void) | undefined
) {
  const rename = useColumnRenameEditor({
    key: row.key,
    name: row.name,
    onRename: onRenameColumn ?? ignoreColumnRename,
    requiredMessage: labels.columnNameRequired,
    renamedMessage: labels.columnRenamed,
  });
  return {
    rename,
    onBeginRename: onRenameColumn ? rename.begin : undefined,
  };
}

function runColumnMenuAction(
  action: ColumnMenuAction,
  setOpen: (open: boolean) => void
): void {
  action.run();
  if (action.id !== "rename") setOpen(false);
}

function columnMenuActionDisabled(
  action: ColumnMenuAction,
  editing: boolean
): boolean {
  return action.disabled || (action.id === "rename" && editing);
}

function ColumnRenameForm({
  rename,
  labels,
  errorColor,
}: Readonly<{
  rename: ColumnRenameEditorState;
  labels: ColumnMenuLabels;
  errorColor: string;
}>) {
  const inputRef = useRef<ComponentRef<typeof Input>>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <form
      data-adapttable-part="column-rename-form"
      style={{ padding: "4px 7px" }}
      onSubmit={(event) => {
        event.preventDefault();
        rename.submit();
      }}
    >
      <label
        htmlFor={rename.inputId}
        data-adapttable-part="column-rename-label"
        style={{ display: "block", fontSize: 12, marginBottom: 4 }}
      >
        {labels.columnName}
      </label>
      <Input
        ref={inputRef}
        id={rename.inputId}
        value={rename.draft}
        aria-invalid={rename.error ? true : undefined}
        aria-describedby={rename.error ? rename.errorId : undefined}
        data-adapttable-part="column-rename-input"
        size="small"
        onChange={(event) => rename.setDraft(event.target.value)}
        onBlur={rename.blur}
        onKeyDown={rename.onKeyDown}
      />
      {rename.error ? (
        <div
          id={rename.errorId}
          role="alert"
          data-adapttable-part="column-rename-error"
          style={{
            color: errorColor,
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {rename.error}
        </div>
      ) : null}
      <Flex gap={4} style={{ marginTop: 4 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="small"
          data-adapttable-part="column-rename-save"
        >
          {labels.saveColumnName}
        </Button>
        <Button
          htmlType="button"
          size="small"
          type="text"
          data-adapttable-part="column-rename-cancel"
          onClick={rename.cancel}
        >
          {labels.cancelColumnRename}
        </Button>
      </Flex>
    </form>
  );
}

/** The eye toggle shared by data rows and the trailing actions row. */
function VisibilityToggle({
  name,
  hidden,
  labels,
  onToggle,
  disabled = false,
}: Readonly<{
  name: string;
  hidden: boolean;
  labels: MenuLabels;
  onToggle: () => void;
  disabled?: boolean;
}>) {
  return (
    <Button
      size="small"
      type={hidden ? "text" : "link"}
      aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
      aria-pressed={!hidden}
      disabled={disabled}
      icon={<EyeIcon off={hidden} />}
      onClick={onToggle}
    />
  );
}

/** The row's name, struck through while its column is hidden. */
function RowName({
  name,
  hidden,
}: Readonly<{ name: string; hidden: boolean }>) {
  return (
    <span
      style={{
        flex: 1,
        fontSize: 14,
        opacity: hidden ? 0.5 : 1,
        textDecoration: hidden ? "line-through" : "none",
      }}
    >
      {name}
    </span>
  );
}

/** The pin toggle; its accessible name says what the NEXT click does. */
function PinToggle({
  pinned,
  actionLabel,
  onPin,
  disabled = false,
}: Readonly<{
  pinned: boolean;
  actionLabel: string;
  onPin: () => void;
  disabled?: boolean;
}>) {
  return (
    <Button
      size="small"
      type={pinned ? "primary" : "text"}
      aria-label={actionLabel}
      disabled={disabled}
      icon={<PinIcon />}
      onClick={onPin}
    />
  );
}

function ReorderRow<TRow>({
  layout,
  labels,
}: Readonly<{ layout: UseColumnLayoutResult<TRow>; labels: MenuLabels }>) {
  const hidden = layout.isHidden(REORDER_COLUMN_KEY);
  const pinned = layout.state.pinned[REORDER_COLUMN_KEY] !== undefined;
  return (
    <div data-adapttable-part="column-menu-item" data-reorder="">
      <Flex align="center" gap={6} style={{ padding: "2px 0" }}>
        <span
          aria-hidden="true"
          style={{ display: "inline-flex", visibility: "hidden" }}
        >
          <GripIcon />
        </span>
        <VisibilityToggle
          name={labels.reorderRow}
          hidden={hidden}
          labels={labels}
          onToggle={() => layout.toggleVisible(REORDER_COLUMN_KEY)}
        />
        <RowName name={labels.reorderRow} hidden={hidden} />
        <PinToggle
          pinned={pinned}
          actionLabel={`${pinned ? labels.unpin : labels.pinStart}: ${labels.reorderRow}`}
          onPin={() =>
            layout.setPinned(REORDER_COLUMN_KEY, pinned ? undefined : "start")
          }
        />
      </Flex>
    </div>
  );
}

/**
 * The injected row-actions column's management row. Separated from the data
 * columns and stripped to the two controls that apply: the eye and a
 * ONE-CLICK end pin (right ↔ unpinned — the actions column never moves or
 * pins left, so there is no grip and no three-way pin cycle). An invisible
 * grip keeps its controls aligned with the data rows above.
 */
function ActionsRow<TRow>({
  layout,
  labels,
}: Readonly<{ layout: UseColumnLayoutResult<TRow>; labels: MenuLabels }>) {
  const hidden = layout.isHidden(ACTIONS_COLUMN_KEY);
  const pinned = layout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  return (
    <Flex align="center" gap={6} style={{ padding: "2px 0" }}>
      <span
        aria-hidden="true"
        style={{ display: "inline-flex", visibility: "hidden" }}
      >
        <GripIcon />
      </span>
      <VisibilityToggle
        name={labels.actions}
        hidden={hidden}
        labels={labels}
        onToggle={() => layout.toggleVisible(ACTIONS_COLUMN_KEY)}
      />
      <RowName name={labels.actions} hidden={hidden} />
      <PinToggle
        pinned={pinned}
        actionLabel={`${pinned ? labels.unpin : labels.pinEnd}: ${labels.actions}`}
        onPin={() =>
          layout.setPinned(ACTIONS_COLUMN_KEY, pinned ? undefined : "end")
        }
      />
    </Flex>
  );
}

function ColumnMenuRowItem<TRow>({
  row,
  layout,
  labels,
  drag,
  token,
  sortBy,
  sortDir,
  onSortColumn,
  onAutoSizeColumn,
  onFilterColumn,
  onRenameColumn,
}: Readonly<{
  row: ColumnMenuRow<TRow>;
  layout: UseColumnLayoutResult<TRow>;
  labels: MenuLabels;
  drag: ReturnType<typeof useColumnDragState>;
  token: { colorError: string; colorPrimary: string };
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSortColumn?: (key: string, dir: "asc" | "desc") => void;
  onAutoSizeColumn?: (key: string) => void;
  onFilterColumn?: (key: string) => void;
  onRenameColumn?: (key: string, name: string) => void;
}>) {
  const { key, name, hidden, pinned, index, canMove, canHide, canPin } = row;
  const [open, setOpen] = useState(false);
  const featureHost = useFeatureHost<TRow>();
  const { rename, onBeginRename } = useAdapterColumnRename(
    row,
    labels,
    onRenameColumn
  );
  const actions = columnMenuActions(row, {
    featureHost,
    labels,
    layout,
    sortBy,
    sortDir,
    onSortColumn,
    onAutoSizeColumn,
    onFilterColumn,
    onBeginRename,
  });
  const indicator = canMove ? drag.rowAttrs(key, index) : {};
  const edge = indicator["data-drop"];
  const edgeOffset = edge === "before" ? "2px" : "-2px";
  return (
    <div
      data-adapttable-part="column-menu-item"
      data-hidden={hidden || undefined}
      data-pinned={pinned}
    >
      <Flex
        align="center"
        gap={6}
        style={{
          padding: "2px 0",
          cursor: canMove ? "grab" : "default",
          opacity: "data-dragging" in indicator ? 0.4 : undefined,
          boxShadow: edge
            ? `inset 0 ${edgeOffset} 0 0 ${token.colorPrimary}`
            : undefined,
        }}
        {...(canMove
          ? {
              ...drag.rowDragProps(key, index),
              ...drag.dropProps(index, layout.move),
              ...indicator,
            }
          : {})}
      >
        <span
          aria-disabled={!canMove || undefined}
          style={{
            display: "inline-flex",
            cursor: canMove ? "grab" : "default",
            opacity: canMove ? 0.55 : 0.3,
          }}
          {...(canMove
            ? columnReorderKeyProps(
                key,
                index,
                layout.move,
                `${labels.moveStart} / ${labels.moveEnd}: ${name}`
              )
            : {})}
        >
          <GripIcon />
        </span>
        <VisibilityToggle
          name={name}
          hidden={hidden}
          labels={labels}
          disabled={!canHide}
          onToggle={() => layout.toggleVisible(key)}
        />
        <RowName name={name} hidden={hidden} />
        <PinToggle
          pinned={Boolean(pinned)}
          actionLabel={`${pinActionLabel(pinned, labels)}: ${name}`}
          disabled={!canPin}
          onPin={() => layout.setPinned(key, nextPinSide(pinned))}
        />
        <Button
          size="small"
          type="text"
          data-adapttable-part="column-menu-more"
          aria-expanded={open}
          aria-label={`${labels.columnActions}: ${name}`}
          onClick={() => setOpen((value) => !value)}
        >
          ⋯
        </Button>
      </Flex>
      {open ? (
        <div data-adapttable-part="column-menu-submenu">
          {actions.map((action) => (
            <Button
              key={action.id}
              size="small"
              type="text"
              data-adapttable-part="column-menu-action"
              disabled={columnMenuActionDisabled(action, rename.editing)}
              onClick={() => runColumnMenuAction(action, setOpen)}
            >
              {action.label}
            </Button>
          ))}
          {rename.editing ? (
            <ColumnRenameForm
              rename={rename}
              labels={labels}
              errorColor={token.colorError}
            />
          ) : null}
        </div>
      ) : null}
      <LiveRegion part="column-rename-announcer" statusRole={false}>
        {rename.announcement}
      </LiveRegion>
    </div>
  );
}

/**
 * AntD column-management popover: per-column drag grip (reorder), eye
 * (show/hide), and pin toggle — plus a separated trailing row for the
 * injected actions column when the table has row actions. Controlled open
 * state so Escape dismisses it (antd's Popover has no built-in Escape
 * handling) and the trigger reports `aria-expanded` like the Filters button
 * beside it.
 */
export function ColumnMenu<TRow>({
  allColumns,
  layout,
  labels,
  dir,
  hasRowActions = false,
  hasRowReorder = false,
  onAutoSize,
  onAutoSizeColumn,
  onSortColumn,
  onFilterColumn,
  onRenameColumn,
  sortBy,
  sortDir,
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const { token } = theme.useToken();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rows = filterColumnMenuRows(columnMenuRows(allColumns, layout), query);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  // antd's Popover already paints the elevated surface (background, radius,
  // shadow) on `.ant-popover-container`. Repeating it here stacked a second
  // card inside the first — a visible card-in-a-card. Only the inner spacing
  // and width belong to us; `styles.content` below zeroes antd's own padding
  // so this is the single source of it.
  const content = (
    // antd's own popover wrapper is a tooltip, which is the wrong thing for a
    // panel of controls, so the panel names itself inside it. A fieldset is the
    // element form of the group role — the same choice the unstyled adapter
    // makes for this panel — so the semantics come from the markup rather than
    // from an attribute.
    <fieldset
      aria-label={labels.columns}
      dir={dir}
      style={{
        border: 0,
        margin: 0,
        // Without it a fieldset sizes to min-content and ignores minWidth.
        minInlineSize: 0,
        padding: 8,
        minWidth: 260,
        maxHeight: "min(70vh, 480px)",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          opacity: 0.6,
          padding: "0 4px 6px",
        }}
      >
        {labels.columns}
      </div>
      <Input
        type="search"
        size="small"
        data-adapttable-part="column-menu-search"
        placeholder={labels.searchColumns}
        aria-label={labels.searchColumns}
        value={query}
        style={{ marginBottom: 8 }}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Flex
        gap={4}
        wrap="wrap"
        data-adapttable-part="column-menu-bulk"
        style={{ marginBottom: 8 }}
      >
        <Button
          size="small"
          type="text"
          data-adapttable-part="column-menu-bulk-button"
          onClick={() => showAllColumns(rows, layout)}
        >
          {labels.showAllColumns}
        </Button>
        <Button
          size="small"
          type="text"
          data-adapttable-part="column-menu-bulk-button"
          onClick={() => hideAllColumns(rows, layout)}
        >
          {labels.hideAllColumns}
        </Button>
        <Button
          size="small"
          type="text"
          data-adapttable-part="column-menu-bulk-button"
          onClick={() => unpinAllColumns(rows, layout)}
        >
          {labels.unpinAllColumns}
        </Button>
      </Flex>
      {rows.map((row) => (
        <ColumnMenuRowItem
          key={row.key}
          row={row}
          layout={layout}
          labels={labels}
          drag={drag}
          token={token}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortColumn={onSortColumn}
          onAutoSizeColumn={onAutoSizeColumn}
          onFilterColumn={onFilterColumn}
          onRenameColumn={onRenameColumn}
        />
      ))}
      {(hasRowReorder || hasRowActions) && (
        <Divider style={{ margin: "6px 0" }} />
      )}
      {hasRowReorder && <ReorderRow layout={layout} labels={labels} />}
      {hasRowActions && <ActionsRow layout={layout} labels={labels} />}
      <Divider style={{ margin: "8px 0" }} />
      <Button size="small" type="text" onClick={onAutoSize}>
        {labels.autoSizeColumns}
      </Button>
      <Button size="small" type="text" onClick={() => layout.reset()}>
        {labels.resetColumns}
      </Button>
    </fieldset>
  );
  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement={dir === "rtl" ? "bottomLeft" : "bottomRight"}
      autoAdjustOverflow={{ adjustX: 1, adjustY: 0 }}
      content={content}
      styles={{ content: { padding: 0 } }}
    >
      <Button
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="true"
        data-adapttable-part="column-menu-button"
      >
        {labels.columns}
      </Button>
    </Popover>
  );
}
