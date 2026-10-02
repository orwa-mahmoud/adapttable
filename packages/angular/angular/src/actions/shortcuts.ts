/**
 * Keyboard shortcuts for Angular.
 *
 * The parser lives in core. This binds a list of chords to a DOM target for
 * as long as the caller is alive.
 */
import {
  createShortcutHandler,
  DEFAULT_SHORTCUTS,
  type Shortcut,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  effect,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

export type { Shortcut };
export { DEFAULT_SHORTCUTS };

/**
 * What {@link injectShortcuts} needs.
 *
 * @public
 */
export interface UseShortcutsOptions {
  /** Off unless the host armed it; nothing is bound when false. */
  readonly enabled: boolean;
  /** The shortcuts. Defaults to {@link DEFAULT_SHORTCUTS}. */
  readonly shortcuts?: readonly Shortcut[];
  /** Run a command by key. */
  readonly onCommand: (command: string) => void;
  /**
   * Where to listen. Defaults to the document, so the chord works when
   * focus is on the table, in its toolbar, or nowhere in particular.
   */
  readonly target?: () => EventTarget | null;
}

/**
 * Bind a table's shortcuts.
 *
 * @param options - The shortcuts and what to do when one fires.
 * @param injector - The caller's injector, when this runs outside a
 *   construction context.
 *
 * @public
 */
export function injectShortcuts(
  options: Signal<UseShortcutsOptions>,
  injector?: Injector
): void {
  if (injector === undefined) assertInInjectionContext(injectShortcuts);
  const resolved = injector ?? inject(Injector);
  effect(
    (onCleanup) => {
      const current = options();
      const shortcuts = current.shortcuts ?? DEFAULT_SHORTCUTS;
      if (!current.enabled || shortcuts.length === 0) return;
      const handle = createShortcutHandler(shortcuts, current.onCommand);
      const node = current.target?.() ?? document;
      const onKeyDown = (event: Event) => {
        if (event instanceof KeyboardEvent) handle(event);
      };
      node.addEventListener("keydown", onKeyDown);
      onCleanup(() => {
        node.removeEventListener("keydown", onKeyDown);
      });
    },
    { injector: resolved }
  );
}
