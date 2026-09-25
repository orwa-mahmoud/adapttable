import {
  SidePanelChrome,
  type SidePanelChromeProps,
  type SidePanelCloseProps,
  type SidePanelFrameProps,
  type SidePanelSlots,
  type SidePanelTabProps,
} from "@adapttable/react/adapter";
import { ActionIcon, Button, Paper } from "@mantine/core";

function Frame({ children, side, className }: SidePanelFrameProps) {
  return (
    <Paper
      withBorder
      p="sm"
      className={className}
      data-adapttable-part="side-panel"
      data-side={side}
      style={{ width: 280, flexShrink: 0 }}
    >
      {children}
    </Paper>
  );
}

function Tab({ panel, selected, buttonProps }: SidePanelTabProps) {
  return (
    <Button
      variant={selected ? "light" : "subtle"}
      size="compact-sm"
      {...buttonProps}
    >
      {panel.label}
    </Button>
  );
}

function Close({ label, onClose }: SidePanelCloseProps) {
  return (
    <ActionIcon
      variant="subtle"
      size="sm"
      aria-label={label}
      data-adapttable-part="side-panel-close"
      onClick={onClose}
    >
      ×
    </ActionIcon>
  );
}

const slots: SidePanelSlots = { Frame, Tab, Close };

/** The kit's docked settings panel. */
export function SidePanel(
  props: Readonly<Omit<SidePanelChromeProps, "slots">>
) {
  return <SidePanelChrome {...props} slots={slots} />;
}
