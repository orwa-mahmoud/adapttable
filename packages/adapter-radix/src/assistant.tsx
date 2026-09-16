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
  type TableAssistantMenuProps,
  type TableAssistantPanelProps,
  type TableAssistantProps,
  type TableAssistantSheetProps,
  type TableAssistantWindowProps,
} from "@adapttable/react/adapter";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DropdownMenu,
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
  const launcher = part === "assistant-launcher";
  if (iconOnly) {
    const control = (
      <IconButton
        type="button"
        size={launcher ? "4" : "1"}
        radius={launcher ? "full" : undefined}
        {...(launcher ? { style: { width: 56, height: 56 } } : {})}
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
  dir,
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
        dir={dir}
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

/**
 * The examples menu, as a Radix Themes dropdown — the same surface, the same
 * dismissal and the same typeahead as every other menu in the kit.
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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={disabled}>
        <IconButton
          type="button"
          size="2"
          variant="ghost"
          color="gray"
          aria-label={label}
          title={label}
          data-adapttable-part={part}
          className={className}
          disabled={disabled}
        >
          {icon}
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        side="top"
        align="start"
        style={{ maxHeight, overflowY: "auto" }}
      >
        {items.map((item) => (
          <DropdownMenu.Item
            key={item.id}
            data-adapttable-part={item.part}
            onSelect={() => {
              onSelect(item.id);
            }}
          >
            <span
              style={{
                display: "flex",
                gap: "var(--space-2)",
                alignItems: "flex-start",
              }}
            >
              {item.icon}
              <span>
                <Text size="2" as="div">
                  {item.title}
                </Text>
                {item.description ? (
                  <Text size="1" color="gray" as="div">
                    {item.description}
                  </Text>
                ) : null}
              </span>
            </span>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export function TableAssistant(props: Readonly<TableAssistantProps>) {
  return (
    <TableAssistantChrome
      // The colour the conversation is drawn in. Radix Themes' accent scale, step 9 — its solid accent.
      // Before the spread, so a host that names its own still wins.
      accent="var(--accent-9, currentColor)"
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
