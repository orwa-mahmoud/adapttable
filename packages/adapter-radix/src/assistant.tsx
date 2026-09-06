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
  type TableAssistantPanelProps,
  type TableAssistantProps,
  type TableAssistantSheetProps,
} from "@adapttable/react/adapter";
import { Badge, Button, Card, Dialog, TextArea } from "@radix-ui/themes";

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
  variant = "secondary",
}: Readonly<TableAssistantButtonProps>) {
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

/**
 * Ask this table a question, in Radix Themes.
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
