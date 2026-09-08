/** The interactive row-grouping strip, rendered with MUI controls. */
import {
  GripIcon,
  type GroupingPanelChipProps,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelDropZoneProps,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelSelectProps,
  type GroupingPanelSlots,
  type GroupingPanelSurfaceProps,
} from "@adapttable/react/adapter";
import {
  Box,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const TOUCH_TARGET = 44;

/**
 * How wide one insertion boundary is — one width, whatever is happening.
 * A caret that grows when a drag starts, or when the pointer reaches it,
 * moves every chip after it sideways mid-drag.
 */
function dropZoneWidth(): number {
  return 12;
}

const slots: GroupingPanelSlots = {
  Surface: ({
    children,
    label,
    mobile,
    ...rest
  }: GroupingPanelSurfaceProps) => (
    <Paper
      component="section"
      variant="outlined"
      role="region"
      aria-label={label}
      sx={{ p: 1 }}
      {...rest}
    >
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap",
          minWidth: 0,
          "& > [data-adapttable-part='grouping-item']": {
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
          },
          "& > [data-adapttable-part='grouping-aggregate-controls']": {
            display: "inline-flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 0.75,
          },
          ...(mobile ? { alignItems: "stretch" } : {}),
        }}
      >
        {children}
      </Stack>
    </Paper>
  ),
  DropZone: ({
    label,
    empty,
    active,
    dragging,
    dropProps,
    ...rest
  }: GroupingPanelDropZoneProps) => (
    <Box
      role="group"
      aria-label={label}
      {...dropProps}
      {...rest}
      data-dragging={dragging || undefined}
      sx={
        empty
          ? {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: TOUCH_TARGET,
              minWidth: 156,
              px: 1.5,
              border: 1,
              borderStyle: "dashed",
              borderColor: active ? "primary.main" : "divider",
              borderRadius: 1,
              bgcolor: active ? "action.selected" : "transparent",
              color: active ? "primary.main" : "text.secondary",
              transition: (theme) =>
                theme.transitions.create(["border-color", "background-color"]),
            }
          : {
              alignSelf: "stretch",
              minWidth: dropZoneWidth(),
              minHeight: TOUCH_TARGET,
              borderInlineStart: 2,
              borderColor: active ? "primary.main" : "divider",
              bgcolor: active ? "action.selected" : "transparent",
              borderRadius: 0.5,
              transition: (theme) =>
                theme.transitions.create([
                  "min-width",
                  "border-color",
                  "background-color",
                ]),
            }
      }
    >
      {empty ? <Typography variant="caption">{label}</Typography> : null}
    </Box>
  ),
  Chip: ({
    label,
    level,
    dragProps,
    keyboardProps,
    onRemove,
    removeLabel,
    ...rest
  }: GroupingPanelChipProps) => (
    <Paper
      component="span"
      variant="outlined"
      {...rest}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: TOUCH_TARGET,
        overflow: "hidden",
        "&:has([data-grouping-dragging])": {
          opacity: 0.55,
          borderColor: "primary.main",
        },
      }}
    >
      <IconButton
        size="small"
        data-adapttable-part="grouping-chip-handle"
        {...dragProps}
        {...keyboardProps}
        sx={{
          minWidth: TOUCH_TARGET,
          minHeight: TOUCH_TARGET,
          borderRadius: 0,
          cursor: "grab",
          color: "text.secondary",
          touchAction: "none",
        }}
      >
        <GripIcon />
      </IconButton>
      <Typography
        component="span"
        variant="body2"
        sx={{ px: 0.5, whiteSpace: "nowrap" }}
      >
        {level}. {label}
      </Typography>
      <IconButton
        size="small"
        data-adapttable-part="grouping-chip-remove"
        aria-label={removeLabel}
        onClick={onRemove}
        sx={{
          minWidth: TOUCH_TARGET,
          minHeight: TOUCH_TARGET,
          borderRadius: 0,
        }}
      >
        {"×"}
      </IconButton>
    </Paper>
  ),
  Select: ({
    label,
    value,
    options,
    onChange,
    disabled,
    "data-adapttable-part": part,
  }: GroupingPanelSelectProps) => (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      disabled={disabled}
      data-adapttable-part={part}
      slotProps={{
        select: { inputProps: { "aria-label": label } },
      }}
      sx={{
        minWidth: 156,
        flex: "0 1 220px",
        "& .MuiInputBase-root": { minHeight: TOUCH_TARGET },
      }}
      onChange={(event) => onChange(event.target.value)}
    >
      {part === "grouping-add" ? (
        <MenuItem value="" disabled>
          {label}
        </MenuItem>
      ) : null}
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  ),
  RemoveZone: ({
    label,
    active,
    dropProps,
    ...rest
  }: GroupingPanelRemoveZoneProps) => (
    <Paper
      variant="outlined"
      role="region"
      aria-label={label}
      {...dropProps}
      {...rest}
      sx={{
        // The way out of a grouping owns its row: a reader with a chip in the
        // air has one obvious place to let go of it.
        flex: "1 1 auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: TOUCH_TARGET,
        px: 1.5,
        borderStyle: "dashed",
        borderColor: active ? "error.main" : "divider",
        bgcolor: active ? "error.main" : "transparent",
        color: active ? "error.contrastText" : "text.secondary",
        transition: (theme) =>
          theme.transitions.create([
            "border-color",
            "background-color",
            "color",
          ]),
      }}
    >
      <Typography variant="caption" color="inherit">
        {label}
      </Typography>
    </Paper>
  ),
};

/** Configure row grouping by drag, keyboard, or kit-native selects. @public */
export function GroupingPanel<TRow>(
  props: Readonly<Omit<GroupingPanelChromeProps<TRow>, "slots">>
) {
  return <GroupingPanelChrome {...props} slots={slots} />;
}
