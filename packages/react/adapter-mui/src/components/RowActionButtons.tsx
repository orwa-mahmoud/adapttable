/** A row's actions, decided by the binding and drawn with MUI's controls. */
import {
  createRowActionButtons,
  type KitRowActionMenuProps,
  type KitRowActionProps,
} from "@adapttable/react/adapter";
import {
  Button,
  IconButton,
  Menu as MuiMenu,
  MenuItem,
  Paper,
  type PaperProps,
  Stack,
  Tooltip,
} from "@mui/material";
import { type ReactNode, useState } from "react";

import { iconForRowAction, MoreVerticalIcon } from "../icons";
import { muiColor } from "./DesktopTable";

const targetOf = (size: number | undefined) => ({
  minWidth: size,
  minHeight: size,
});

/** One action: a glyph or a caption, explaining itself in a tooltip. */
function Action({
  label,
  icon,
  color,
  disabled,
  reason,
  minTargetSize,
  onClick,
}: Readonly<KitRowActionProps>) {
  "use no memo";
  const tone = muiColor(color);
  return (
    <Tooltip title={reason ?? label}>
      <span>
        {icon ? (
          <IconButton
            size="small"
            color={tone}
            disabled={disabled}
            aria-label={label}
            style={targetOf(minTargetSize)}
            data-adapttable-part="action-button"
            onClick={onClick}
          >
            {icon}
          </IconButton>
        ) : (
          <Button
            size="small"
            color={tone === "error" ? "error" : "inherit"}
            disabled={disabled}
            style={targetOf(minTargetSize)}
            data-adapttable-part="action-button"
            onClick={onClick}
          >
            {label}
          </Button>
        )}
      </span>
    </Tooltip>
  );
}

const END = { justifyContent: "flex-end" } as const;

function Strip({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return (
    <Stack direction="row" spacing={0.5} sx={END}>
      {children}
    </Stack>
  );
}

function ActionsMenuPaper(props: Readonly<PaperProps>) {
  return <Paper {...props} data-adapttable-part="row-actions-menu" />;
}

const ERROR_TEXT = { color: "error.main" } as const;

function Menu({
  label,
  minTargetSize,
  items,
}: Readonly<KitRowActionMenuProps>) {
  "use no memo";
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        size="small"
        aria-label={label}
        style={targetOf(minTargetSize)}
        data-adapttable-part="row-actions-trigger"
        onClick={(event) => {
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
      >
        <MoreVerticalIcon />
      </IconButton>
      <MuiMenu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slots={{ paper: ActionsMenuPaper }}
        onClick={(event) => event.stopPropagation()}
      >
        {items.map((item) => (
          <MenuItem
            key={item.key}
            disabled={item.disabled}
            title={item.reason}
            style={targetOf(item.minTargetSize)}
            data-adapttable-part="action-button"
            sx={muiColor(item.color) === "error" ? ERROR_TEXT : undefined}
            onClick={() => {
              setAnchor(null);
              item.onSelect();
            }}
          >
            {item.icon}
            {item.label}
          </MenuItem>
        ))}
      </MuiMenu>
    </>
  );
}

/** A row's actions as MUI buttons or one menu. */
export const RowActionButtons = /* @__PURE__ */ createRowActionButtons({
  Action,
  Strip,
  Menu,
  iconFor: iconForRowAction,
});
