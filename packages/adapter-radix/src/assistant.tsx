/**
 * The assistant panel in Radix Themes — `@adapttable/radix/assistant`.
 *
 * Radix Themes ships no Drawer, so the narrow-viewport surface is its Dialog:
 * a real modal with the focus trap and backdrop the primitive already owns.
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
  Badge,
  Button,
  Card,
  Dialog,
  IconButton,
  Text,
  TextArea,
} from "@radix-ui/themes";

import { NativeSelect } from "./components/primitives";

const BADGE_COLOR = {
  neutral: "gray",
  busy: "blue",
  warning: "amber",
  danger: "red",
} as const;

/** How this kit spells the three prominences the chrome asks for. */
const KIT_VARIANT = {
  primary: "solid",
  secondary: "surface",
  subtle: "ghost",
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
        size="1"
        variant={variant === "primary" ? "solid" : "ghost"}
        color={variant === "primary" ? undefined : "gray"}
        aria-label={label}
        title={tooltip}
        aria-expanded={expanded}
        data-adapttable-part={part}
        className={className}
        disabled={disabled}
        onClick={onClick}
      >
        {icon}
      </IconButton>
    );
    // Radix's Tooltip mounts its own dismissable layer. Inside the sheet that
    // layer becomes the topmost one and swallows Escape, so the dialog stops
    // closing. `title` gives the same hint without another layer.
    return control;
  }
  return (
    <Button
      type="button"
      size="1"
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
    <TextArea
      size="1"
      rows={2}
      style={{ width: "100%" }}
      aria-label={label}
      placeholder={placeholder}
      data-adapttable-part={part}
      className={className}
      value={value}
      disabled={disabled}
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
    <Badge
      size="1"
      variant="soft"
      color={BADGE_COLOR[tone]}
      data-adapttable-part={part}
      data-tone={tone}
      className={className}
    >
      {label}
    </Badge>
  );
}

function AssistantPanel({
  label,
  part,
  className,
  children,
}: Readonly<TableAssistantPanelProps>) {
  return (
    <Card
      size="1"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </Card>
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
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Content
        aria-label={label}
        data-adapttable-part={part}
        className={className}
        style={{
          height: "90dvh",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Dialog.Title style={{ margin: 0 }}>{label}</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Root>
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
    <Card
      size="2"
      role="dialog"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={{ ...style, boxShadow: "var(--shadow-5)" }}
    >
      {children}
    </Card>
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
    <button
      type="button"
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex",
        gap: "var(--space-2)",
        alignItems: "flex-start",
        padding: "var(--space-2)",
        borderRadius: "var(--radius-3)",
        border: "1px solid var(--gray-a6)",
        background: "var(--color-panel-solid)",
        color: "inherit",
        font: "inherit",
        textAlign: "start",
        width: "100%",
        cursor: "pointer",
      }}
    >
      <Text as="span" color="gray" style={{ display: "flex", marginTop: 2 }}>
        {icon}
      </Text>
      <span>
        <Text
          as="span"
          size="2"
          weight="medium"
          style={{ display: "block" }}
          data-adapttable-part="assistant-suggestion-title"
        >
          {title}
        </Text>
        {description ? (
          <Text
            as="span"
            size="1"
            color="gray"
            style={{ display: "block" }}
            data-adapttable-part="assistant-suggestion-description"
          >
            {description}
          </Text>
        ) : null}
      </span>
    </button>
  );
}

/**
 * Ask this table a question, in Radix Themes.
 *
 * @public
 */
/**
 * The dictation language chooser, in Radix Themes.
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
    <NativeSelect
      size="1"
      width="7.5rem"
      className={className}
      aria-label={label}
      data-adapttable-part={part}
      value={value}
      disabled={disabled}
      options={options}
      onValueChange={onChange}
    />
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
