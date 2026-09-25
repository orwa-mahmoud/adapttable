import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  REORDER_COLUMN_KEY,
  type UseColumnLayoutResult,
} from "@adapttable/core";
import { columnReorderKeyProps, useColumnDragState } from "@adapttable/react";
import {
  type ColumnMenuAction,
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
  Button,
  Field,
  HStack,
  IconButton,
  Input,
  Popover,
  Separator,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

import { KitPortal } from "./kitPortal";
import { NativeSelect } from "./primitives";

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
}: Readonly<{
  rename: ColumnRenameEditorState;
  labels: ColumnMenuLabels;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <form
      data-adapttable-part="column-rename-form"
      onSubmit={(event) => {
        event.preventDefault();
        rename.submit();
      }}
    >
      <Field.Root invalid={Boolean(rename.error)}>
        <Field.Label
          htmlFor={rename.inputId}
          data-adapttable-part="column-rename-label"
          fontSize="xs"
          mb={1}
        >
          {labels.columnName}
        </Field.Label>
        <Input
          ref={inputRef}
          id={rename.inputId}
          value={rename.draft}
          aria-invalid={rename.error ? true : undefined}
          aria-describedby={rename.error ? rename.errorId : undefined}
          data-adapttable-part="column-rename-input"
          size="xs"
          onChange={(event) => rename.setDraft(event.target.value)}
          onBlur={rename.blur}
          onKeyDown={rename.onKeyDown}
        />
        {rename.error ? (
          <Text
            id={rename.errorId}
            role="alert"
            data-adapttable-part="column-rename-error"
            color="red.500"
            fontSize="xs"
            mt={1}
          >
            {rename.error}
          </Text>
        ) : null}
        <HStack gap={1} mt={1}>
          <Button
            type="submit"
            size="xs"
            colorPalette="teal"
            data-adapttable-part="column-rename-save"
          >
            {labels.saveColumnName}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            data-adapttable-part="column-rename-cancel"
            onClick={rename.cancel}
          >
            {labels.cancelColumnRename}
          </Button>
        </HStack>
      </Field.Root>
    </form>
  );
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
      size="xs"
      variant="ghost"
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
      fontSize="sm"
      flex={1}
      color={hidden ? "gray.500" : undefined}
      textDecoration={hidden ? "line-through" : undefined}
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
      size="xs"
      variant={pinned ? "solid" : "ghost"}
      colorPalette={pinned ? "teal" : "gray"}
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
      <HStack
        gap={1}
        py={0.5}
        cursor={canMove ? "grab" : "default"}
        opacity={"data-dragging" in indicator ? 0.4 : undefined}
        boxShadow={
          edge
            ? `inset 0 ${edgeOffset} 0 0 var(--chakra-colors-blue-500)`
            : undefined
        }
        {...(canMove
          ? {
              ...drag.rowDragProps(key, index),
              ...drag.dropProps(index, layout.move),
              ...indicator,
            }
          : {})}
      >
        <IconButton
          size="xs"
          variant="ghost"
          cursor={canMove ? "grab" : "default"}
          disabled={!canMove}
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
          size="xs"
          variant="ghost"
          data-adapttable-part="column-menu-more"
          aria-expanded={open}
          aria-label={`${labels.columnActions}: ${name}`}
          onClick={() => setOpen((value) => !value)}
        >
          ⋯
        </IconButton>
      </HStack>
      {open ? (
        <div data-adapttable-part="column-menu-submenu">
          {actions.map((action: ColumnMenuItem) =>
            "kind" in action ? (
              <Field.Root key={action.id} disabled={action.disabled}>
                <Field.Label fontSize="xs">{action.label}</Field.Label>
                <NativeSelect
                  size="xs"
                  aria-label={action.label}
                  value={action.value}
                  disabled={action.disabled}
                  data-adapttable-part="column-menu-choice"
                  onChange={(event) => action.onChange(event.target.value)}
                >
                  {action.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field.Root>
            ) : (
              <Button
                key={action.id}
                size="xs"
                variant="ghost"
                data-adapttable-part="column-menu-action"
                disabled={columnMenuActionDisabled(action, rename.editing)}
                onClick={() => runColumnMenuAction(action, setOpen)}
              >
                {action.label}
              </Button>
            )
          )}
          {rename.editing ? (
            <ColumnRenameForm rename={rename} labels={labels} />
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
 * Chakra column-management popover: per-column drag grip (reorder), eye
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
  onRenameColumn,
  sortBy,
  sortDir,
  dir,
  groupingPanel,
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const [query, setQuery] = useState("");
  const rows = filterColumnMenuRows(columnMenuRows(allColumns, layout), query);
  const actionsHidden = layout.isHidden(ACTIONS_COLUMN_KEY);
  const actionsPinned = layout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  // Controlled so Escape can close it: the kit's own dismissal does not
  // fire for every place focus can be inside this menu.
  const [menuOpen, setMenuOpen] = useState(false);
  useEscapeClose(
    menuOpen,
    () => {
      setMenuOpen(false);
    },
    { ignoreWithin: '[data-adapttable-part="column-rename-input"]' }
  );
  const reorderHidden = layout.isHidden(REORDER_COLUMN_KEY);
  const reorderPinned = layout.state.pinned[REORDER_COLUMN_KEY] !== undefined;
  return (
    <Popover.Root
      open={menuOpen}
      onOpenChange={(event) => {
        setMenuOpen(event.open);
      }}
      // One owner for Escape. Ark's own dismissal fires wherever focus sits
      // inside the panel — including the rename editor — so cancelling an
      // edit took the whole menu with it. `useEscapeClose` closes the menu
      // and leaves the key alone inside a control that owns it.
      closeOnEscape={false}
      positioning={{ placement: "bottom-end", flip: false }}
      lazyMount
    >
      <Popover.Trigger asChild>
        <Button
          size="sm"
          variant="outline"
          data-adapttable-part="column-menu-button"
        >
          {labels.columns}
        </Button>
      </Popover.Trigger>
      <KitPortal>
        <Popover.Positioner>
          <Popover.Content
            aria-label={labels.columns}
            minW="260px"
            w="auto"
            dir={dir}
            maxH="min(70vh, 480px)"
            overflowY="auto"
          >
            <Popover.Body px={2} py={2}>
              <Text
                fontSize="xs"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="0.06em"
                color="gray.500"
                px={1}
                pb={1}
              >
                {labels.columns}
              </Text>
              <Input
                type="search"
                size="xs"
                mb={1}
                data-adapttable-part="column-menu-search"
                placeholder={labels.searchColumns}
                aria-label={labels.searchColumns}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <HStack gap={1} mb={1} data-adapttable-part="column-menu-bulk">
                <Button
                  size="xs"
                  variant="ghost"
                  data-adapttable-part="column-menu-bulk-button"
                  onClick={() => showAllColumns(rows, layout)}
                >
                  {labels.showAllColumns}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  data-adapttable-part="column-menu-bulk-button"
                  onClick={() => hideAllColumns(rows, layout)}
                >
                  {labels.hideAllColumns}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  data-adapttable-part="column-menu-bulk-button"
                  onClick={() => unpinAllColumns(rows, layout)}
                >
                  {labels.unpinAllColumns}
                </Button>
              </HStack>
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
              {(hasRowReorder || hasRowActions) && <Separator my={1} />}
              {hasRowReorder && (
                <div data-adapttable-part="column-menu-item" data-reorder="">
                  <HStack gap={1} py={0.5}>
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
                  </HStack>
                </div>
              )}
              {hasRowActions && (
                <HStack gap={1} py={0.5}>
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
                </HStack>
              )}
              <Separator my={1} />
              <Button size="xs" variant="ghost" onClick={onAutoSize}>
                {labels.autoSizeColumns}
              </Button>
              <Button size="xs" variant="ghost" onClick={() => layout.reset()}>
                {labels.resetColumns}
              </Button>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </KitPortal>
    </Popover.Root>
  );
}
