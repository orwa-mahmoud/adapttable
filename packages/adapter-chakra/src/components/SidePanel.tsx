import {
  SidePanelChrome,
  type SidePanelChromeProps,
  type SidePanelCloseProps,
  type SidePanelFrameProps,
  type SidePanelSlots,
  type SidePanelTabProps,
} from "@adapttable/react/adapter";
import { Box, Button, IconButton } from "@chakra-ui/react";

function Frame({ children, side, className }: SidePanelFrameProps) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      p={3}
      width="280px"
      flexShrink={0}
      className={className}
      data-adapttable-part="side-panel"
      data-side={side}
    >
      {children}
    </Box>
  );
}

function Tab({ panel, selected, buttonProps }: SidePanelTabProps) {
  return (
    <Button size="xs" variant={selected ? "solid" : "ghost"} {...buttonProps}>
      {panel.label}
    </Button>
  );
}

function Close({ label, onClose }: SidePanelCloseProps) {
  return (
    <IconButton
      size="xs"
      variant="ghost"
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
