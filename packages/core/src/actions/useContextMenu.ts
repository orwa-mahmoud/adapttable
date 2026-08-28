/**
 * Opening a context menu, by every route a user has.
 *
 * A right-click-only menu is a menu half the people who need it cannot
 * reach. Keyboard users open one with Shift+F10 or the dedicated menu key —
 * the same two keys that open one everywhere else in their operating
 * system, which is exactly why they are the two that must work. Touch users
 * have neither, and press and hold instead.
 *
 * All three arrive here and produce the same thing: a target, and a point
 * to put the menu at. The keyboard routes have no pointer position, so they
 * take the corner of the element that had focus, which is where the user is
 * already looking.
 *
 * The element that opened the menu is remembered, because closing has to
 * put focus back on it. A menu that drops focus to the document leaves a
 * keyboard user at the top of the page, having lost the row they were on.
 */
import { useCallback, useRef, useState } from "react";

import type { ContextMenuTarget } from "./contextMenuModel";

/** Where on screen the menu should appear. */
export interface ContextMenuPoint {
  /** Viewport x, in pixels. */
  x: number;
  /** Viewport y, in pixels. */
  y: number;
}

/** The open menu, or `null` when there is none. */
export interface ContextMenuState<TRow> {
  /** What the menu was opened on. */
  target: ContextMenuTarget<TRow>;
  /** Where the menu opened. */
  at: ContextMenuPoint;
}

/** How long a press has to last to count as a long press, in milliseconds. */
const LONG_PRESS_MS = 500;

/** How far a finger may travel before a press stops being one, in pixels. */
const LONG_PRESS_SLOP = 10;

/** What {@link useContextMenu} returns. */
export interface ContextMenuController<TRow> {
  /** The open menu, or `null`. */
  open: ContextMenuState<TRow> | null;
  /** Close it and put focus back where it came from. */
  close: () => void;
  /**
   * Handlers to spread onto a header, row or cell. Every route a user has
   * to a context menu is in here, so an adapter binds one object rather
   * than remembering which three events matter.
   */
  triggerProps: (target: ContextMenuTarget<TRow>) => {
    onContextMenu: (event: {
      preventDefault: () => void;
      clientX: number;
      clientY: number;
      currentTarget: EventTarget & Element;
    }) => void;
    onKeyDown: (event: {
      key: string;
      shiftKey: boolean;
      preventDefault: () => void;
      currentTarget: EventTarget & Element;
    }) => void;
    onPointerDown: (event: {
      pointerType: string;
      clientX: number;
      clientY: number;
      currentTarget: EventTarget & Element;
    }) => void;
    onPointerMove: (event: { clientX: number; clientY: number }) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
  };
}

/** The corner of an element, for a menu opened without a pointer. */
function cornerOf(element: Element): ContextMenuPoint {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.bottom };
}

/**
 * Wire up a context menu's open state.
 *
 * @param enabled - Whether the menu is armed at all. Off, every handler is
 *   inert and no timer is ever started.
 * @returns The open state and the handlers to bind.
 */
export function useContextMenu<TRow>(
  enabled: boolean
): ContextMenuController<TRow> {
  const [open, setOpen] = useState<ContextMenuState<TRow> | null>(null);
  const opener = useRef<Element | null>(null);
  const press = useRef<{
    timer: ReturnType<typeof setTimeout>;
    at: ContextMenuPoint;
  } | null>(null);

  const cancelPress = useCallback(() => {
    if (!press.current) return;
    clearTimeout(press.current.timer);
    press.current = null;
  }, []);

  const close = useCallback(() => {
    setOpen(null);
    // Focus goes back to the element the menu was opened from. Without
    // this a keyboard user lands at the top of the document, having lost
    // the row they were working on.
    const element = opener.current;
    opener.current = null;
    if (element instanceof HTMLElement) element.focus();
  }, []);

  const triggerProps = useCallback(
    (target: ContextMenuTarget<TRow>) => ({
      onContextMenu: (event: {
        preventDefault: () => void;
        clientX: number;
        clientY: number;
        currentTarget: EventTarget & Element;
      }) => {
        if (!enabled) return;
        event.preventDefault();
        opener.current = event.currentTarget;
        setOpen({ target, at: { x: event.clientX, y: event.clientY } });
      },
      onKeyDown: (event: {
        key: string;
        shiftKey: boolean;
        preventDefault: () => void;
        currentTarget: EventTarget & Element;
      }) => {
        if (!enabled) return;
        // The two keys an operating system already uses for this. Anything
        // else here would be a shortcut people have to be taught.
        const wanted =
          event.key === "ContextMenu" ||
          (event.shiftKey && event.key === "F10");
        if (!wanted) return;
        event.preventDefault();
        opener.current = event.currentTarget;
        setOpen({ target, at: cornerOf(event.currentTarget) });
      },
      onPointerDown: (event: {
        pointerType: string;
        clientX: number;
        clientY: number;
        currentTarget: EventTarget & Element;
      }) => {
        // Only touch: a held mouse button is a drag, and a held pen is
        // usually a barrel-button gesture the browser handles itself.
        if (!enabled || event.pointerType !== "touch") return;
        const element = event.currentTarget;
        const at = { x: event.clientX, y: event.clientY };
        cancelPress();
        press.current = {
          at,
          timer: setTimeout(() => {
            press.current = null;
            opener.current = element;
            setOpen({ target, at });
          }, LONG_PRESS_MS),
        };
      },
      onPointerMove: (event: { clientX: number; clientY: number }) => {
        const held = press.current;
        if (!held) return;
        // A finger that travels is scrolling, not pressing.
        const moved =
          Math.abs(event.clientX - held.at.x) > LONG_PRESS_SLOP ||
          Math.abs(event.clientY - held.at.y) > LONG_PRESS_SLOP;
        if (moved) cancelPress();
      },
      onPointerUp: cancelPress,
      onPointerCancel: cancelPress,
    }),
    [cancelPress, enabled]
  );

  return { open, close, triggerProps };
}
