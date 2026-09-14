/**
 * The assistant panel in Mantine — `@adapttable/mantine/assistant`.
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
  type TableAssistantSuggestionProps,
  type TableAssistantWindowProps,
} from "@adapttable/react/adapter";
import {
  ActionIcon,
  Badge,
  Button,
  Drawer,
  Menu,
  Paper,
  Select,
  Text,
  Textarea,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";

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
  icon,
  iconOnly,
  tooltip,
  variant = "secondary",
}: Readonly<TableAssistantButtonProps>) {
  if (iconOnly) {
    // Mantine's own icon control, so the header's controls are the size and
    // shape a Mantine reader already knows.
    const control = (
      <ActionIcon
        type="button"
        size="md"
        variant={variant === "primary" ? "filled" : "subtle"}
        color={variant === "primary" ? undefined : "gray"}
        aria-label={label}
        aria-expanded={expanded}
        data-adapttable-part={part}
        className={className}
        disabled={disabled}
        onClick={onClick}
      >
        {icon}
      </ActionIcon>
    );
    return tooltip ? (
      <Tooltip label={tooltip} withArrow>
        {control}
      </Tooltip>
    ) : (
      control
    );
  }
  return (
    <Button
      type="button"
      size="xs"
      variant={KIT_VARIANT[variant]}
      aria-label={label}
      aria-expanded={expanded}
      leftSection={icon}
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children ?? label}
    </Button>
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
    <UnstyledButton
      type="button"
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex",
        gap: "var(--mantine-spacing-xs)",
        alignItems: "flex-start",
        padding: "var(--mantine-spacing-xs)",
        borderRadius: "var(--mantine-radius-md)",
        border: "1px solid var(--mantine-color-default-border)",
        background: "var(--mantine-color-body)",
        textAlign: "start",
        width: "100%",
      }}
    >
      <Text
        component="span"
        c="dimmed"
        style={{ display: "flex", marginTop: 2 }}
      >
        {icon}
      </Text>
      <span>
        <Text
          component="span"
          fw={500}
          size="sm"
          display="block"
          data-adapttable-part="assistant-suggestion-title"
        >
          {title}
        </Text>
        {description ? (
          <Text
            component="span"
            c="dimmed"
            size="xs"
            display="block"
            data-adapttable-part="assistant-suggestion-description"
          >
            {description}
          </Text>
        ) : null}
      </span>
    </UnstyledButton>
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
      withBorder
      shadow="lg"
      radius="md"
      p="sm"
      role="dialog"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={style}
    >
      {children}
    </Paper>
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
      rows={1}
      // Grows with what is typed, up to a cap, without Mantine's JS autosize:
      // that one listens to APIs jsdom does not implement, so every test that
      // renders the composer dies before it asserts anything.
      // No resize grip either — the window sizes itself, and a grip that drags
      // the input over the transcript is not a control anyone wants here.
      resize="none"
      variant="unstyled"
      w="100%"
      styles={{
        input: {
          fieldSizing: "content",
          maxHeight: "8lh",
          minHeight: "1lh",
        },
      }}
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
  dir,
  children,
}: Readonly<TableAssistantSheetProps>) {
  return (
    // The compound form, because Mantine's shorthand `Drawer` puts loose
    // props on a root element that stays in the DOM while closed — the part
    // has to name the visible content, the way it does in every other kit.
    <Drawer.Root opened={open} onClose={onClose} position="bottom" size="90%">
      <Drawer.Overlay />
      <Drawer.Content
        aria-label={label}
        dir={dir}
        data-adapttable-part={part}
        className={className}
        style={{ display: "flex", flexDirection: "column" }}
      >
        {/* No Drawer.Header: the chrome draws one compact header — title,
            status, settings and close — and a kit header above it would say
            the same thing twice and close the sheet from two places. The
            surface is still named for assistive technology below. */}
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
/**
 * The dictation language chooser, in Mantine.
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
    <Select
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      size="xs"
      w="7.5rem"
      value={value}
      disabled={disabled}
      allowDeselect={false}
      comboboxProps={{ withinPortal: true }}
      data={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      onChange={(next) => {
        if (next) onChange(next);
      }}
    />
  );
}

/**
 * The examples menu, as Mantine's own — so it portals, positions and takes
 * the keyboard exactly like every other menu in a Mantine application.
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
  return (
    <Menu position="top-start" withinPortal>
      <Menu.Target>
        <Tooltip label={label} withinPortal>
          <ActionIcon
            type="button"
            size="md"
            variant="subtle"
            color="gray"
            aria-label={label}
            data-adapttable-part={part}
            className={className}
            disabled={disabled}
          >
            {icon}
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown style={{ maxHeight, overflowY: "auto" }}>
        {items.map((item) => (
          <Menu.Item
            key={item.id}
            data-adapttable-part={item.part}
            leftSection={item.icon}
            onClick={() => {
              onSelect(item.id);
            }}
          >
            <Text size="sm">{item.title}</Text>
            {item.description ? (
              <Text size="xs" c="dimmed">
                {item.description}
              </Text>
            ) : null}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

export function TableAssistant(props: Readonly<TableAssistantProps>) {
  return (
    <TableAssistantChrome
      // The colour the conversation is drawn in. Mantine's own primary, the colour its filled buttons already use.
      // Before the spread, so a host that names its own still wins.
      accent="var(--mantine-primary-color-filled, currentColor)"
      {...props}
      slots={{
        Panel: AssistantPanel,
        Sheet: AssistantSheet,
        Button: AssistantButton,
        Composer: AssistantInput,
        Badge: AssistantBadge,
        Window: AssistantWindow,
        Suggestion: AssistantSuggestion,
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
