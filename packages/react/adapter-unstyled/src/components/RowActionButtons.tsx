/** A row's actions, decided by the binding and drawn as native buttons. */
import {
  createRowActionButtons,
  type KitRowActionMenuProps,
  type KitRowActionProps,
} from "@adapttable/react/adapter";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { useClassNames } from "./classNamesContext";
import { iconForRowAction, MoreVerticalIcon } from "./icons";

const targetOf = (size: number | undefined) => ({
  minWidth: size,
  minHeight: size,
});

/** One action: its glyph (named in a tooltip) or its caption. */
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
    <button
      type="button"
      disabled={disabled}
      title={reason ?? (icon ? label : undefined)}
      aria-label={label}
      style={targetOf(minTargetSize)}
      data-adapttable-part="action-button"
      data-color={color}
      className={useClassNames().actionButton}
      onClick={onClick}
    >
      {icon ?? label}
    </button>
  );
}

function Strip({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return children;
}

/** The actions in a native disclosure that closes once one is chosen, or on Escape. */
function Menu({
  label,
  minTargetSize,
  items,
}: Readonly<KitRowActionMenuProps>) {
  "use no memo";
  const classNames = useClassNames();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  // Escape closes the open menu wherever focus sits inside it, and hands focus
  // back to the trigger, as this kit's other disclosures do.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const menu = detailsRef.current;
      if (event.key !== "Escape" || !menu?.open) return;
      event.preventDefault();
      menu.open = false;
      menu.querySelector("summary")?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  return (
    <details
      ref={detailsRef}
      data-adapttable-part="row-actions-menu"
      className={classNames.rowActionsMenu}
      onPointerDown={(event) => event.stopPropagation()}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        style={targetOf(minTargetSize)}
        data-adapttable-part="row-actions-trigger"
        className={classNames.rowActionsTrigger}
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreVerticalIcon />
      </summary>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          disabled={item.disabled}
          title={item.reason ?? (item.icon ? item.label : undefined)}
          aria-label={item.label}
          style={targetOf(item.minTargetSize)}
          data-adapttable-part="action-button"
          data-color={item.color}
          className={classNames.actionButton}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            detailsRef.current?.removeAttribute("open");
            item.onSelect();
          }}
        >
          {item.icon ?? item.label}
        </button>
      ))}
    </details>
  );
}

/** A row's actions as native buttons or one disclosure. */
export const RowActionButtons = /* @__PURE__ */ createRowActionButtons({
  Action,
  Strip,
  Menu,
  iconFor: iconForRowAction,
});
