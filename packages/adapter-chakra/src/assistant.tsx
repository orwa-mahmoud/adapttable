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
  type TableAssistantSuggestionProps,
  type TableAssistantWindowProps,
} from "@adapttable/react/adapter";
import {
  Badge,
  Box,
  Button,
  Drawer,
  IconButton,
  Text,
  Textarea,
} from "@chakra-ui/react";

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
  icon,
  iconOnly,
  tooltip,
  variant = "secondary",
}: Readonly<TableAssistantButtonProps>) {
  if (iconOnly) {
    return (
      <IconButton
        type="button"
        size="sm"
        variant={variant === "primary" ? "solid" : "ghost"}
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
  }
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

function AssistantWindow({
  label,
  part,
  className,
  style,
  children,
}: Readonly<TableAssistantWindowProps>) {
  return (
    <Box
      as="section"
      role="dialog"
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="lg"
      bg="bg.panel"
      p="3"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={style}
    >
      {children}
    </Box>
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
    <Button
      type="button"
      variant="outline"
      height="auto"
      justifyContent="flex-start"
      textAlign="start"
      w="100%"
      display="flex"
      gap="2"
      alignItems="flex-start"
      py="2"
      px="2"
      whiteSpace="normal"
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      <Text as="span" color="fg.muted" display="flex" mt="0.5">
        {icon}
      </Text>
      <span>
        <Text
          as="span"
          fontWeight="medium"
          fontSize="sm"
          display="block"
          data-adapttable-part="assistant-suggestion-title"
        >
          {title}
        </Text>
        {description ? (
          <Text
            as="span"
            color="fg.muted"
            fontSize="xs"
            display="block"
            data-adapttable-part="assistant-suggestion-description"
          >
            {description}
          </Text>
        ) : null}
      </span>
    </Button>
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
        Window: AssistantWindow,
        Suggestion: AssistantSuggestion,
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
