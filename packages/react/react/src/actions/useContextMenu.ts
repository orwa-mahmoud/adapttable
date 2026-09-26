/**
 * Opening a context menu, by every route a user has — the React binding.
 *
 * Right-click, Shift+F10 or the menu key, and a touch long press all open the
 * same menu at a target and a point, and closing puts focus back on the
 * element that opened it. That model is core's context-menu open controller;
 * this hook subscribes to it and hands out its trigger handlers for an
 * adapter to spread onto a header, row or cell.
 */
import {
  type ContextMenuOpenController,
  type ContextMenuState,
  type ContextMenuTarget,
  createContextMenuOpenController,
} from "@adapttable/core";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

export type { ContextMenuPoint, ContextMenuState } from "@adapttable/core";

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

/**
 * The open controller for one menu, subscribed and connected — the plumbing
 * {@link useContextMenu} and the table's composed menu share.
 *
 * @param enabled - Whether the menu is armed at all.
 * @returns The controller and the open menu, or `null`.
 */
export function useContextMenuOpen<TRow>(enabled: boolean): {
  controller: ContextMenuOpenController<TRow>;
  open: ContextMenuState<TRow> | null;
} {
  const [controller] = useState(() =>
    createContextMenuOpenController<TRow>({ enabled })
  );
  controller.configure({ enabled });
  const { open } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  // Unmounting mid-press abandons the press, so its timer never opens a menu
  // nobody is showing.
  useEffect(() => controller.connect(), [controller]);
  return { controller, open };
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
  const { controller, open } = useContextMenuOpen<TRow>(enabled);
  return useMemo(
    () => ({
      open,
      close: controller.close,
      triggerProps: controller.triggerHandlers,
    }),
    [controller, open]
  );
}
