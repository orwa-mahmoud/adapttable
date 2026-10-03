/**
 * The toolbar menus' disclosure: a trigger and a panel that closes on an
 * outside press or Escape, hands focus back to the trigger on Escape, and
 * sits under its trigger inside the viewport. Native is this kit's kit, so
 * the popover is its own.
 */
import { effect, type Injector, type Signal, signal } from "@angular/core";

/** The fixed panel's own style; the look stays with the host's CSS. */
export const MENU_PANEL_STYLE: Readonly<Record<string, string>> = {
  margin: "0",
  "min-inline-size": "0",
  "overflow-y": "auto",
};

/** A toolbar menu's open state and the elements it watches. */
export interface MenuPopover {
  /** Whether the panel shows. */
  readonly open: Signal<boolean>;
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

  effect(
    (onCleanup) => {
      if (!open()) return;
      const onDown = (event: MouseEvent): void => {
        if (
          elements.root()?.contains(event.target as Node) ||
          elements.panel()?.contains(event.target as Node)
        )
          return;
        close();
      };
      const onKey = (event: KeyboardEvent): void => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        close();
        elements.trigger()?.focus();
      };
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onKey);
      onCleanup(() => {
        document.removeEventListener("mousedown", onDown);
        document.removeEventListener("keydown", onKey);
      });
    },
    { injector }
  );

  return {
    open: open.asReadonly(),
    toggle: () => {
      open.update((value) => !value);
    },
    close,
  };
}
