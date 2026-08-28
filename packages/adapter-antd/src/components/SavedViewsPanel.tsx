/** The saved-views management panel, in Ant Design. */
import {
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  type SavedViewsPanelEmptyProps,
  type SavedViewsPanelInputProps,
  type SavedViewsPanelRowProps,
  type SavedViewsPanelSlots,
  type SavedViewsPanelSurfaceProps,
} from "@adapttable/core/adapter";
import { Button, Card, Flex, Input, Tag, Typography } from "antd";

const slots: SavedViewsPanelSlots = {
  Surface: ({
    children,
    className,
    title,
    footer,
    ...rest
  }: SavedViewsPanelSurfaceProps) => (
    <Card
      size="small"
      title={
        <span data-adapttable-part="saved-views-title">
          <Typography.Text type="secondary" style={{ fontSize: 11 }} strong>
            {title.toUpperCase()}
          </Typography.Text>
        </span>
      }
      className={className}
      {...rest}
    >
      <Flex vertical gap={2}>
        {children}
      </Flex>
      {footer && (
        <Typography.Text
          type="secondary"
          style={{ display: "block", marginBlockStart: 10, fontSize: 12 }}
          data-adapttable-part="saved-views-footer"
        >
          {footer}
        </Typography.Text>
      )}
    </Card>
  ),
  Empty: ({ message }: SavedViewsPanelEmptyProps) => (
    <Typography.Text type="secondary">{message}</Typography.Text>
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
      size="small"
      value={value}
      ref={(instance) => {
        ref(instance?.input ?? null);
      }}
      aria-label={label}
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
            type="text"
            size="small"
            title={applyLabel}
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              textAlign: "start",
              fontWeight: isDefault ? 600 : 400,
            }}
            onClick={onApply}
          >
            {viewName}
          </Button>
        )}
        {readOnly && (
          <Tag
            data-adapttable-part="saved-view-readonly"
            style={{ marginInlineEnd: 0 }}
          >
            {readOnlyLabel}
          </Tag>
        )}
        {isDefault && (
          <Tag
            data-adapttable-part="saved-view-default"
            style={{ marginInlineEnd: 0 }}
          >
            {defaultLabel}
          </Tag>
        )}
      </div>
      <div style={layout.controls} data-adapttable-part="saved-view-controls">
        {controls.map((control) => (
          <Button
            key={control.key}
            type="text"
            size="small"
            danger={control.danger}
            style={layout.control}
            aria-label={control.label}
            aria-pressed={control.pressed}
            title={control.label}
            icon={control.icon}
            disabled={!control.onPress}
            onClick={control.onPress}
          />
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
