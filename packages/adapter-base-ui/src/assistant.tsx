/**
 * The assistant panel in Base UI — `@adapttable/base-ui/assistant`.
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
import { Drawer } from "@base-ui/react/drawer";

import { Badge, Button, Card, cx } from "./ui";

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

/**
 * Ask this table a question, in Base UI.
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
