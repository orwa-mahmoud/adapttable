import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  REORDER_COLUMN_KEY,
  type UseColumnLayoutResult,
} from "@adapttable/core";
import { columnReorderKeyProps, useColumnDragState } from "@adapttable/react";
import {
  columnMenuActions,
  type ColumnMenuItem,
  type ColumnMenuLabels,
  type ColumnMenuRow,
  type ColumnMenuSlotProps,
  type ColumnRenameEditorState,
  EyeIcon,
  filterColumnMenuRows,
  GripIcon,
  type GroupingPanelState,
  hideAllColumns,
  LiveRegion,
  nextPinSide,
  pinActionLabel,
  PinIcon,
  showAllColumns,
  unpinAllColumns,
  useColumnRenameEditor,
  useEscapeClose,
  useFeatureHost,
} from "@adapttable/react/adapter";
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Popover,
  Select,
  Text,
  TextInput,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";

/** The shared Columns-menu contract, declared once in core. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow>;

const NOOP_RENAME = () => undefined;

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

function ColumnRenameForm({
  rename,
  labels,
}: Readonly<{
  rename: ColumnRenameEditorState;
  labels: ColumnMenuLabels;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <Box
      component="form"
      data-adapttable-part="column-rename-form"
      p={4}
      onSubmit={(event) => {
        event.preventDefault();
        rename.submit();
      }}
    >
      <TextInput
        ref={inputRef}
        id={rename.inputId}
        size="xs"
        label={labels.columnName}
        labelProps={{
          "data-adapttable-part": "column-rename-label",
        }}
        value={rename.draft}
        error={rename.error}
        errorProps={{
          id: rename.errorId,
          role: "alert",
          "data-adapttable-part": "column-rename-error",
        }}
        data-adapttable-part="column-rename-input"
        aria-invalid={rename.error ? "true" : undefined}
        aria-describedby={rename.error ? rename.errorId : undefined}
        onChange={(event) => rename.setDraft(event.currentTarget.value)}
        onBlur={rename.blur}
        onKeyDown={rename.onKeyDown}
      />
      <Group gap={4} mt={4}>
        <Button
          type="submit"
          size="xs"
          data-adapttable-part="column-rename-save"
        >
          {labels.saveColumnName}
        </Button>
        <Button
          type="button"
          variant="subtle"
          size="xs"
          data-adapttable-part="column-rename-cancel"
          onClick={rename.cancel}
        >
          {labels.cancelColumnRename}
        </Button>
      </Group>
    </Box>
  );
}

function ColumnSubmenu({
  actions,
  rename,
  labels,
  onClose,
}: Readonly<{
  actions: readonly ColumnMenuItem[];
  rename: ColumnRenameEditorState;
  labels: ColumnMenuLabels;
  onClose: () => void;
}>) {
  return (
    <Box data-adapttable-part="column-menu-submenu" px={4} pb={4}>
      {actions.map((action) =>
        "kind" in action ? (
          <Select
            key={action.id}
            label={action.label}
            aria-label={action.label}
            size="xs"
            value={action.value}
            disabled={action.disabled}
            allowDeselect={false}
            data-adapttable-part="column-menu-choice"
            data={action.options.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            comboboxProps={{ withinPortal: false }}
            onChange={(value) => {
              if (value !== null) action.onChange(value);
            }}
          />
        ) : (
          <Button
            key={action.id}
            variant="subtle"
            size="xs"
            fullWidth
            justify="flex-start"
            data-adapttable-part="column-menu-action"
            disabled={
              action.disabled || (action.id === "rename" && rename.editing)
            }
            onClick={() => {
              action.run();
              if (action.id !== "rename") onClose();
            }}
          >
            {action.label}
          </Button>
        )
      )}
      {rename.editing ? (
        <ColumnRenameForm rename={rename} labels={labels} />
      ) : null}
    </Box>
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
  onRenameColumn,
  groupingPanel,
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
  onRenameColumn?: (key: string, name: string) => void;
  groupingPanel?: GroupingPanelState;
}>) {
  const { key, name, hidden, pinned, index, canMove, canHide, canPin } = row;
  const [open, setOpen] = useState(false);
  const featureHost = useFeatureHost<TRow>();
  const rename = useColumnRenameEditor({
    key,
    name,
    onRename: onRenameColumn ?? NOOP_RENAME,
    requiredMessage: labels.columnNameRequired,
    renamedMessage: labels.columnRenamed,
  });
  const actions = columnMenuActions(row, {
    featureHost,
    labels,
    layout,
    sortBy,
    sortDir,
    onSortColumn,
    onAutoSizeColumn,
    onFilterColumn,
    onBeginRename: onRenameColumn ? rename.begin : undefined,
    groupingPanel,
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
        <ColumnSubmenu
          actions={actions}
          rename={rename}
          labels={labels}
          onClose={() => setOpen(false)}
        />
      ) : null}
      <LiveRegion part="column-rename-announcer" statusRole={false}>
        {rename.announcement}
      </LiveRegion>
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
  onRenameColumn,
  sortBy,
  sortDir,
  dir,
  groupingPanel,
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState("");
  const rows = filterColumnMenuRows(columnMenuRows(allColumns, layout), query);
  useEscapeClose(opened, () => setOpened(false), {
    ignoreWithin: '[data-adapttable-part="column-rename-input"]',
  });
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
      // One owner for Escape. Mantine's own dismiss fires as soon as focus
      // is inside the dropdown, which is exactly where the rename editor
      // puts it — so a cancelled edit took the whole menu down with it.
      // `useEscapeClose` closes the menu from anywhere and leaves the key
      // alone when something inside has already handled it.
      closeOnEscape={false}
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
      <Popover.Dropdown dir={dir} aria-label={labels.columns}>
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
              onRenameColumn={onRenameColumn}
              groupingPanel={groupingPanel}
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
