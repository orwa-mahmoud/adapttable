import type { Direction } from "@adapttable/core";
import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  columnReorderKeyProps,
  useColumnDragState,
} from "@adapttable/core";
import type { ColumnMenuChromeProps } from "@adapttable/core/adapter";
import {
  EyeIcon,
  GripIcon,
  nextPinSide,
  pinActionLabel,
  PinIcon,
} from "@adapttable/core/adapter";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";

/** Props for the column menu — the shared core contract + actions wiring. */
export interface ColumnMenuProps<TRow> extends ColumnMenuChromeProps<TRow> {
  /** Resolved labels, including the trailing actions-column entry's name. */
  labels: ColumnMenuChromeProps<TRow>["labels"] & { actions: string };
  /** Whether the table has row actions — lists the injected actions column. */
  hasRowActions?: boolean;
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
}: Readonly<{
  hidden: boolean;
  name: string;
  labels: RowLabels;
  onToggle: () => void;
}>) {
  return (
    <IconButton
      size="small"
      aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
      aria-pressed={!hidden}
      color={hidden ? "default" : "primary"}
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
}: Readonly<{ active: boolean; label: string; onClick: () => void }>) {
  return (
    <IconButton
      size="small"
      color={active ? "primary" : "default"}
      aria-label={label}
      onClick={onClick}
    >
      <PinIcon />
    </IconButton>
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
    <>
      <Divider sx={{ my: 0.5 }} />
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
    </>
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
  hasRowActions,
  dir,
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <Button
        size="small"
        variant="outlined"
        aria-expanded={anchor !== null}
        aria-haspopup="true"
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        {labels.columns}
      </Button>
      <Popover
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box dir={dir} sx={{ p: 0.75, minWidth: 250 }}>
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
          {columnMenuRows(allColumns, layout).map((r) => {
            // Drop-position feedback: dim the source, line the landing edge.
            const indicator = drag.rowAttrs(r.key, r.index);
            const edge = indicator["data-drop"];
            const edgeOffset = edge === "before" ? "2px" : "-2px";
            return (
              <Stack
                key={r.key}
                direction="row"
                spacing={0.5}
                sx={{
                  alignItems: "center",
                  px: 0.5,
                  py: 0.25,
                  cursor: "grab",
                  opacity: "data-dragging" in indicator ? 0.4 : undefined,
                  boxShadow: edge
                    ? (theme) =>
                        `inset 0 ${edgeOffset} 0 0 ${theme.palette.primary.main}`
                    : undefined,
                }}
                {...drag.rowDragProps(r.key, r.index)}
                {...drag.dropProps(r.index, layout.move)}
                {...indicator}
              >
                <IconButton
                  size="small"
                  sx={{ cursor: "grab", color: "text.disabled" }}
                  {...columnReorderKeyProps(
                    r.key,
                    r.index,
                    layout.move,
                    `${labels.moveStart} / ${labels.moveEnd}: ${r.name}`
                  )}
                >
                  <GripIcon />
                </IconButton>
                <VisibilityToggle
                  hidden={r.hidden}
                  name={r.name}
                  labels={labels}
                  onToggle={() => layout.toggleVisible(r.key)}
                />
                <RowName hidden={r.hidden} name={r.name} />
                <PinToggle
                  active={r.pinned !== undefined}
                  label={`${pinActionLabel(r.pinned, labels)}: ${r.name}`}
                  onClick={() => layout.setPinned(r.key, nextPinSide(r.pinned))}
                />
              </Stack>
            );
          })}
          {hasRowActions && <ActionsRow layout={layout} labels={labels} />}
          <Divider sx={{ my: 0.5 }} />
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
