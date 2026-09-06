/**
 * The assistant panel in Chakra UI — `@adapttable/chakra/assistant`.
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
import { Badge, Box, Button, Drawer, Textarea } from "@chakra-ui/react";

import { KitPortal } from "./components/kitPortal";

const BADGE_PALETTE: Record<string, string> = {
  neutral: "gray",
  busy: "blue",
  warning: "orange",
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
      size="sm"
      variant="subtle"
      colorPalette={BADGE_PALETTE[tone]}
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
    <Box
      as="section"
      borderWidth="1px"
      borderRadius="md"
      p="3"
      h="100%"
      minH="0"
      display="flex"
      flexDirection="column"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
    >
      {children}
    </Box>
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
      onOpenChange={(event) => {
        if (!event.open) onClose();
      }}
      placement="bottom"
      size="full"
    >
      <KitPortal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content
            aria-label={label}
            data-adapttable-part={part}
            className={className}
            display="flex"
            flexDirection="column"
            h="90dvh"
          >
            <Drawer.Body
              flex="1"
              minH="0"
              display="flex"
              flexDirection="column"
            >
              {children}
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </KitPortal>
    </Drawer.Root>
  );
}

/**
 * Ask this table a question, in Chakra UI.
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
