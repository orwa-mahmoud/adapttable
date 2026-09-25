import {
  SidePanelChrome,
  type SidePanelChromeProps,
  type SidePanelCloseProps,
  type SidePanelFrameProps,
  type SidePanelSlots,
  type SidePanelTabProps,
} from "@adapttable/react/adapter";

import { Button } from "../ui";

function Frame({ children, side, className }: SidePanelFrameProps) {
  return (
    <div
      className={className}
      data-adapttable-part="side-panel"
      data-side={side}
      style={{
        width: 280,
        flexShrink: 0,
        border: "1px solid var(--at-border, #d0d7de)",
        borderRadius: 8,
        padding: 12,
      }}
    >
      {children}
    </div>
  );
}

function Tab({ panel, selected, buttonProps }: SidePanelTabProps) {
  return (
    <Button size="1" variant={selected ? "solid" : "ghost"} {...buttonProps}>
      {panel.label}
    </Button>
  );
}

function Close({ label, onClose }: SidePanelCloseProps) {
  return (
    <Button
      size="1"
      variant="ghost"
      aria-label={label}
      data-adapttable-part="side-panel-close"
      onClick={onClose}
    >
      ×
    </Button>
  );
}

const slots: SidePanelSlots = { Frame, Tab, Close };

/** The kit's docked settings panel. */
export function SidePanel(
  props: Readonly<Omit<SidePanelChromeProps, "slots">>
) {
  return <SidePanelChrome {...props} slots={slots} />;
}
