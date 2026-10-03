/**
 * The toolbar menus' disclosure: a trigger and a panel that closes on an
 * outside press or Escape, hands focus back to the trigger on Escape, and
 * sits under its trigger inside the viewport. Clarity CSS surfaces remain in the table scope; the binding controls state.
 */
import {
  afterRenderEffect,
  effect,
  type Injector,
  type Signal,
  signal,
} from "@angular/core";

import { OVERLAY_Z, placeOverlayBelowTrigger } from "./overlayPlacement";

/** The fixed panel's own style; the look stays with the host's CSS. */
export const MENU_PANEL_STYLE: Readonly<Record<string, string>> = {
  position: "fixed",
  "z-index": String(OVERLAY_Z),
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
        if (elements.root()?.contains(event.target as Node)) return;
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

  afterRenderEffect(
    (onCleanup) => {
      if (!open()) return;
      const panel = elements.panel();
      const trigger = elements.trigger();
      if (!panel || !trigger) return;
      const dir = getComputedStyle(trigger).direction === "rtl" ? "rtl" : "ltr";
      const place = (): void => {
        placeOverlayBelowTrigger(panel, trigger, dir);
      };
      place();
      window.addEventListener("resize", place);
      window.addEventListener("scroll", place, true);
      onCleanup(() => {
        window.removeEventListener("resize", place);
        window.removeEventListener("scroll", place, true);
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
