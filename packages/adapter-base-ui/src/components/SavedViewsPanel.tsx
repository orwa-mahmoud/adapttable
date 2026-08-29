/** The saved-views management panel, in Base UI. */
import {
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  type SavedViewsPanelEmptyProps,
  type SavedViewsPanelInputProps,
  type SavedViewsPanelRowProps,
  type SavedViewsPanelSlots,
  type SavedViewsPanelSurfaceProps,
} from "@adapttable/core/adapter";

import { Badge, Button, Card, Flex, IconButton, Text, TextField } from "../ui";

/** The adapter's own class list, in the order `DataTable` writes it. */
function classes(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const slots: SavedViewsPanelSlots = {
  // The adapter's tokens live on `adapttable-base-ui`, and a panel mounted
  // beside the table rather than inside it is outside that scope — without the
  // class every `var(--adapttable-*)` in here resolves to nothing and the kit's
  // own controls paint as bare text.
  Surface: ({
    children,
    className,
    title,
    footer,
    ...rest
  }: SavedViewsPanelSurfaceProps) => (
    <Card className={classes("adapttable-base-ui", className)} {...rest}>
      <Text
        size="1"
        color="gray"
        data-adapttable-part="saved-views-title"
        style={{
          display: "block",
          marginBlockEnd: 8,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
      <Flex direction="column" gap="1">
        {children}
      </Flex>
      {footer && (
        <Text
          size="1"
          color="gray"
          data-adapttable-part="saved-views-footer"
          style={{ display: "block", marginBlockStart: 10 }}
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
            color={control.danger ? "red" : undefined}
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
