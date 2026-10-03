/** Disclosure state for Material toolbar surfaces. CDK owns portal placement. */
import { effect, type Injector, type Signal, signal } from "@angular/core";

/** Content sizing; the Material/CDK surface owns stacking and position. */
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
        if (event.key !== "Escape") return;
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
