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
import {
  Button,
  Flex,
  IconButton,
  Popover,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useState } from "react";

/**
 * Props for the column menu — the shared core contract, plus the injected
 * row-actions column entry (`hasRowActions` + its `actions` display name).
 */
export interface ColumnMenuProps<TRow> extends ColumnMenuChromeProps<TRow> {
  /** Resolved labels, including the actions column's display name. */
  labels: ColumnMenuLabels & { actions: string; reorderRow: string };
  /**
   * List the injected row-actions column as a separated trailing row with
   * the standard visibility toggle and a one-click end-pin toggle (the
   * actions column always trails, so it never reorders or pins left).
   */
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
  /** Text direction — the menu portals to `<body>`, so it loses the table's
   *  direction unless we hand it over explicitly (RTL flips grip ↔ pin). */
  dir?: Direction;
}

/** Eye toggle for one menu row (a data column or the actions entry). */
function VisibilityToggle({
  hidden,
  name,
  labels,
  onToggle,
  disabled = false,
}: Readonly<{
  hidden: boolean;
  name: string;
  labels: ColumnMenuLabels;
  onToggle: () => void;
  disabled?: boolean;
}>) {
  return (
    <IconButton
      size="1"
      variant="ghost"
      color="gray"
      aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
      aria-pressed={!hidden}
      disabled={disabled}
      onClick={onToggle}
    >
      <EyeIcon off={hidden} />
    </IconButton>
  );
}

/** Menu-row label, struck through while its column is hidden. */
function RowName({
  hidden,
  name,
}: Readonly<{ hidden: boolean; name: string }>) {
  return (
    <Text
      size="2"
      color={hidden ? "gray" : undefined}
      style={{
        flex: 1,
        textDecoration: hidden ? "line-through" : undefined,
      }}
    >
      {name}
    </Text>
  );
}

/** Pin toggle for one menu row; `label` names the action it performs next. */
function PinToggle({
  pinned,
  label,
  onClick,
  disabled = false,
}: Readonly<{
  pinned: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}>) {
  return (
    <IconButton
      size="1"
      variant={pinned ? "solid" : "ghost"}
      color={pinned ? "teal" : "gray"}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <PinIcon />
    </IconButton>
  );
}

