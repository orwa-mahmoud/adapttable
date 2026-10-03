/** Toolbar state only; Spartan Brain owns the actual overlay behavior. */
import { type Signal, signal } from "@angular/core";

export const MENU_PANEL_STYLE: Readonly<Record<string, string>> = {
  margin: "0",
  "min-inline-size": "0",
  "overflow-y": "auto",
};

/** Toolbar disclosure state. */
export interface MenuPopover {
  readonly open: Signal<boolean>;
  readonly toggle: () => void;
  readonly close: () => void;
  readonly setOpen: (open: boolean) => void;
}

/** Create the controlled state consumed by the Brain popover. */
export function menuPopover(): MenuPopover {
  const open = signal(false);
  return {
    open: open.asReadonly(),
    toggle: () => open.update((value) => !value),
    close: () => open.set(false),
    setOpen: (value) => open.set(value),
  };
}
