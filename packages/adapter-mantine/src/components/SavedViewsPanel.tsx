/** The saved-views management panel, in Mantine. */
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
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

const slots: SavedViewsPanelSlots = {
  Surface: ({
    children,
    className,
    title,
    footer,
    ...rest
  }: SavedViewsPanelSurfaceProps) => (
    <Card withBorder radius="md" padding="sm" className={className} {...rest}>
      <Text
        fz={11}
        fw={700}
        tt="uppercase"
        c="dimmed"
        mb={8}
        data-adapttable-part="saved-views-title"
      >
        {title}
      </Text>
      <Stack gap={2}>{children}</Stack>
      {footer && (
        <Text
          fz="xs"
          c="dimmed"
          mt={10}
          data-adapttable-part="saved-views-footer"
        >
          {footer}
        </Text>
      )}
    </Card>
  ),
  Empty: ({ message }: SavedViewsPanelEmptyProps) => (
    <Text fz="sm" c="dimmed">
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
    <TextInput
      size="xs"
      aria-label={label}
      value={value}
      ref={ref}
      w="100%"
      onChange={(event) => {
        onChange(event.currentTarget.value);
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
            variant="subtle"
            color="gray"
            size="compact-sm"
            justify="start"
            title={applyLabel}
            style={{ flex: "1 1 auto", minWidth: 0 }}
            onClick={onApply}
          >
            <Text fz="sm" fw={isDefault ? 650 : 400} truncate>
              {viewName}
            </Text>
          </Button>
        )}
        <Group gap={4} wrap="nowrap">
          {readOnly && (
            <Badge
              size="xs"
              color="gray"
              variant="light"
              data-adapttable-part="saved-view-readonly"
            >
              {readOnlyLabel}
            </Badge>
          )}
          {isDefault && (
            <Badge size="xs" data-adapttable-part="saved-view-default">
              {defaultLabel}
            </Badge>
          )}
        </Group>
      </div>
      <div style={layout.controls} data-adapttable-part="saved-view-controls">
        {controls.map((control) => (
          <ActionIcon
            key={control.key}
            size="sm"
            variant={control.pressed ? "light" : "subtle"}
            color={control.danger ? "red" : "gray"}
            style={layout.control}
            aria-label={control.label}
            aria-pressed={control.pressed}
            disabled={!control.onPress}
            onClick={control.onPress}
          >
            {control.icon}
          </ActionIcon>
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
