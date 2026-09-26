/**
 * Opening a context menu, by every route a user has — the stateful half,
 * shared by every binding.
 *
 * A right-click-only menu is a menu half the people who need it cannot
 * reach. Keyboard users open one with Shift+F10 or the dedicated menu key —
 * the same two keys that open one everywhere else in their operating system,
 * which is exactly why they are the two that must work. Touch users have
 * neither, and press and hold instead.
 *
 * All three arrive here and produce the same thing: a target, and a point to
 * put the menu at. The keyboard routes have no pointer position, so they take
 * the corner of the element that had focus, which is where the user is
 * already looking.
 *
 * The element that opened the menu is remembered, because closing puts focus
 * back on it. A menu that drops focus to the document leaves a keyboard user
 * at the top of the page, having lost the row they were on.
 *
 * A binding subscribes to the snapshot and binds one of two handler sets:
 * {@link ContextMenuOpenController.triggerHandlers} on a single header, row
 * or cell, or {@link ContextMenuOpenController.regionHandlers} once on the
 * element containing all of them, with the target read back out of the DOM.
 */
import type { ContextMenuItemsFactory } from "../features/currentHost";
import type { ContextMenuTarget } from "./contextMenuModel";
import {
  resolveContextTarget,
  type ResolvedContextTarget,
} from "./contextMenuRegion";

/**
 * Where on screen the menu should appear.
 *
 * @public
 */
export interface ContextMenuPoint {
  /** Viewport x, in pixels. */
  x: number;
  /** Viewport y, in pixels. */
  y: number;
}

/**
 * An open menu: what it was opened on, and where.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
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

/**
 * Whether a key press is one of the two an operating system already uses to
 * open a context menu: the dedicated menu key, or Shift+F10. Anything else
 * would be a shortcut people have to be taught.
 *
 * @param event - The key and whether Shift was held.
 * @returns True for the menu key and for Shift+F10.
 *
 * @public
 */
export function isContextMenuKey(event: {
  readonly key: string;
  readonly shiftKey: boolean;
}): boolean {
  return event.key === "ContextMenu" || (event.shiftKey && event.key === "F10");
}

/**
 * Whether a table's context menu is armed: the host asked for it with `true`
 * or an options object, or left the prop out while a feature registered menu
 * entries. An explicit `false` always wins.
 *
 * @param contextMenu - The prop as the host wrote it.
 * @param registered - The menu-entry factories features registered.
 * @returns True when the menu should open.
 *
 * @public
 */
export function isContextMenuArmed(
  contextMenu: boolean | object | undefined,
  registered: readonly unknown[] | undefined
): boolean {
  return (
    contextMenu !== false &&
    (contextMenu !== undefined || Boolean(registered?.length))
  );
}

/**
 * The host's extra entries and every feature's, as one factory for
 * `contextMenuItems`' `extra`. The host's come first; a factory the host
 * passed that a feature also registered is listed once.
 *
 * @typeParam TRow - The row type.
 * @param extra - The host's own entries, if any.
 * @param registered - The factories features registered, if any.
 * @returns One factory, or `undefined` when there is nothing extra.
 *
 * @public
 */
export function composeContextMenuExtra<TRow>(
  extra: ContextMenuItemsFactory<TRow> | undefined,
  registered: readonly ContextMenuItemsFactory<TRow>[] | undefined
): ContextMenuItemsFactory<TRow> | undefined {
  const features = extra
    ? registered?.filter((factory) => factory !== extra)
    : registered;
  if (!features?.length) return extra;
  return (target) => [
    ...(extra?.(target) ?? []),
    ...features.flatMap((factory) => [...factory(target)]),
  ];
}

/**
 * A right-click on a bound header, row or cell.
 *
 * @public
 */
export interface ContextMenuPointerEvent {
  /** Viewport x of the pointer. */
  readonly clientX: number;
  /** Viewport y of the pointer. */
  readonly clientY: number;
  /** The element the handler is bound to — focus returns here on close. */
  readonly currentTarget: Element;
  /** Keep the browser's own menu from opening. */
  readonly preventDefault: () => void;
}

/**
 * A key press on a bound header, row or cell.
 *
 * @public
 */
export interface ContextMenuKeyEvent {
  /** The key. */
  readonly key: string;
  /** Whether Shift was held. */
  readonly shiftKey: boolean;
  /** The element the handler is bound to — the menu opens at its corner. */
  readonly currentTarget: Element;
  /** Keep the browser's own handling of the key. */
  readonly preventDefault: () => void;
}

/**
 * A pointer press on a bound header, row or cell.
 *
 * @public
 */
