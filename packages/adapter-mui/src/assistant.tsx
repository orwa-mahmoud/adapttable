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
  type TableAssistantMenuProps,
  type TableAssistantPanelProps,
  type TableAssistantProps,
  type TableAssistantSheetProps,
  type TableAssistantWindowProps,
} from "@adapttable/react/adapter";
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";

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
  const launcher = part === "assistant-launcher";
  if (iconOnly) {
    const control = (
      <IconButton
        type="button"
        size={launcher ? "large" : "small"}
        {...(launcher ? { sx: { width: 56, height: 56 } } : {})}
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

/**
 * The examples menu, as MUI's own — the same anchored surface, transitions
 * and keyboard a MUI reader gets from every other menu in the application.
 */
function AssistantMenu({
  label,
  part,
  className,
  icon,
  disabled,
  items,
  onSelect,
  maxHeight,
}: Readonly<TableAssistantMenuProps>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={label}>
        <span>
          <IconButton
            type="button"
            size="small"
            aria-label={label}
            aria-haspopup="menu"
            aria-expanded={anchor !== null}
            data-adapttable-part={part}
            className={className}
            disabled={disabled}
            onClick={(event) => {
              setAnchor(event.currentTarget);
            }}
          >
            {icon}
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => {
          setAnchor(null);
        }}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { maxHeight, overflowY: "auto" } } }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.id}
            data-adapttable-part={item.part}
            onClick={() => {
              setAnchor(null);
              onSelect(item.id);
            }}
          >
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              {item.icon}
              <Box>
                <Typography variant="body2">{item.title}</Typography>
                {item.description ? (
                  <Typography variant="caption" color="text.secondary">
                    {item.description}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function TableAssistant(props: Readonly<TableAssistantProps>) {
  return (
    <TableAssistantChrome
      // The colour the conversation is drawn in. The theme's primary as MUI publishes it, or MUI's own default when the host is not using its CSS-variable theme.
      // Before the spread, so a host that names its own still wins.
      accent="var(--mui-palette-primary-main, #1976d2)"
      {...props}
      slots={{
        Panel: AssistantPanel,
        Sheet: AssistantSheet,
        Button: AssistantButton,
        Composer: AssistantInput,
        Badge: AssistantBadge,
        Window: AssistantWindow,
        Menu: AssistantMenu,
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
