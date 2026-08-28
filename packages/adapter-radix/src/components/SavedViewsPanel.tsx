/** The saved-views management panel, in Radix Themes. */
import {
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  type SavedViewsPanelEmptyProps,
  type SavedViewsPanelInputProps,
  type SavedViewsPanelRowProps,
  type SavedViewsPanelSlots,
  type SavedViewsPanelSurfaceProps,
} from "@adapttable/core/adapter";
import {
  Badge,
  Button,
  Card,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";

const slots: SavedViewsPanelSlots = {
  Surface: ({
    children,
    className,
    title,
    footer,
    ...rest
  }: SavedViewsPanelSurfaceProps) => (
    <Card size="1" className={className} {...rest}>
      <Text
        as="p"
        size="1"
        weight="bold"
        color="gray"
        mb="2"
        data-adapttable-part="saved-views-title"
      >
        {title.toUpperCase()}
      </Text>
      <Flex direction="column" gap="1">
        {children}
      </Flex>
      {footer && (
        <Text
          as="p"
          size="1"
          color="gray"
          mt="3"
          data-adapttable-part="saved-views-footer"
        >
          {footer}
        </Text>
      )}
    </Card>
  ),
  Empty: ({ message }: SavedViewsPanelEmptyProps) => (
    <Text size="2" color="gray">
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
    <TextField.Root
      size="1"
      value={value}
      ref={ref}
      aria-label={label}
      style={{ width: "100%" }}
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
            size="1"
            variant="ghost"
            color="gray"
            title={applyLabel}
            style={{
              flex: "1 1 auto",
              justifyContent: "flex-start",
              minWidth: 0,
              fontWeight: isDefault ? 600 : 400,
            }}
            onClick={onApply}
          >
            {viewName}
          </Button>
        )}
        {readOnly && (
          <Badge
            size="1"
            color="gray"
            data-adapttable-part="saved-view-readonly"
          >
            {readOnlyLabel}
          </Badge>
        )}
        {isDefault && (
          <Badge size="1" data-adapttable-part="saved-view-default">
            {defaultLabel}
          </Badge>
        )}
      </div>
      <div style={layout.controls} data-adapttable-part="saved-view-controls">
        {controls.map((control) => (
          <IconButton
            key={control.key}
            size="1"
            variant={control.pressed ? "soft" : "ghost"}
            color={control.danger ? "red" : "gray"}
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
