/** The bulk action bar, decided by the binding and drawn with MUI. */
import {
  createBulkBar,
  type KitBulkBarFrameProps,
  type KitBulkButtonProps,
  type KitBulkTextProps,
} from "@adapttable/react/adapter";
import { Button as MuiButton, Stack, Tooltip, Typography } from "@mui/material";

const ROW = { alignItems: "center", flexWrap: "wrap" } as const;
const BAR = { ...ROW, justifyContent: "space-between" } as const;
const WRAP = { flexWrap: "wrap" } as const;

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
    <Stack direction="row" spacing={1} useFlexGap sx={BAR} {...rest}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={ROW}
        {...scope?.attributes}
      >
        {count}
        {scope?.text}
        {scope?.button}
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={WRAP}>
        {clear}
        {actions}
        {error}
      </Stack>
    </Stack>
  );
}

const TEXT_COLOR = {
  count: undefined,
  scope: "text.secondary",
  error: "error",
} as const;

function Text({ kind, ...rest }: Readonly<KitBulkTextProps>) {
  "use no memo";
  return <Typography variant="body2" color={TEXT_COLOR[kind]} {...rest} />;
}

function Button({
  kind,
  busy: _busy,
  icon,
  color,
  reason,
  ...rest
}: Readonly<KitBulkButtonProps>) {
  "use no memo";
  if (kind !== "action") {
    return <MuiButton size="small" variant="text" {...rest} />;
  }
  return (
    <Tooltip title={reason ?? ""}>
      <span>
        <MuiButton
          size="small"
          variant="contained"
          color={color as "primary" | undefined}
          startIcon={icon}
          {...rest}
        />
      </span>
    </Tooltip>
  );
}

/** The bulk action bar, with MUI's text and buttons. */
export const BulkBar = /* @__PURE__ */ createBulkBar({ Frame, Text, Button });
