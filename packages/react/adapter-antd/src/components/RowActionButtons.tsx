/** A row's actions, decided by the binding and drawn with antd's controls. */
import {
  createRowActionButtons,
  type KitRowActionMenuProps,
  type KitRowActionProps,
} from "@adapttable/react/adapter";
import { Button, Dropdown, Tooltip } from "antd";
import type { ReactNode } from "react";

import { isDangerColor } from "../colors";
import { iconForRowAction, MoreVerticalIcon } from "../icons";

const targetOf = (size: number | undefined) => ({
  minWidth: size,
  minHeight: size,
});

/** A tooltip is a label, not a control: it must not hold the pointer. */
const PASS_THROUGH = { root: { pointerEvents: "none" } } as const;

/** One action: a text button, its glyph or its caption, explained on hover. */
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
  return (
    <Tooltip
      title={reason ?? label}
      // Over the next row's buttons, a bubble that held the pointer would
      // swallow the click meant for them.
      styles={PASS_THROUGH}
    >
      <Button
        size="small"
        type="text"
        danger={isDangerColor(color)}
        disabled={disabled}
        icon={icon}
        title={reason}
        aria-label={label}
        style={targetOf(minTargetSize)}
        data-adapttable-part="action-button"
        onClick={onClick}
      >
        {icon ? undefined : label}
      </Button>
    </Tooltip>
  );
}

function Strip({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return children;
}

/** Tags the dropdown surface with its part name. */
function renderMenuSurface(menu: ReactNode): ReactNode {
  return <div data-adapttable-part="row-actions-menu">{menu}</div>;
}

function Menu({
  label,
  minTargetSize,
  items,
}: Readonly<KitRowActionMenuProps>) {
  "use no memo";
  return (
    <Dropdown
      trigger={["click"]}
      popupRender={renderMenuSurface}
      menu={{
        items: items.map((item) => ({
          key: item.key,
          label: item.label,
          icon: item.icon,
          disabled: item.disabled,
          danger: isDangerColor(item.color),
          title: item.reason,
        })),
        onClick: (info) => {
          // The menu sits inside the row, so the choice must not read as a
          // click on the row underneath it.
          info.domEvent.stopPropagation();
          items.find((item) => item.key === info.key)?.onSelect();
        },
      }}
    >
      <Button
        size="small"
        type="text"
        aria-label={label}
        style={targetOf(minTargetSize)}
        data-adapttable-part="row-actions-trigger"
        icon={<MoreVerticalIcon />}
        onClick={(event) => event.stopPropagation()}
      />
    </Dropdown>
  );
}

/** A row's actions as antd text buttons or one dropdown. */
export const RowActionButtons = /* @__PURE__ */ createRowActionButtons({
  Action,
  Strip,
  Menu,
  iconFor: iconForRowAction,
});
