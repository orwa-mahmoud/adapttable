/**
 * The assistant panel in MUI — `@adapttable/mui/assistant`.
 */
import {
  createAdapterTableAssistantFeature,
  type TableAssistantBadgeProps,
  type TableAssistantButtonProps,
  TableAssistantChrome,
  type TableAssistantComposerProps,
  type TableAssistantLanguageChipProps,
  type TableAssistantPanelProps,
  type TableAssistantProps,
  type TableAssistantSheetProps,
  type TableAssistantSuggestionProps,
  type TableAssistantWindowProps,
} from "@adapttable/react/adapter";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Drawer,
  IconButton,
  Paper,
  TextField,
  Tooltip,
} from "@mui/material";

const CHIP_COLOR = {
  neutral: "default",
  busy: "info",
  warning: "warning",
  danger: "error",
} as const;

/** How this kit spells the three prominences the chrome asks for. */
const KIT_VARIANT = {
  primary: "contained",
  secondary: "outlined",
  subtle: "text",
} as const;

function AssistantButton({
  label,
  part,
  className,
  onClick,
  disabled,
  children,
  expanded,
  icon,
  iconOnly,
  tooltip,
  variant = "secondary",
}: Readonly<TableAssistantButtonProps>) {
  if (iconOnly) {
    const control = (
      <IconButton
        type="button"
        size="small"
        aria-label={label}
        aria-expanded={expanded}
        data-adapttable-part={part}
        className={className}
        disabled={disabled}
        onClick={onClick}
      >
        {icon}
      </IconButton>
    );
    return tooltip ? (
      <Tooltip title={tooltip}>{<span>{control}</span>}</Tooltip>
    ) : (
      control
    );
  }
  return (
    <Button
      type="button"
      startIcon={icon}
      size="small"
      variant={KIT_VARIANT[variant]}
      aria-label={label}
      aria-expanded={expanded}
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children ?? label}
    </Button>
  );
}

function AssistantInput({
  label,
  placeholder,
  part,
  className,
  value,
  disabled,
  onChange,
  onKeyDown,
}: Readonly<TableAssistantComposerProps>) {
  return (
    <TextField
      multiline
      minRows={1}
      maxRows={6}
      size="small"
      fullWidth
      label={undefined}
      placeholder={placeholder}
      className={className}
      value={value}
      disabled={disabled}
      // The part has to land on the control itself, not on MUI's wrapper:
      // an app styling or driving `assistant-input` means the textarea.
      slotProps={{
        htmlInput: { "aria-label": label, "data-adapttable-part": part },
      }}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      onKeyDown={onKeyDown}
    />
  );
}

function AssistantBadge({
  label,
  part,
  className,
  tone,
}: Readonly<TableAssistantBadgeProps>) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={CHIP_COLOR[tone]}
      label={label}
      data-adapttable-part={part}
      data-tone={tone}
      className={className}
    />
  );
}

function AssistantPanel({
  label,
  part,
  className,
  children,
}: Readonly<TableAssistantPanelProps>) {
  return (
    <Paper
      component="section"
      variant="outlined"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      sx={{
        p: 1.5,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {children}
    </Paper>
  );
}

function AssistantSheet({
  label,
  part,
  className,
  open,
  onClose,
  dir,
  children,
}: Readonly<TableAssistantSheetProps>) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          "aria-label": label,
          sx: {
            height: "90dvh",
            display: "flex",
            flexDirection: "column",
            p: 1.5,
          },
        },
      }}
      dir={dir}
      data-adapttable-part={part}
      className={className}
    >
      {children}
    </Drawer>
  );
}

function AssistantWindow({
  label,
  part,
  className,
  style,
  children,
}: Readonly<TableAssistantWindowProps>) {
  return (
    <Paper
      component="section"
      elevation={8}
      role="dialog"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={style}
      sx={{ p: 1.5, borderRadius: 2 }}
    >
      {children}
    </Paper>
  );
}

function AssistantSuggestion({
  title,
  description,
  icon,
  part,
  className,
  onClick,
  disabled,
}: Readonly<TableAssistantSuggestionProps>) {
  return (
    <ButtonBase
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      onClick={onClick}
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "flex-start",
        p: 1,
        borderRadius: 1.5,
        border: 1,
        borderColor: "divider",
        textAlign: "start",
        width: "100%",
        justifyContent: "flex-start",
      }}
    >
      <Box
        component="span"
        sx={{ display: "flex", mt: "2px", color: "text.secondary" }}
      >
        {icon}
      </Box>
      <Box component="span">
        <Box
          component="span"
          sx={{ display: "block", fontWeight: 500, fontSize: "0.875rem" }}
          data-adapttable-part="assistant-suggestion-title"
        >
          {title}
        </Box>
        {description ? (
          <Box
            component="span"
            sx={{
              display: "block",
              fontSize: "0.75rem",
              color: "text.secondary",
            }}
            data-adapttable-part="assistant-suggestion-description"
          >
            {description}
          </Box>
        ) : null}
      </Box>
    </ButtonBase>
  );
}

/**
 * Ask this table a question, in MUI.
 *
 * @public
 */
/**
 * The dictation language chooser, in MUI.
 *
 * Drawn only beside a mic that is already there, and only when more than one
 * language is offered — the chrome decides both. This is the kit's own
 * chooser, not a button with a list bolted on.
 */
function AssistantLanguageChip({
  label,
  value,
  options,
  part,
  className,
  onChange,
  disabled,
}: Readonly<TableAssistantLanguageChipProps>) {
  return (
    <TextField
      select
      size="small"
      variant="standard"
      className={className}
      disabled={disabled}
      value={value}
      slotProps={{
        select: { native: true },
        htmlInput: { "aria-label": label, "data-adapttable-part": part },
      }}
      sx={{ minWidth: "7.5rem" }}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </TextField>
  );
}

export function TableAssistant(props: Readonly<TableAssistantProps>) {
  return (
    <TableAssistantChrome
      {...props}
      slots={{
        Panel: AssistantPanel,
        Sheet: AssistantSheet,
        Button: AssistantButton,
        Composer: AssistantInput,
        Badge: AssistantBadge,
        Window: AssistantWindow,
        Suggestion: AssistantSuggestion,
        LanguageChip: AssistantLanguageChip,
      }}
    />
  );
}

/**
 * Bind this kit's assistant panel to the assistant slot.
 *
 * @public
 */
export function tableAssistant() {
  return createAdapterTableAssistantFeature(TableAssistant);
}
