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

/** The elements an anchored panel tracks. */
export interface AnchoredPanelRefs {
  /** Attach to the wrapper — pointer-downs inside it do not close the panel. */
  rootRef: RefObject<HTMLDivElement | null>;
  /** Attach to the trigger — the panel sits under it. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** Attach to the portalled panel — clicks inside it must not count as outside. */
  panelRef: RefCallback<HTMLElement>;
}

/**
 * A panel portalled under its trigger: it follows the trigger through
 * scrolling and resizing, and a pointer-down outside the wrapper and the
 * panel asks it to close.
 */
export function useAnchoredPanel(
  open: boolean,
  onClose: () => void
): AnchoredPanelRefs {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelNode = useRef<HTMLElement>(null);
  const panelRef = useCallback<RefCallback<HTMLElement>>((el) => {
    panelNode.current = el;
  }, []);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelNode.current?.contains(target)) return;
      close.current();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
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

  return { rootRef, triggerRef, panelRef };
}

/** Disclosure state shared by the toolbar menu popovers. */
export interface MenuPopoverState extends AnchoredPanelRefs {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

/**
 * Disclosure behaviour for a toolbar menu that keeps its own state: an
 * anchored panel that also closes on Escape, handing focus back to the
 * trigger.
 */
export function useMenuPopover(): MenuPopoverState {
  const [open, setOpen] = useState(false);
  const refs = useAnchoredPanel(open, () => setOpen(false));
  const { triggerRef } = refs;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, triggerRef]);
  return { open, setOpen, ...refs };
}
