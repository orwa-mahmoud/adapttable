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
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";

/** Props for the column menu — the shared core contract + actions wiring. */
export interface ColumnMenuProps<TRow> extends ColumnMenuChromeProps<TRow> {
  /** Resolved labels, including the trailing actions-column entry's name. */
  labels: ColumnMenuChromeProps<TRow>["labels"] & {
    actions: string;
    reorderRow: string;
  };
  /** Whether the table has row actions — lists the injected actions column. */
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
  /** Column key currently sorted by, if any. */
  sortBy?: string;
  /** Direction for `sortBy`. */
  sortDir?: "asc" | "desc";
  /** Text direction — the Popover portals to `<body>`, so it loses the
   *  table's direction unless we hand it over explicitly (RTL flips
   *  grip ↔ pin). */
  dir?: Direction;
}

/** Labels the visibility toggle and the row name share. */
interface RowLabels {
  showColumn: string;
  hideColumn: string;
}

/** Eye show/hide toggle — shared by the data rows and the actions row. */
function VisibilityToggle({
  hidden,
  name,
  labels,
  onToggle,
  disabled = false,
}: Readonly<{
  hidden: boolean;
  name: string;
  labels: RowLabels;
  onToggle: () => void;
  disabled?: boolean;
}>) {
  return (
    <IconButton
      size="small"
      aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
      aria-pressed={!hidden}
      color={hidden ? "default" : "primary"}
      disabled={disabled}
      onClick={onToggle}
    >
      <EyeIcon off={hidden} />
    </IconButton>
  );
}

/** Row name — struck through and dimmed while the column is hidden. */
function RowName({
  hidden,
  name,
}: Readonly<{ hidden: boolean; name: string }>) {
  return (
    <Typography
      variant="body2"
      sx={{
        flex: 1,
        color: hidden ? "text.disabled" : "text.primary",
        textDecoration: hidden ? "line-through" : "none",
      }}
    >
      {name}
    </Typography>
  );
}

/** Pin button — shared markup; the caller decides the cycle and the label. */
function PinToggle({
  active,
  label,
  onClick,
  disabled = false,
}: Readonly<{
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}>) {
  return (
    <IconButton
      size="small"
      color={active ? "primary" : "default"}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <PinIcon />
    </IconButton>
  );
}

function ReorderRow<TRow>({
  layout,
  labels,
}: Readonly<Pick<ColumnMenuProps<TRow>, "layout" | "labels">>) {
  const hidden = layout.isHidden(REORDER_COLUMN_KEY);
  const pinned = layout.state.pinned[REORDER_COLUMN_KEY] !== undefined;
  return (
    <div data-adapttable-part="column-menu-item" data-reorder="">
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ px: 0.5, py: 0.25, alignItems: "center" }}
      >
        <Box aria-hidden sx={{ width: 24 }} />
        <VisibilityToggle
          hidden={hidden}
          name={labels.reorderRow}
          labels={labels}
          onToggle={() => layout.toggleVisible(REORDER_COLUMN_KEY)}
        />
        <RowName hidden={hidden} name={labels.reorderRow} />
        <PinToggle
          active={pinned}
          label={`${pinned ? labels.unpin : labels.pinStart}: ${labels.reorderRow}`}
          onClick={() =>
            layout.setPinned(REORDER_COLUMN_KEY, pinned ? undefined : "start")
          }
        />
      </Stack>
    </div>
  );
}

/**
 * Trailing menu row for the injected row-actions column. It is not a data
 * column — no reorder grip, no left pin — but the layout state treats the
 * reserved `"actions"` key like any other, so the eye hides it and the pin is
 * a ONE-CLICK right↔unpinned toggle (the column always trails, so a left pin
 * would be meaningless).
 */
