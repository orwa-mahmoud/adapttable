import {
  SidePanelChrome,
  type SidePanelChromeProps,
  type SidePanelCloseProps,
  type SidePanelFrameProps,
  type SidePanelSlots,
  type SidePanelTabProps,
} from "@adapttable/react/adapter";
import { Button, Card } from "antd";

function Frame({ children, side, className }: SidePanelFrameProps) {
  return (
    <Card
      size="small"
      className={className}
      data-adapttable-part="side-panel"
      data-side={side}
      style={{ width: 280, flexShrink: 0 }}
    >
      {children}
    </Card>
  );
}

function Tab({ panel, selected, buttonProps }: SidePanelTabProps) {
  // antd's `type` is its visual variant, so the HTML one travels as
  // `htmlType` — spreading the chrome's props whole would set the variant
  // to "button" and lose the tab's appearance.
  const { type, ...aria } = buttonProps;
  return (
    <Button
      size="small"
      type={selected ? "primary" : "text"}
      htmlType={type}
      {...aria}
    >
      {panel.label}
    </Button>
  );
}

function Close({ label, onClose }: SidePanelCloseProps) {
  return (
    <Button
      size="small"
      type="text"
      aria-label={label}
      htmlType="button"
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
