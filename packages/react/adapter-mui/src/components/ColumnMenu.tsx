/**
 * MUI's Columns menu: the binding's composition, drawn with MUI's primitives
 * on MUI's spacing.
 */
import {
  type ColumnMenuSlotProps,
  createColumnMenu,
  type KitColumnMenuLook,
} from "@adapttable/react/adapter";
import { useTheme } from "@mui/material";

import {
  Button,
  Divider,
  IconButton,
  Popover,
  Select,
  Text,
  TextInput,
} from "./primitives";

/** The shared Columns-menu contract, declared once in core. */
export type ColumnMenuProps<TRow> = ColumnMenuSlotProps<TRow>;

/** MUI's half spacing step (4 px) between and around the menu's controls. */
const STEP = 4;

const ROW = {
  display: "flex",
  alignItems: "center",
  gap: STEP,
  padding: `2px ${STEP}px`,
} as const;

const LOOK = {
  panel: { padding: 6, minWidth: 250 },
  heading: {
    display: "block",
    padding: `0 8px ${STEP}px`,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  search: { marginBottom: 6 },
  bulk: {
    display: "flex",
    flexWrap: "wrap",
    gap: STEP,
    padding: `0 ${STEP}px 6px`,
  },
  row: ROW,
  rowSpacer: { width: 24 },
  divider: { margin: `${STEP}px 0` },
  submenu: { padding: `0 ${STEP}px ${STEP}px` },
  choice: { margin: `${STEP}px 0` },
  renameForm: { display: "grid", gap: STEP, padding: STEP },
  renameActions: { display: "flex", gap: STEP },
} as const;

function useLook(): KitColumnMenuLook {
  const { palette } = useTheme();
  return {
    ...LOOK,
    grip: { color: palette.text.disabled },
    accent: palette.primary.main,
  };
}

/**
 * MUI column-management popover: per-column drag grip (reorder), eye
 * (show/hide), pin toggle and a list of column actions.
 */
export const ColumnMenu = /* @__PURE__ */ createColumnMenu(
  { Button, IconButton, TextInput, Select, Popover, Text, Divider },
  useLook
);