function ActionsRow<TRow>({
  layout,
  labels,
}: Readonly<Pick<ColumnMenuProps<TRow>, "layout" | "labels">>) {
  const hidden = layout.isHidden(ACTIONS_COLUMN_KEY);
  const pinned = layout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ px: 0.5, py: 0.25, alignItems: "center" }}
    >
      {/* Spacer where data rows show the drag grip — actions never move. */}
      <Box aria-hidden sx={{ width: 24 }} />
      <VisibilityToggle
        hidden={hidden}
        name={labels.actions}
        labels={labels}
        onToggle={() => layout.toggleVisible(ACTIONS_COLUMN_KEY)}
      />
      <RowName hidden={hidden} name={labels.actions} />
      <PinToggle
        active={pinned}
        label={`${pinned ? labels.unpin : labels.pinEnd}: ${labels.actions}`}
        onClick={() =>
          layout.setPinned(ACTIONS_COLUMN_KEY, pinned ? undefined : "end")
        }
      />
    </Stack>
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
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "center",
          px: 0.5,
          py: 0.25,
          cursor: canMove ? "grab" : "default",
          opacity: "data-dragging" in indicator ? 0.4 : undefined,
          boxShadow: edge
            ? (theme) =>
                `inset 0 ${edgeOffset} 0 0 ${theme.palette.primary.main}`
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
          size="small"
          disabled={!canMove}
          sx={{ cursor: canMove ? "grab" : "default", color: "text.disabled" }}
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
          active={pinned !== undefined}
          label={`${pinActionLabel(pinned, labels)}: ${name}`}
          disabled={!canPin}
          onClick={() => layout.setPinned(key, nextPinSide(pinned))}
        />
        <IconButton
          size="small"
          data-adapttable-part="column-menu-more"
          aria-expanded={open}
          aria-label={`${labels.columnActions}: ${name}`}
          onClick={() => setOpen((value) => !value)}
        >
          ⋯
        </IconButton>
      </Stack>
      {open ? (
        <Box
          data-adapttable-part="column-menu-submenu"
          sx={{ px: 0.5, pb: 0.5 }}
        >
          {actions.map((action) => (
            <Button
              key={action.id}
              size="small"
              fullWidth
              data-adapttable-part="column-menu-action"
              disabled={action.disabled}
              sx={{ justifyContent: "flex-start" }}
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
 * MUI column-management popover: per-column drag grip (reorder), eye
 * (show/hide), and pin toggle. A `Popover` (not a `Menu`) so list keyboard
 * navigation never fights the grip's arrow-key reorder. With row actions, a
 * separated trailing row manages the injected actions column too.
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
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [query, setQuery] = useState("");
  const rows = filterColumnMenuRows(columnMenuRows(allColumns, layout), query);
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        aria-expanded={anchor !== null}
        aria-haspopup="true"
        data-adapttable-part="column-menu-button"
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        {labels.columns}
      </Button>
      <Popover
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        marginThreshold={0}
      >
        <Box
          role="group"
          aria-label={labels.columns}
          dir={dir}
          sx={{
            p: 0.75,
            minWidth: 250,
            maxHeight: anchor
              ? Math.max(
                  120,
                  Math.min(
                    480,
                    window.innerHeight -
                      anchor.getBoundingClientRect().bottom -
                      8
                  )
                )
              : 480,
            overflowY: "auto",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: "block",
              px: 1,
              pb: 0.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "text.secondary",
            }}
          >
            {labels.columns}
          </Typography>
          <TextField
            type="search"
            size="small"
            fullWidth
            placeholder={labels.searchColumns}
            slotProps={{
              htmlInput: {
                "aria-label": labels.searchColumns,
                "data-adapttable-part": "column-menu-search",
              },
            }}
            value={query}
            sx={{ mb: 0.75 }}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Stack
            direction="row"
            spacing={0.5}
            data-adapttable-part="column-menu-bulk"
            sx={{ px: 0.5, pb: 0.75, flexWrap: "wrap" }}
          >
            <Button
              size="small"
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => showAllColumns(rows, layout)}
            >
              {labels.showAllColumns}
            </Button>
            <Button
              size="small"
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => hideAllColumns(rows, layout)}
            >
              {labels.hideAllColumns}
            </Button>
            <Button
              size="small"
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => unpinAllColumns(rows, layout)}
            >
              {labels.unpinAllColumns}
            </Button>
          </Stack>
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
          {(hasRowReorder || hasRowActions) && <Divider sx={{ my: 0.5 }} />}
          {hasRowReorder && <ReorderRow layout={layout} labels={labels} />}
          {hasRowActions && <ActionsRow layout={layout} labels={labels} />}
          <Divider sx={{ my: 0.5 }} />
          <Button
            size="small"
            fullWidth
            sx={{ justifyContent: "flex-start" }}
            onClick={onAutoSize}
          >
            {labels.autoSizeColumns}
          </Button>
          <Button
            size="small"
            fullWidth
            sx={{ justifyContent: "flex-start" }}
            onClick={() => layout.reset()}
          >
            {labels.resetColumns}
          </Button>
        </Box>
      </Popover>
    </>
  );
}
