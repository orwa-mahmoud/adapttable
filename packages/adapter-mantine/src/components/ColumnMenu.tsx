import type { Direction, UseColumnLayoutResult } from "@adapttable/core";
import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  columnReorderKeyProps,
  REORDER_COLUMN_KEY,
  useColumnDragState,
} from "@adapttable/core";
import type {
  ColumnMenuChromeProps,
  ColumnMenuLabels,
  ColumnMenuRow,
} from "@adapttable/core/adapter";
import {
  columnMenuActions,
  filterColumnMenuRows,
  hideAllColumns,
  showAllColumns,
  unpinAllColumns,
} from "@adapttable/core/adapter";
import {
  EyeIcon,
  GripIcon,
  nextPinSide,
  pinActionLabel,
  PinIcon,
} from "@adapttable/core/adapter";
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Popover,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

import { useEscapeClose } from "./useEscapeClose";

/**
 * Props for the column menu — the shared core contract, plus the injected
 * actions column: when the table has row actions, the menu lists it too
 * (named by `labels.actions`) with an eye toggle and a one-click end-pin.
 */
export interface ColumnMenuProps<TRow> extends ColumnMenuChromeProps<TRow> {
  /** Resolved labels — the shared menu set plus the actions-column name. */
  labels: ColumnMenuLabels & { actions: string; reorderRow: string };
  /** Whether the table has row actions (lists the injected actions column). */
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
   *  direction unless we hand it over explicitly (RTL flipped grip ↔ pin). */
  dir?: Direction;
}

/** The eye toggle + struck-through name shared by data and actions rows. */
function RowVisibility({
  hidden,
  name,
  labels,
  onToggle,
  disabled = false,
}: Readonly<{
  hidden: boolean;
  name: string;
  labels: Pick<ColumnMenuLabels, "showColumn" | "hideColumn">;
  onToggle: () => void;
  disabled?: boolean;
}>) {
  return (
    <>
      <ActionIcon
        variant={hidden ? "subtle" : "light"}
        color={hidden ? "gray" : "blue"}
        size="sm"
        aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
        aria-pressed={!hidden}
        disabled={disabled}
        onClick={onToggle}
      >
        <EyeIcon off={hidden} />
      </ActionIcon>
      <Text
        size="sm"
        style={{ flex: 1 }}
        c={hidden ? "dimmed" : undefined}
        td={hidden ? "line-through" : undefined}
      >
        {name}
      </Text>
    </>
  );
}

/** The pin control shared by data and actions rows. */
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
    <ActionIcon
      variant={pinned ? "filled" : "subtle"}
      color={pinned ? "blue" : "gray"}
      size="sm"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <PinIcon />
    </ActionIcon>
  );
}

/**
 * The injected actions column's menu row: the same eye toggle as data
 * columns plus a pin toggle that flips right ↔ unpinned in one click. No
 * drag grip (the column always trails) and no left pin.
 */
function ActionsRow<TRow>({
  layout,
  labels,
}: Readonly<{
  layout: UseColumnLayoutResult<TRow>;
  labels: ColumnMenuProps<TRow>["labels"];
}>) {
  const hidden = layout.isHidden(ACTIONS_COLUMN_KEY);
  const pinned = layout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  return (
    <Group justify="flex-start" wrap="nowrap" gap={6} px={4} py={2}>
      {/* Spacer where data rows show the drag grip, keeping toggles aligned. */}
      <Box w={22} />
      <RowVisibility
        hidden={hidden}
        name={labels.actions}
        labels={labels}
        onToggle={() => layout.toggleVisible(ACTIONS_COLUMN_KEY)}
      />
      <PinToggle
        pinned={pinned}
        label={`${pinned ? labels.unpin : labels.pinEnd}: ${labels.actions}`}
        onClick={() =>
          layout.setPinned(ACTIONS_COLUMN_KEY, pinned ? undefined : "end")
        }
      />
    </Group>
  );
}