function ColumnMenuRowItem<TRow>({
  row,
  layout,
  labels,
  drag,
  sortBy,
  sortDir,
  onSortColumn,
  onAutoSizeColumn,
  onFilterColumn,
}: Readonly<{
  row: ColumnMenuRow<TRow>;
  layout: UseColumnLayoutResult<TRow>;
  labels: ColumnMenuLabels;
  drag: ReturnType<typeof useColumnDragState>;
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
        gap="1"
        align="center"
        style={{
          cursor: canMove ? "grab" : "default",
          padding: "2px 0",
          opacity: "data-dragging" in indicator ? 0.4 : undefined,
          boxShadow: edge
            ? `inset 0 ${edgeOffset} 0 0 var(--accent-9)`
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
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          disabled={!canMove}
          style={{ cursor: canMove ? "grab" : "default" }}
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
        </IconButton>
        <VisibilityToggle
          hidden={hidden}
          name={name}
          labels={labels}
          disabled={!canHide}
          onToggle={() => layout.toggleVisible(key)}
        />
        <RowName hidden={hidden} name={name} />
        <PinToggle
          pinned={Boolean(pinned)}
          label={`${pinActionLabel(pinned, labels)}: ${name}`}
          disabled={!canPin}
          onClick={() => layout.setPinned(key, nextPinSide(pinned))}
        />
        <IconButton
          size="1"
          variant="ghost"
          color="gray"
          data-adapttable-part="column-menu-more"
          aria-expanded={open}
          aria-label={`${labels.columnActions}: ${name}`}
          onClick={() => setOpen((value) => !value)}
        >
          ⋯
        </IconButton>
      </Flex>
      {open ? (
        <Flex
          direction="column"
          data-adapttable-part="column-menu-submenu"
          gap="1"
        >
          {actions.map((action) => (
            <Button
              key={action.id}
              size="1"
              variant="ghost"
              color="gray"
              data-adapttable-part="column-menu-action"
              disabled={action.disabled}
              style={{ alignSelf: "flex-start" }}
              onClick={() => {
                action.run();
                setOpen(false);
              }}
            >
              {action.label}
            </Button>
          ))}
        </Flex>
      ) : null}
    </div>
  );
}

/**
 * Radix Themes column-management popover: per-column drag grip (reorder), eye
 * (show/hide), and pin toggle — plus, when the table has row actions, a
 * trailing entry that hides or end-pins the injected actions column.
 */
export function ColumnMenu<TRow>({
  allColumns,
  layout,
  labels,
  hasRowActions = false,
  hasRowReorder = false,
  onAutoSize,
  onAutoSizeColumn,
  onSortColumn,
  onFilterColumn,
  sortBy,
  sortDir,
  dir,
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const [query, setQuery] = useState("");
  const rows = filterColumnMenuRows(columnMenuRows(allColumns, layout), query);
  const actionsHidden = layout.isHidden(ACTIONS_COLUMN_KEY);
  const actionsPinned = layout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  const reorderHidden = layout.isHidden(REORDER_COLUMN_KEY);
  const reorderPinned = layout.state.pinned[REORDER_COLUMN_KEY] !== undefined;
  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button
          size="2"
          variant="outline"
          data-adapttable-part="column-menu-button"
        >
          {labels.columns}
        </Button>
      </Popover.Trigger>
      <Popover.Content
        aria-label={labels.columns}
        align="end"
        side="bottom"
        avoidCollisions={false}
        minWidth="260px"
        dir={dir}
        maxHeight="min(70vh, 480px)"
        style={{ overflowY: "auto", zIndex: 10050 }}
      >
        <Flex direction="column" gap="1">
          <Text
            size="1"
            weight="bold"
            color="gray"
            style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            {labels.columns}
          </Text>
          <TextField.Root
            type="search"
            size="1"
            data-adapttable-part="column-menu-search"
            placeholder={labels.searchColumns}
            aria-label={labels.searchColumns}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Flex gap="1" wrap="wrap" data-adapttable-part="column-menu-bulk">
            <Button
              size="1"
              variant="ghost"
              color="gray"
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => showAllColumns(rows, layout)}
            >
              {labels.showAllColumns}
            </Button>
            <Button
              size="1"
              variant="ghost"
              color="gray"
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => hideAllColumns(rows, layout)}
            >
              {labels.hideAllColumns}
            </Button>
            <Button
              size="1"
              variant="ghost"
              color="gray"
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
              sortBy={sortBy}
              sortDir={sortDir}
              onSortColumn={onSortColumn}
              onAutoSizeColumn={onAutoSizeColumn}
              onFilterColumn={onFilterColumn}
            />
          ))}
          {(hasRowReorder || hasRowActions) && <Separator my="1" size="4" />}
          {hasRowReorder && (
            <div data-adapttable-part="column-menu-item" data-reorder="">
              <Flex gap="1" align="center">
                <VisibilityToggle
                  hidden={reorderHidden}
                  name={labels.reorderRow}
                  labels={labels}
                  onToggle={() => layout.toggleVisible(REORDER_COLUMN_KEY)}
                />
                <RowName hidden={reorderHidden} name={labels.reorderRow} />
                <PinToggle
                  pinned={reorderPinned}
                  label={`${reorderPinned ? labels.unpin : labels.pinStart}: ${labels.reorderRow}`}
                  onClick={() =>
                    layout.setPinned(
                      REORDER_COLUMN_KEY,
                      reorderPinned ? undefined : "start"
                    )
                  }
                />
              </Flex>
            </div>
          )}
          {hasRowActions && (
            <Flex gap="1" align="center">
              <VisibilityToggle
                hidden={actionsHidden}
                name={labels.actions}
                labels={labels}
                onToggle={() => layout.toggleVisible(ACTIONS_COLUMN_KEY)}
              />
              <RowName hidden={actionsHidden} name={labels.actions} />
              <PinToggle
                pinned={actionsPinned}
                label={`${actionsPinned ? labels.unpin : labels.pinEnd}: ${labels.actions}`}
                onClick={() =>
                  layout.setPinned(
                    ACTIONS_COLUMN_KEY,
                    actionsPinned ? undefined : "end"
                  )
                }
              />
            </Flex>
          )}
          <Separator my="1" size="4" />
          <Button
            size="1"
            variant="ghost"
            color="gray"
            style={{ alignSelf: "flex-start" }}
            onClick={onAutoSize}
          >
            {labels.autoSizeColumns}
          </Button>
          <Button
            size="1"
            variant="ghost"
            color="gray"
            style={{ alignSelf: "flex-start" }}
            onClick={() => layout.reset()}
          >
            {labels.resetColumns}
          </Button>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}