export interface ContextMenuPressEvent {
  /** `"touch"`, `"mouse"` or `"pen"`. Only touch starts a long press. */
  readonly pointerType: string;
  /** Viewport x of the pointer. */
  readonly clientX: number;
  /** Viewport y of the pointer. */
  readonly clientY: number;
  /** The element the handler is bound to — focus returns here on close. */
  readonly currentTarget: Element;
}

/**
 * A pointer moving during a press.
 *
 * @public
 */
export interface ContextMenuMoveEvent {
  /** Viewport x of the pointer. */
  readonly clientX: number;
  /** Viewport y of the pointer. */
  readonly clientY: number;
}

/**
 * The handlers for one header, row or cell. Every route a user has to a
 * context menu is in here, so a binding binds one object rather than
 * remembering which events matter.
 *
 * @public
 */
export interface ContextMenuTriggerHandlers {
  /** Right-click: opens at the pointer. */
  readonly onContextMenu: (event: ContextMenuPointerEvent) => void;
  /** Shift+F10 or the menu key: opens at the element's corner. */
  readonly onKeyDown: (event: ContextMenuKeyEvent) => void;
  /** A touch press: opens after a long press, unless it moves or lifts. */
  readonly onPointerDown: (event: ContextMenuPressEvent) => void;
  /** A finger that travels is scrolling, and abandons the press. */
  readonly onPointerMove: (event: ContextMenuMoveEvent) => void;
  /** The finger lifted: abandons the press. */
  readonly onPointerUp: () => void;
  /** The browser took the pointer: abandons the press. */
  readonly onPointerCancel: () => void;
}

/**
 * The handlers for the element containing the headers, rows and cells. The
 * target is resolved from the element each event started at, through the
 * `data-adapttable-part` attributes.
 *
 * @public
 */
export interface ContextMenuRegionHandlers {
  /** Right-click anywhere in the region. */
  readonly onContextMenu: (event: {
    readonly target: EventTarget | null;
    readonly clientX: number;
    readonly clientY: number;
    readonly preventDefault: () => void;
  }) => void;
  /**
   * A key press anywhere in the region. The key is checked before any target
   * is resolved, so ordinary typing never walks the DOM.
   */
  readonly onKeyDown: (event: {
    readonly target: EventTarget | null;
    readonly key: string;
    readonly shiftKey: boolean;
    readonly preventDefault: () => void;
  }) => void;
  /** A pointer press anywhere in the region. */
  readonly onPointerDown: (event: {
    readonly target: EventTarget | null;
    readonly pointerType: string;
    readonly clientX: number;
    readonly clientY: number;
  }) => void;
  /** A pointer moving: needs no target, so resolves none. */
  readonly onPointerMove: (event: ContextMenuMoveEvent) => void;
  /** The finger lifted: abandons the press. */
  readonly onPointerUp: () => void;
  /** The browser took the pointer: abandons the press. */
  readonly onPointerCancel: () => void;
}

/**
 * What a context-menu open controller is configured with.
 *
 * @public
 */
export interface ContextMenuOpenControllerOptions {
  /**
   * Whether the menu is armed at all. Off, every route is inert and no long
   * press is ever started.
   */
  enabled: boolean;
}

/**
 * The menu's open state at one moment.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface ContextMenuOpenSnapshot<TRow> {
  /** The open menu, or `null` when there is none. */
  readonly open: ContextMenuState<TRow> | null;
}

/**
 * A context menu's open state and every route into it, for one menu.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface ContextMenuOpenController<TRow> {
  /** The current state. A new object whenever the menu opens or closes. */
  readonly getSnapshot: () => ContextMenuOpenSnapshot<TRow>;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: ContextMenuOpenControllerOptions) => void;
  /**
   * Mark the binding mounted. Returns the teardown, which abandons a long
   * press still pending so it never opens a menu nobody is showing.
   */
  readonly connect: () => () => void;
  /** Close the menu and put focus back on the element that opened it. */
  readonly close: () => void;
  /** The handlers to bind on one header, row or cell. */
  readonly triggerHandlers: (
    target: ContextMenuTarget<TRow>
  ) => ContextMenuTriggerHandlers;
  /**
   * The handlers to bind once on the element containing the headers, rows
   * and cells.
   *
   * @param rowFor - The row behind an id, since the DOM only carries the id.
   */
  readonly regionHandlers: (
    rowFor: (rowId: string) => TRow | undefined
  ) => ContextMenuRegionHandlers;
}

const CLOSED: ContextMenuOpenSnapshot<never> = { open: null };

/** The corner of an element, for a menu opened without a pointer. */
function cornerOf(element: Element): ContextMenuPoint {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.bottom };
}

