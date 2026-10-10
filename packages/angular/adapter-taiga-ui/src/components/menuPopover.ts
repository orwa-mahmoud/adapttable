import { effect, type Injector, type Signal, signal } from "@angular/core";

/**
 * The toolbar menus' disclosure: a trigger and a panel that closes on an
 * outside press or Escape, hands focus back to the trigger on Escape, and
 * sits under its trigger inside the viewport. Taiga owns placement, stacking and nested active zones.
 */

/** The fixed panel's own style; the look stays with the host's CSS. */
export const MENU_PANEL_STYLE: Readonly<Record<string, string>> = {
  margin: "0",
  "min-inline-size": "0",
  "max-block-size": "100%",
  "box-sizing": "border-box",
  "overflow-y": "auto",
};

/** A toolbar menu's open state and the elements it watches. */
export interface MenuPopover {
  /** Whether the panel shows. */
  readonly open: Signal<boolean>;
  /** Mirror Taiga's native open and close transitions. */
  readonly setOpen: (value: boolean) => void;
  /** Open or close the panel. */
  readonly toggle: () => void;
  /** Close the panel. */
  readonly close: () => void;
}

/**
 * A toolbar menu's disclosure over three elements: the wrapper (a press
 * inside it is not outside), the trigger (Escape returns focus to it) and
 * the panel (placed under the trigger while open).
 */
export function menuPopover(
  elements: {
    readonly root: () => HTMLElement | undefined;
    readonly trigger: () => HTMLElement | undefined;
    readonly panel: () => HTMLElement | undefined;
  },
  injector: Injector
): MenuPopover {
  const open = signal(false);
  const close = (): void => {
    open.set(false);
  };

  // Taiga owns active-zone-aware dismissal. Keep focus restoration local to
  // the invoking menu instead of closing a parent when a child portal opens.
  effect(
    () => {
      if (open()) return;
      const active =
        typeof document === "undefined" ? null : document.activeElement;
      if (active && elements.panel()?.contains(active))
        elements.trigger()?.focus();
    },
    { injector }
  );

  return {
    open: open.asReadonly(),
    setOpen: (value) => {
      open.set(value);
    },
    toggle: () => {
      open.update((value) => !value);
    },
    close,
  };
}
