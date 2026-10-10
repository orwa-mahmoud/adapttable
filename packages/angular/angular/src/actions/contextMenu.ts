import {
  type ContextMenuState,
  type ContextMenuTarget,
  type ContextMenuTriggerHandlers,
  createContextMenuOpenController,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { fromStore } from "../store";

/**
 * What {@link injectContextMenu} returns: the open menu and the handlers for
 * one header, row or cell.
 *
 * @public
 */
export interface ContextMenuController<TRow> {
  /** The open menu, or `null`. */
  readonly open: ContextMenuState<TRow> | null;
  /** Close it and put focus back where it came from. */
  readonly close: () => void;
  /** Handlers for one header, row or cell. */
  readonly triggerProps: (
    target: ContextMenuTarget<TRow>
  ) => ContextMenuTriggerHandlers;
}

/**
 * Arm a context menu's open state.
 *
 * @param enabled - Whether the menu is armed at all. Off, every handler is
 *   inert and no timer is ever started.
 * @param injector - The caller's injector, when this runs outside a
 *   construction context.
 * @returns The open state and the handlers to bind.
 *
 * @public
 */
export function injectContextMenu<TRow>(
  enabled: Signal<boolean>,
  injector?: Injector
): Signal<ContextMenuController<TRow>> {
  if (injector === undefined) assertInInjectionContext(injectContextMenu);
  const resolved = injector ?? inject(Injector);
  const controller = createContextMenuOpenController<TRow>({ enabled: false });
  const snapshot = fromStore(controller, { injector: resolved });
  effect(
    () => {
      controller.configure({ enabled: enabled() });
    },
    { injector: resolved }
  );
  effect(
    (onCleanup) => {
      onCleanup(controller.connect());
    },
    { injector: resolved }
  );
  return computed(() => ({
    open: enabled() ? snapshot().open : null,
    close: controller.close,
    triggerProps: controller.triggerHandlers,
  }));
}
