/** The saved-views management panel, in Chakra UI. */
import {
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  type SavedViewsPanelEmptyProps,
  type SavedViewsPanelInputProps,
  type SavedViewsPanelRowProps,
  type SavedViewsPanelSlots,
  type SavedViewsPanelSurfaceProps,
} from "@adapttable/core/adapter";
import { Badge, Box, Button, IconButton, Input, Text } from "@chakra-ui/react";

import { subtleText } from "../styles";

const slots: SavedViewsPanelSlots = {
  Surface: ({
    children,
    className,
    title,
    footer,
    ...rest
  }: SavedViewsPanelSurfaceProps) => (
    <Box
      borderWidth="1px"
      borderRadius="md"
      padding="3"
      className={className}
      {...rest}
    >
      <Text
        fontSize="2xs"
        fontWeight="bold"
        letterSpacing="wider"
        textTransform="uppercase"
        marginBottom="2"
        data-adapttable-part="saved-views-title"
        {...subtleText}
      >
        {title}
      </Text>
      <Box display="flex" flexDirection="column" gap="0.5">
        {children}
      </Box>
      {footer && (
        <Text
          fontSize="xs"
          marginTop="2.5"
          data-adapttable-part="saved-views-footer"
          {...subtleText}
        >
          {footer}
        </Text>
      )}
    </Box>
  ),
  Empty: ({ message }: SavedViewsPanelEmptyProps) => (
    <Text fontSize="sm" {...subtleText}>
      {message}
    </Text>
  ),
  Input: ({
    label,
    ref,
    value,
    onChange,
    onCommit,
    onCancel,
  }: SavedViewsPanelInputProps) => (
    <Input
      size="xs"
      value={value}
      ref={ref}
      aria-label={label}
      width="100%"
      onChange={(event) => {
        onChange(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") onCommit();
        if (event.key === "Escape") onCancel();
      }}
    />
  ),
  Row: ({
    name,
    viewName,
    isEditing,
    isDefault,
    readOnly,
    defaultLabel,
    readOnlyLabel,
    onApply,
    applyLabel,
    controls,
    layout,
    ...rest
  }: SavedViewsPanelRowProps) => (
    <div style={layout.row} {...rest}>
      <div style={layout.caption} data-adapttable-part="saved-view-caption">
        {isEditing ? (
          name
        ) : (
          <Button
            size="xs"
            variant="ghost"
            flex="1 1 auto"
            minWidth="0"
            justifyContent="flex-start"
            fontWeight={isDefault ? "semibold" : "normal"}
            title={applyLabel}
            onClick={onApply}
          >
            {viewName}
          </Button>
        )}
        {readOnly && (
          <Badge
            size="sm"
            variant="outline"
            data-adapttable-part="saved-view-readonly"
          >
            {readOnlyLabel}
          </Badge>
        )}
        {isDefault && (
          <Badge size="sm" data-adapttable-part="saved-view-default">
            {defaultLabel}
          </Badge>
        )}
      </div>
      <div style={layout.controls} data-adapttable-part="saved-view-controls">
        {controls.map((control) => (
          <IconButton
            key={control.key}
            size="xs"
            variant="ghost"
            colorPalette={control.danger ? "red" : undefined}
            style={layout.control}
            aria-label={control.label}
            aria-pressed={control.pressed}
            title={control.label}
            disabled={!control.onPress}
            onClick={control.onPress}
          >
            {control.icon}
          </IconButton>
        ))}
      </div>
    </div>
  ),
};

/**
 * Manage saved views: apply, rename, reorder, default, delete.
 *
 * @public
 */
export function SavedViewsPanel(
  props: Readonly<Omit<SavedViewsPanelChromeProps, "slots">>
) {
  return <SavedViewsPanelChrome {...props} slots={slots} />;
}
