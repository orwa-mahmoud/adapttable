/**
 * The assistant panel in MUI — `@adapttable/mui/assistant`.
 */
import {
  createAdapterTableAssistantFeature,
  type TableAssistantBadgeProps,
  type TableAssistantButtonProps,
  TableAssistantChrome,
  type TableAssistantComposerProps,
  type TableAssistantPanelProps,
  type TableAssistantProps,
  type TableAssistantSheetProps,
} from "@adapttable/react/adapter";
import { Button, Chip, Drawer, Paper, TextField } from "@mui/material";

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
  variant = "secondary",
}: Readonly<TableAssistantButtonProps>) {
  return (
    <Button
      type="button"
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
      data-adapttable-part={part}
      className={className}
    >
      {children}
    </Drawer>
  );
}

/**
 * Ask this table a question, in MUI.
 *
 * @public
 */
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
