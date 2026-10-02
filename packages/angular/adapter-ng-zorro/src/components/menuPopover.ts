/** Disclosure state and scoped dismissal for NG-ZORRO toolbar popovers. */
import { effect, type Injector, type Signal, signal } from "@angular/core";

import { overlayContains, overlayEscapeHandled } from "./overlayPlacement";

/** The content's size; NG-ZORRO owns placement and stacking. */
export const MENU_PANEL_STYLE: Readonly<Record<string, string>> = {
  margin: "0",
  "min-inline-size": "0",
  "max-inline-size": "calc(100vw - 32px)",
  "max-block-size": "min(560px, calc(100vh - 48px))",
  "overflow-y": "auto",
};

/** A toolbar menu's controlled disclosure. */
export interface MenuPopover {
  readonly open: Signal<boolean>;
  readonly toggle: () => void;
  readonly close: () => void;
}

/** Keep a parent open while the reader interacts with its own child portals. */
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
          overlayContains(elements.root(), event.target) ||
          overlayContains(elements.panel(), event.target)
        )
          return;
        close();
      };
      const onKey = (event: KeyboardEvent): void => {
        if (event.key !== "Escape" || overlayEscapeHandled(event)) return;
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
