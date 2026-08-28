/** The pivot configuration panel, in MUI. */
import {
  type PivotAddProps,
  type PivotAggProps,
  type PivotFieldProps,
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
  type PivotPanelSurfaceProps,
  type PivotZoneProps,
} from "@adapttable/core/adapter";
import {
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

/** A control keeps the width of its own caption on a wrapping row. */
const NO_SHRINK = { flex: "0 0 auto" } as const;

const slots: PivotPanelSlots = {
  Surface: ({ children, className, ...rest }: PivotPanelSurfaceProps) => (
    <Stack spacing={1.5} className={className} {...rest}>
      {children}
    </Stack>
  ),
  // The fieldset groups the zone's fields for a screen reader; the outlined
  // box is the one MUI already draws around a legend — the same border, radius
  // and divider colour an outlined input uses — so the zone reads as a piece
  // of the kit rather than the browser's default frame.
  Zone: ({ label, children, zone, ...rest }: PivotZoneProps) => (
    <Stack
      component="fieldset"
      spacing={0.5}
      data-pivot-zone={zone}
      sx={{
        m: 0,
        minInlineSize: 0,
        px: 1.5,
        pt: 0.5,
        pb: 1.5,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
      }}
      {...rest}
    >
      <Typography
        component="legend"
        variant="caption"
        color="text.secondary"
        sx={{ px: 0.5 }}
      >
        {label}
      </Typography>
      {children}
    </Stack>
  ),
  Field: ({
    label,
    onMoveUp,
    onMoveDown,
    onRemove,
    moveUpLabel,
    moveDownLabel,
    removeLabel,
    aggregation,
    ...rest
  }: PivotFieldProps) => (
    // A panel is as often in a sidebar as in a page, so the row wraps rather
    // than squeezing: a field name and an aggregation that shrink to "s…" say
    // less than the same controls on two lines.
    <Stack
      direction="row"
      spacing={0.5}
      useFlexGap
      sx={{ alignItems: "center", flexWrap: "wrap", minWidth: 0 }}
      {...rest}
    >
      <Typography variant="body2" sx={{ flex: "1 1 auto", minWidth: 0 }}>
        {label}
      </Typography>
      {aggregation}
      {/* Glyph-only controls are MUI's IconButton, not a text Button held to
          its 64px minimum: three of those and an aggregation do not fit a
          sidebar, and the field they belong to is what gets squeezed. */}
      <IconButton
        size="small"
        sx={NO_SHRINK}
        aria-label={`${moveUpLabel}: ${label}`}
        disabled={!onMoveUp}
        onClick={onMoveUp}
      >
        {"↑"}
      </IconButton>
      <IconButton
        size="small"
        sx={NO_SHRINK}
        aria-label={`${moveDownLabel}: ${label}`}
        disabled={!onMoveDown}
        onClick={onMoveDown}
      >
        {"↓"}
      </IconButton>
      <IconButton
        size="small"
        sx={NO_SHRINK}
        aria-label={`${removeLabel}: ${label}`}
        onClick={onRemove}
      >
        {"✕"}
      </IconButton>
    </Stack>
  ),
  Add: ({ label, options, onAdd }: PivotAddProps) => (
    <TextField
      select
      size="small"
      label={label}
      value=""
      disabled={options.length === 0}
      slotProps={{ htmlInput: { "aria-label": label } }}
      onChange={(event) => {
        if (event.target.value) onAdd(event.target.value);
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.key} value={option.key}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  ),
  Agg: ({ label, value, options, onChange }: PivotAggProps) => (
    <TextField
      select
      size="small"
      value={value}
      sx={{ width: 100, ...NO_SHRINK }}
      slotProps={{ htmlInput: { "aria-label": label } }}
      onChange={(event) => {
        onChange(event.target.value as (typeof options)[number]);
      }}
    >
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  ),
};

/**
 * Configure a pivot: three zones, and buttons that move fields between them.
 *
 * @public
 */
export function PivotPanel(
  props: Readonly<Omit<PivotPanelChromeProps, "slots">>
) {
  return <PivotPanelChrome {...props} slots={slots} />;
}
