/**
 * The assistant panel in Mantine — `@adapttable/mantine/assistant`.
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
import { Badge, Button, Drawer, Paper, Textarea } from "@mantine/core";

const BADGE_COLOR: Record<string, string> = {
  neutral: "gray",
  busy: "blue",
  warning: "yellow",
  danger: "red",
};

/** How this kit spells the three prominences the chrome asks for. */
const KIT_VARIANT = {
  primary: "filled",
  secondary: "default",
  subtle: "subtle",
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
      size="xs"
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
    <Textarea
      rows={2}
      resize="vertical"
      w="100%"
      aria-label={label}
      placeholder={placeholder}
      data-adapttable-part={part}
      className={className}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.currentTarget.value);
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
      size="sm"
      variant="light"
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
    <Paper
      component="section"
      withBorder
      p="sm"
      h="100%"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
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
    // The compound form, because Mantine's shorthand `Drawer` puts loose
    // props on a root element that stays in the DOM while closed — the part
    // has to name the visible content, the way it does in every other kit.
    <Drawer.Root opened={open} onClose={onClose} position="bottom" size="90%">
      <Drawer.Overlay />
      <Drawer.Content
        data-adapttable-part={part}
        className={className}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <Drawer.Header>
          <Drawer.Title>{label}</Drawer.Title>
          <Drawer.CloseButton />
        </Drawer.Header>
        <Drawer.Body
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {children}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  );
}

/**
 * Ask this table a question, in Mantine.
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
