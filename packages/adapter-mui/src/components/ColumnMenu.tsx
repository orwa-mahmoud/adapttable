import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  columnReorderKeyProps,
  REORDER_COLUMN_KEY,
  useColumnDragState,
  type UseColumnLayoutResult,
} from "@adapttable/core";
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
import {
  Box,
  Button,
  Divider,
  IconButton,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

/** The shared Columns-menu contract, declared once in core. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow>;

const NOOP_RENAME = () => undefined;

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
      sx={{ display: "grid", gap: 0.5, p: 0.5 }}
      onSubmit={(event) => {
        event.preventDefault();
        rename.submit();
      }}
    >
      <Typography
        component="label"
        htmlFor={rename.inputId}
        variant="caption"
        data-adapttable-part="column-rename-label"
      >
        {labels.columnName}
      </Typography>
      <TextField
        id={rename.inputId}
        inputRef={inputRef}
        size="small"
        fullWidth
        value={rename.draft}
        error={rename.error !== undefined}
        slotProps={{
          htmlInput: {
            "data-adapttable-part": "column-rename-input",
            "aria-invalid": rename.error ? "true" : undefined,
            "aria-describedby": rename.error ? rename.errorId : undefined,
          },
        }}
        onChange={(event) => rename.setDraft(event.target.value)}
        onBlur={rename.blur}
        onKeyDown={rename.onKeyDown}
      />
      {rename.error ? (
        <Typography
          id={rename.errorId}
          variant="caption"
          color="error"
          role="alert"
          data-adapttable-part="column-rename-error"
        >
          {rename.error}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={0.5}>
        <Button
          type="submit"
          size="small"
          variant="contained"
          data-adapttable-part="column-rename-save"
        >
          {labels.saveColumnName}
        </Button>
        <Button
          type="button"
          size="small"
          data-adapttable-part="column-rename-cancel"
          onClick={rename.cancel}
        >
          {labels.cancelColumnRename}
        </Button>
      </Stack>
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
    <Box data-adapttable-part="column-menu-submenu" sx={{ px: 0.5, pb: 0.5 }}>
      {actions.map((action) =>
        "kind" in action ? (
          <TextField
            key={action.id}
            select
            size="small"
            fullWidth
            label={action.label}
            value={action.value}
            disabled={action.disabled}
            data-adapttable-part="column-menu-choice"
            slotProps={{
              select: { inputProps: { "aria-label": action.label } },
            }}
            sx={{ my: 0.5 }}
            onChange={(event) => action.onChange(event.target.value)}
          >
            {action.options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <Button
            key={action.id}
            size="small"
            fullWidth
            data-adapttable-part="column-menu-action"
            disabled={
              action.disabled || (action.id === "rename" && rename.editing)
            }
            sx={{ justifyContent: "flex-start" }}
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
  groupingPanel: ColumnMenuProps<TRow>["groupingPanel"];
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
  onRenameColumn,
  sortBy,
  sortDir,
  groupingPanel,
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
              onRenameColumn={onRenameColumn}
              groupingPanel={groupingPanel}
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
