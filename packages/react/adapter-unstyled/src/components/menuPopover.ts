import {
  type CSSProperties,
  type Dispatch,
  type RefCallback,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { OVERLAY_Z, placeOverlayBelowTrigger } from "./overlayPlacement";

/**
 * Inline style for a toolbar menu panel portalled to `document.body`.
 * Positioning only — `border` / `padding` stay on `classNames` so a Tailwind
 * or shadcn map can draw the card. `minInlineSize` kills the fieldset
 * min-content default.
 */
export const MENU_PANEL_STYLE: CSSProperties = {
  position: "fixed",
  zIndex: OVERLAY_Z,
  margin: 0,
  minInlineSize: 0,
  overflowY: "auto",
};

/** Disclosure state shared by the toolbar menu popovers. */
export interface MenuPopoverState {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  /** Attach to the wrapper — pointer-downs inside it do not close the panel. */
  rootRef: RefObject<HTMLDivElement | null>;
  /** Attach to the trigger — Escape hands keyboard focus back to it. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** Attach to the portalled panel — clicks inside it must not count as outside. */
  panelRef: RefCallback<HTMLElement>;
}

/**
 * Disclosure behaviour for the toolbar menus (ColumnMenu, SavedViewsMenu):
 * open/close state that also closes on outside mousedown or Escape, with
 * Escape restoring focus to the trigger. The panel is portalled, so outside
 * detection has to include `panelRef` as well as the trigger wrapper.
 */
export function useMenuPopover(): MenuPopoverState {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelNode = useRef<HTMLElement>(null);
  const panelRef = useCallback<RefCallback<HTMLElement>>((el) => {
    panelNode.current = el;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelNode.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelNode.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return;
    const dir = getComputedStyle(trigger).direction === "rtl" ? "rtl" : "ltr";
    const place = () => placeOverlayBelowTrigger(panel, trigger, dir);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return { open, setOpen, rootRef, triggerRef, panelRef };
}
