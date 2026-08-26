import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  columnReorderKeyProps,
  type Direction,
  REORDER_COLUMN_KEY,
  useColumnDragState,
  type UseColumnLayoutResult,
} from "@adapttable/core";
import {
  columnMenuActions,
  type ColumnMenuChromeProps,
  type ColumnMenuLabels,
  type ColumnMenuRow,
  EyeIcon,
  filterColumnMenuRows,
  GripIcon,
  hideAllColumns,
  nextPinSide,
  pinActionLabel,
  PinIcon,
  showAllColumns,
  unpinAllColumns,
  useFeatureHost,
} from "@adapttable/core/adapter";
import { Button, Divider, Flex, Input, Popover, theme } from "antd";
import { useEffect, useRef, useState } from "react";

/** Menu labels plus the actions-column display name. */
type MenuLabels = ColumnMenuLabels & { actions: string; reorderRow: string };

export interface ColumnMenuProps<TRow> extends ColumnMenuChromeProps<TRow> {
  dir?: Direction;
  /** Resolved labels, including the injected actions column's name. */
  labels: MenuLabels;
  /** List the injected row-actions column as a managed trailing row. */
  hasRowActions?: boolean;
  /**
   * Whether the table renders a row-reorder column. When true the menu
   * lists it as a leading reserved row: hideable and start-pinnable.
   */
  hasRowReorder?: boolean;
  /** Size every rendered column to its content. */
  onAutoSize: () => void;
  /** Size one column to its content. */
  onAutoSizeColumn?: (key: string) => void;
  /** Sort one column from the submenu. */
  onSortColumn?: (key: string, dir: "asc" | "desc") => void;
  /** Open the filter UI from the submenu. */
  onFilterColumn?: (key: string) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
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
}: Readonly<{
  row: ColumnMenuRow<TRow>;
  layout: UseColumnLayoutResult<TRow>;
  labels: MenuLabels;
  drag: ReturnType<typeof useColumnDragState>;
  token: { colorPrimary: string };
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSortColumn?: (key: string, dir: "asc" | "desc") => void;
  onAutoSizeColumn?: (key: string) => void;
  onFilterColumn?: (key: string) => void;
}>) {
  const { key, name, hidden, pinned, index, canMove, canHide, canPin } = row;
  const [open, setOpen] = useState(false);
  const featureHost = useFeatureHost<TRow>();
  const actions = columnMenuActions(row, {
    featureHost,
    labels,
    layout,
    sortBy,
    sortDir,
    onSortColumn,
    onAutoSizeColumn,
    onFilterColumn,
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
              disabled={action.disabled}
              onClick={() => {
                action.run();
                setOpen(false);
              }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
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
    <div
      style={{
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
    </div>
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