function ReorderRow<TRow>({
  layout,
  labels,
}: Readonly<{
  layout: UseColumnLayoutResult<TRow>;
  labels: ColumnMenuProps<TRow>["labels"];
}>) {
  const hidden = layout.isHidden(REORDER_COLUMN_KEY);
  const pinned = layout.state.pinned[REORDER_COLUMN_KEY] !== undefined;
  return (
    <div data-adapttable-part="column-menu-item" data-reorder="">
      <Group justify="flex-start" wrap="nowrap" gap={6} px={4} py={2}>
        <Box w={22} />
        <RowVisibility
          hidden={hidden}
          name={labels.reorderRow}
          labels={labels}
          onToggle={() => layout.toggleVisible(REORDER_COLUMN_KEY)}
        />
        <PinToggle
          pinned={pinned}
          label={`${pinned ? labels.unpin : labels.pinStart}: ${labels.reorderRow}`}
          onClick={() =>
            layout.setPinned(REORDER_COLUMN_KEY, pinned ? undefined : "start")
          }
        />
      </Group>
    </div>
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
  const actions = columnMenuActions(row, {
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
      <Group
        justify="flex-start"
        wrap="nowrap"
        gap={6}
        px={4}
        py={2}
        style={{
          cursor: canMove ? "grab" : "default",
          opacity: "data-dragging" in indicator ? 0.4 : undefined,
          boxShadow: edge
            ? `inset 0 ${edgeOffset} 0 0 var(--mantine-primary-color-filled)`
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
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
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
        </ActionIcon>
        <RowVisibility
          hidden={hidden}
          name={name}
          labels={labels}
          disabled={!canHide}
          onToggle={() => layout.toggleVisible(key)}
        />
        <PinToggle
          pinned={pinned !== undefined}
          label={`${pinActionLabel(pinned, labels)}: ${name}`}
          disabled={!canPin}
          onClick={() => layout.setPinned(key, nextPinSide(pinned))}
        />
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          data-adapttable-part="column-menu-more"
          aria-expanded={open}
          aria-label={`${labels.columnActions}: ${name}`}
          onClick={() => setOpen((value) => !value)}
        >
          ⋯
        </ActionIcon>
      </Group>
      {open ? (
        <Box data-adapttable-part="column-menu-submenu" px={4} pb={4}>
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="subtle"
              size="xs"
              fullWidth
              justify="flex-start"
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
        </Box>
      ) : null}
    </div>
  );
}

/**
 * Column-management popover: per-column drag grip (reorder), eye (show/hide),
 * and pin toggle. Keyboard users focus a grip and use arrow keys.
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
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState("");
  const rows = filterColumnMenuRows(columnMenuRows(allColumns, layout), query);
  useEscapeClose(opened, () => setOpened(false));
  // A Popover, not a Menu: the panel holds checkboxes, drag handles and
  // buttons, so `role="menu"` semantics (menuitem children) would be a lie.
  return (
    <Popover
      opened={opened}
      onChange={(nextOpened) => {
        if (!nextOpened) setOpened(false);
      }}
      position="bottom-end"
      withinPortal
      returnFocus
      zIndex={10050}
      middlewares={{ flip: false, shift: { padding: 8, mainAxis: false } }}
    >
      <Popover.Target>
        <Button
          variant="default"
          size="sm"
          aria-expanded={opened}
          data-adapttable-part="column-menu-button"
          onClick={() => setOpened((value) => !value)}
        >
          {labels.columns}
        </Button>
      </Popover.Target>
      <Popover.Dropdown dir={dir}>
        <Box
          p={4}
          miw={250}
          mah="min(70vh, 480px)"
          style={{ overflowY: "auto" }}
        >
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" px={4} pb={6}>
            {labels.columns}
          </Text>
          <TextInput
            type="search"
            size="xs"
            mb={6}
            data-adapttable-part="column-menu-search"
            placeholder={labels.searchColumns}
            aria-label={labels.searchColumns}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <Group gap={4} mb={6} px={4} data-adapttable-part="column-menu-bulk">
            <Button
              variant="subtle"
              size="xs"
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => showAllColumns(rows, layout)}
            >
              {labels.showAllColumns}
            </Button>
            <Button
              variant="subtle"
              size="xs"
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => hideAllColumns(rows, layout)}
            >
              {labels.hideAllColumns}
            </Button>
            <Button
              variant="subtle"
              size="xs"
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => unpinAllColumns(rows, layout)}
            >
              {labels.unpinAllColumns}
            </Button>
          </Group>
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
          {(hasRowReorder || hasRowActions) && <Divider my={4} />}
          {hasRowReorder && <ReorderRow layout={layout} labels={labels} />}
          {hasRowActions && <ActionsRow layout={layout} labels={labels} />}
          <Divider my={4} />
          <Button
            variant="subtle"
            size="xs"
            fullWidth
            justify="flex-start"
            onClick={onAutoSize}
          >
            {labels.autoSizeColumns}
          </Button>
          <Button
            variant="subtle"
            size="xs"
            fullWidth
            justify="flex-start"
            onClick={() => layout.reset()}
          >
            {labels.resetColumns}
          </Button>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
