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
  HStack,
  IconButton,
  Input,
  Popover,
  Separator,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";

import { KitPortal } from "./kitPortal";

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
  /** Text direction — flips the row layout (grip ↔ pin) under RTL, since the
   *  menu portals to `<body>` and would otherwise lose the table's direction. */
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
          {actions.map((action) => (
            <Button
              key={action.id}
              size="xs"
              variant="ghost"
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
    <Popover.Root
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
