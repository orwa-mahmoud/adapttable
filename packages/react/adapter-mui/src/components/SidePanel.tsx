import {
  SidePanelChrome,
  type SidePanelChromeProps,
  type SidePanelCloseProps,
  type SidePanelFrameProps,
  type SidePanelSlots,
  type SidePanelTabProps,
} from "@adapttable/react/adapter";
import { Button, IconButton, Paper } from "@mui/material";

function Frame({ children, side, className }: SidePanelFrameProps) {
  return (
    <Paper
      variant="outlined"
      className={className}
      data-adapttable-part="side-panel"
      data-side={side}
      sx={{ width: 280, flexShrink: 0, p: 1.5 }}
    >
      {children}
    </Paper>
  );
}

function Tab({ panel, selected, buttonProps }: SidePanelTabProps) {
  return (
    <Button
      size="small"
      variant={selected ? "contained" : "text"}
      {...buttonProps}
    >
      {panel.label}
    </Button>
  );
}

function Close({ label, onClose }: SidePanelCloseProps) {
  return (
    <IconButton
      size="small"
      aria-label={label}
      data-adapttable-part="side-panel-close"
      onClick={onClose}
    >
      ×
    </IconButton>
  );
}

const slots: SidePanelSlots = { Frame, Tab, Close };

/** The kit's docked settings panel. */
export function SidePanel(
  props: Readonly<Omit<SidePanelChromeProps, "slots">>
) {
  return <SidePanelChrome {...props} slots={slots} />;
}