/** The header, row or cell an event started in, or `null`. */
function resolveFrom<TRow>(
  from: EventTarget | null,
  rowFor: (rowId: string) => TRow | undefined
): ResolvedContextTarget<TRow> | null {
  return from instanceof Element ? resolveContextTarget(from, rowFor) : null;
}

/**
 * Create the open controller for one context menu.
 *
 * @typeParam TRow - The row type.
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createContextMenuOpenController<TRow>(
  initial: ContextMenuOpenControllerOptions
): ContextMenuOpenController<TRow> {
  let options = initial;
  let snapshot: ContextMenuOpenSnapshot<TRow> = CLOSED;
  // The element the open menu came from, for focus on the way back.
  let opener: Element | null = null;
  // A touch press waiting to become a long press. Nothing renders from it.
  let press: {
    timer: ReturnType<typeof setTimeout>;
    at: ContextMenuPoint;
  } | null = null;
  const listeners = new Set<() => void>();

  const setOpen = (open: ContextMenuState<TRow> | null): void => {
    if (open === snapshot.open) return;
    snapshot = { open };
    for (const listener of listeners) listener();
  };

  const openAt = (
    target: ContextMenuTarget<TRow>,
    element: Element,
    at: ContextMenuPoint
  ): void => {
    opener = element;
    setOpen({ target, at });
  };

  const cancelPress = (): void => {
    if (!press) return;
    clearTimeout(press.timer);
    press = null;
  };

  const close = (): void => {
    setOpen(null);
    const element = opener;
    opener = null;
    if (element instanceof HTMLElement) element.focus();
  };

  const rightClick = (
    target: ContextMenuTarget<TRow>,
    element: Element,
    event: Omit<ContextMenuPointerEvent, "currentTarget">
  ): void => {
    if (!options.enabled) return;
    event.preventDefault();
    openAt(target, element, { x: event.clientX, y: event.clientY });
  };

  const menuKey = (
    target: ContextMenuTarget<TRow>,
    element: Element,
    event: Omit<ContextMenuKeyEvent, "currentTarget">
  ): void => {
    if (!options.enabled || !isContextMenuKey(event)) return;
    event.preventDefault();
    openAt(target, element, cornerOf(element));
  };

  const startPress = (
    target: ContextMenuTarget<TRow>,
    element: Element,
    event: Omit<ContextMenuPressEvent, "currentTarget">
  ): void => {
    // Only touch: a held mouse button is a drag, and a held pen is usually a
    // barrel-button gesture the browser handles itself.
    if (!options.enabled || event.pointerType !== "touch") return;
    const at = { x: event.clientX, y: event.clientY };
    cancelPress();
    press = {
      at,
      timer: setTimeout(() => {
        press = null;
        openAt(target, element, at);
      }, LONG_PRESS_MS),
    };
  };

  const movePress = (event: ContextMenuMoveEvent): void => {
    const held = press;
    if (!held) return;
    const moved =
      Math.abs(event.clientX - held.at.x) > LONG_PRESS_SLOP ||
      Math.abs(event.clientY - held.at.y) > LONG_PRESS_SLOP;
    if (moved) cancelPress();
  };

  const triggerHandlers = (
    target: ContextMenuTarget<TRow>
  ): ContextMenuTriggerHandlers => ({
    onContextMenu: (event) => {
      rightClick(target, event.currentTarget, event);
    },
    onKeyDown: (event) => {
      menuKey(target, event.currentTarget, event);
    },
    onPointerDown: (event) => {
      startPress(target, event.currentTarget, event);
    },
    onPointerMove: movePress,
    onPointerUp: cancelPress,
    onPointerCancel: cancelPress,
  });

  const regionHandlers = (
    rowFor: (rowId: string) => TRow | undefined
  ): ContextMenuRegionHandlers => ({
    onContextMenu: (event) => {
      const found = resolveFrom(event.target, rowFor);
      if (found) rightClick(found.target, found.element, event);
    },
    onKeyDown: (event) => {
      if (!isContextMenuKey(event)) return;
      const found = resolveFrom(event.target, rowFor);
      if (found) menuKey(found.target, found.element, event);
    },
    onPointerDown: (event) => {
      const found = resolveFrom(event.target, rowFor);
      if (found) startPress(found.target, found.element, event);
    },
    onPointerMove: movePress,
    onPointerUp: cancelPress,
    onPointerCancel: cancelPress,
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure: (next) => {
      options = next;
    },
    connect: () => cancelPress,
    close,
    triggerHandlers,
    regionHandlers,
  };
}
