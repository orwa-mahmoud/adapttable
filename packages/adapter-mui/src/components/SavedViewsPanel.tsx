/** The saved-views management panel, in MUI. */
import {
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  type SavedViewsPanelEmptyProps,
  type SavedViewsPanelInputProps,
  type SavedViewsPanelRowProps,
  type SavedViewsPanelSlots,
  type SavedViewsPanelSurfaceProps,
} from "@adapttable/core/adapter";
import {
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const slots: SavedViewsPanelSlots = {
  Surface: ({
    children,
    className,
    title,
    footer,
    ...rest
  }: SavedViewsPanelSurfaceProps) => (
    <Paper variant="outlined" sx={{ p: 1.5 }} className={className} {...rest}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", lineHeight: 1.6, mb: 0.5 }}
        data-adapttable-part="saved-views-title"
      >
        {title}
      </Typography>
      <Stack spacing={0.25}>{children}</Stack>
      {footer && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1.25 }}
          data-adapttable-part="saved-views-footer"
        >
          {footer}
        </Typography>
      )}
    </Paper>
  ),
  Empty: ({ message }: SavedViewsPanelEmptyProps) => (
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  ),
  Input: ({
    label,
    ref,
    value,
    onChange,
    onCommit,
    onCancel,
  }: SavedViewsPanelInputProps) => (
    <TextField
      size="small"
      fullWidth
      value={value}
      inputRef={ref}
      slotProps={{ htmlInput: { "aria-label": label } }}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") onCommit();
        if (event.key === "Escape") onCancel();
      }}
    />
  ),
  Row: ({
    name,
    viewName,
    isEditing,
    isDefault,
    readOnly,
    defaultLabel,
    readOnlyLabel,
    onApply,
    applyLabel,
    controls,
    layout,
    ...rest
  }: SavedViewsPanelRowProps) => (
    <div style={layout.row} {...rest}>
      <div style={layout.caption} data-adapttable-part="saved-view-caption">
        {isEditing ? (
          name
        ) : (
          <Button
            size="small"
            color="inherit"
            title={applyLabel}
            onClick={onApply}
            sx={{
              flex: "1 1 auto",
              justifyContent: "flex-start",
              textTransform: "none",
              fontWeight: isDefault ? 600 : 400,
              minWidth: 0,
            }}
          >
            {viewName}
          </Button>
        )}
        {readOnly && (
          <Chip
            size="small"
            variant="outlined"
            label={readOnlyLabel}
            data-adapttable-part="saved-view-readonly"
          />
        )}
        {isDefault && (
          <Chip
            size="small"
            label={defaultLabel}
            data-adapttable-part="saved-view-default"
          />
        )}
      </div>
      <div style={layout.controls} data-adapttable-part="saved-view-controls">
        {controls.map((control) => (
          <IconButton
            key={control.key}
            size="small"
            color={control.danger ? "error" : "default"}
            style={layout.control}
            aria-label={control.label}
            aria-pressed={control.pressed}
            title={control.label}
            disabled={!control.onPress}
            onClick={control.onPress}
          >
            {control.icon}
          </IconButton>
        ))}
      </div>
    </div>
  ),
};

/**
 * Manage saved views: apply, rename, reorder, default, delete.
 *
 * @public
 */
export function SavedViewsPanel(
  props: Readonly<Omit<SavedViewsPanelChromeProps, "slots">>
) {
  return <SavedViewsPanelChrome {...props} slots={slots} />;
}
