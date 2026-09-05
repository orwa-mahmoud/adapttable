import {
  SidePanelChrome,
  type SidePanelChromeProps,
  type SidePanelCloseProps,
  type SidePanelFrameProps,
  type SidePanelSlots,
  type SidePanelTabProps,
} from "@adapttable/react/adapter";

import type { DataTableClassNames } from "../types";
import { ClassNamesProvider, useClassNames } from "./classNamesContext";

function Frame({ children, side, className }: SidePanelFrameProps) {
  return (
    <aside
      className={className}
      data-adapttable-part="side-panel"
      data-side={side}
      style={{ width: 280, flexShrink: 0 }}
    >
      {children}
    </aside>
  );
}

function Tab({ panel, selected, buttonProps }: SidePanelTabProps) {
  const { sidePanelTab } = useClassNames();
  return (
    <button
      {...buttonProps}
      data-active={selected || undefined}
      className={sidePanelTab}
    >
      {panel.label}
    </button>
  );
}

function Close({ label, onClose }: SidePanelCloseProps) {
  const { sidePanelClose } = useClassNames();
  return (
    <button
      type="button"
      aria-label={label}
      data-adapttable-part="side-panel-close"
      className={sidePanelClose}
      onClick={onClose}
    >
      ×
    </button>
  );
}

const slots: SidePanelSlots = { Frame, Tab, Close };

/**
 * Unstyled side panel: semantic markup with class hooks, no styles.
 *
 * The slots read the class map from context, so each piece gets its hook
 * without core's contract carrying a class for it — and without a new
 * component identity per render, which would remount the open panel.
 */
export function SidePanel(
  props: Readonly<
    Omit<SidePanelChromeProps, "slots"> & {
      classNames?: DataTableClassNames;
    }
  >
) {
  const { classNames, ...rest } = props;
  return (
    <ClassNamesProvider classNames={classNames}>
      <SidePanelChrome
        {...rest}
        className={classNames?.sidePanel}
        slots={slots}
      />
    </ClassNamesProvider>
  );
}
