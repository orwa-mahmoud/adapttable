/** The bulk action bar, decided by the binding and drawn with Mantine. */
import {
  createBulkBar,
  type KitBulkBarFrameProps,
  type KitBulkButtonProps,
  type KitBulkTextProps,
} from "@adapttable/react/adapter";
import {
  Button as MantineButton,
  Group,
  Stack,
  Text as MantineText,
  Tooltip,
} from "@mantine/core";

function Frame({
  count,
  scope,
  clear,
  actions,
  error,
  ...rest
}: Readonly<KitBulkBarFrameProps>) {
  "use no memo";
  return (
    <Stack gap="xs" {...rest}>
      <Group justify="space-between" wrap="wrap" gap="sm">
        {count}
        <Group gap="xs" wrap="wrap">
          {clear}
          {actions}
        </Group>
      </Group>
      {scope && (
        <Group gap="xs" wrap="wrap" {...scope.attributes}>
          {scope.text}
          {scope.button}
        </Group>
      )}
      {error}
    </Stack>
  );
}

function Text({ kind, ...rest }: Readonly<KitBulkTextProps>) {
  "use no memo";
  return (
    <MantineText fz="sm" c={kind === "error" ? "red" : undefined} {...rest} />
  );
}

function Button({
  kind,
  busy,
  icon,
  color,
  reason,
  ...rest
}: Readonly<KitBulkButtonProps>) {
  "use no memo";
  if (kind !== "action") {
    return (
      <MantineButton
        size="xs"
        variant={kind === "select-all-matching" ? "light" : "subtle"}
        {...rest}
      />
    );
  }
  const button = (
    <MantineButton
      size="xs"
      color={color}
      leftSection={icon}
      loading={busy}
      {...rest}
      // The running action shows its loader rather than greying out.
      disabled={busy ? false : rest.disabled}
    />
  );
  if (reason === undefined) return button;
  return (
    <Tooltip label={reason} withArrow openDelay={150}>
      <div>{button}</div>
    </Tooltip>
  );
}

/** The bulk action bar, with Mantine's text and buttons. */
export const BulkActionBar = /* @__PURE__ */ createBulkBar({ Frame, Text, Button });
