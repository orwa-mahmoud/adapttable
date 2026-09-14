/**
 * The assistant panel in Base UI — `@adapttable/base-ui/assistant`.
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
import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "@base-ui/react/menu";

import { NativeSelect } from "./components/primitives";
import { Badge, Button, Card, cx, IconButton } from "./ui";

const BADGE_COLOR: Record<string, string> = {
  neutral: "gray",
  busy: "blue",
  warning: "amber",
  danger: "red",
};

/** How this kit spells the three prominences the chrome asks for. */
const KIT_VARIANT = {
  primary: "solid",
  secondary: "outline",
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
    return (
      <IconButton
        type="button"
        title={tooltip}
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
      {icon}
      {iconOnly ? null : (children ?? label)}
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
    <textarea
      rows={2}
      className={cx("adapttable-input", className)}
      style={{ width: "100%", resize: "vertical" }}
      aria-label={label}
      placeholder={placeholder}
      data-adapttable-part={part}
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
    <Drawer.Root
      open={open}
      swipeDirection="down"
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="adapttable-drawer-backdrop" />
        <Drawer.Viewport>
          <Drawer.Popup
            className={cx("adapttable-drawer", className)}
            dir={dir}
            data-adapttable-part={part}
            style={{ height: "90dvh" }}
          >
            <Drawer.Content
              className="adapttable-drawer-content"
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                height: "100%",
              }}
            >
              <Drawer.Title className="adapttable-drawer-title">
                {label}
              </Drawer.Title>
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
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
      role="dialog"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={{
        ...style,
        boxShadow: "var(--shadow-4, 0 10px 30px rgb(0 0 0 / 18%))",
      }}
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
        gap: "0.5rem",
        alignItems: "flex-start",
        padding: "0.5rem",
        borderRadius: "0.5rem",
        border: "1px solid",
        textAlign: "start",
        width: "100%",
        cursor: "pointer",
        background: "transparent",
        color: "inherit",
        font: "inherit",
      }}
    >
      <span style={{ display: "flex", marginTop: 2, opacity: 0.7 }}>
        {icon}
      </span>
      <span>
        <span
          style={{ display: "block", fontWeight: 500 }}
          data-adapttable-part="assistant-suggestion-title"
        >
          {title}
        </span>
        {description ? (
          <span
            style={{ display: "block", opacity: 0.7, fontSize: "0.85em" }}
            data-adapttable-part="assistant-suggestion-description"
          >
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/**
 * Ask this table a question, in Base UI.
 *
 * @public
 */
/**
 * The dictation language chooser, in Base UI.
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
 * The examples menu, on Base UI's own menu — its portal, its positioner and
 * the keyboard every other menu in this kit already uses.
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
    <Menu.Root>
      <Menu.Trigger
        render={
          <IconButton
            size="1"
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
        }
      />
      <Menu.Portal>
        <Menu.Positioner side="top" align="start">
          <Menu.Popup
            style={{
              minWidth: 200,
              maxHeight,
              overflowY: "auto",
              padding: 4,
              background: "var(--at-surface, #fff)",
              border: "1px solid var(--at-border, #d0d7de)",
              borderRadius: 8,
            }}
          >
            {items.map((item) => (
              <Menu.Item
                key={item.id}
                data-adapttable-part={item.part}
                onClick={() => {
                  onSelect(item.id);
                }}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  width: "100%",
                  padding: "6px 8px",
                }}
              >
                {item.icon}
                <span>
                  <span style={{ display: "block" }}>{item.title}</span>
                  {item.description ? (
                    <span style={{ display: "block", opacity: 0.7 }}>
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function TableAssistant(props: Readonly<TableAssistantProps>) {
  return (
    <TableAssistantChrome
      // The colour the conversation is drawn in. The accent this adapter's own stylesheet already draws with.
      // Before the spread, so a host that names its own still wins.
      accent="var(--adapttable-accent, currentColor)"
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
