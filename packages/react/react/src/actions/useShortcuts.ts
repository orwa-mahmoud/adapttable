/**
 * Keyboard shortcuts, as a list the host can read and change.
 *
 * A shortcut hard-coded in a key handler is a shortcut nobody can remap,
 * and remapping is not a preference — it is the difference between a table
 * that works inside an application and one that fights it. The host's app
 * may already own Ctrl+K. Its users may be on a layout where the default
 * is awkward, or using software that has claimed the chord.
 *
 * So a shortcut is data: a chord, and the command key it runs. The
 * defaults are the ones people already know, and any of them can be
 * replaced or removed by passing a different list.
 *
 * The parser and matcher live in core (`createShortcutHandler`); this hook
 * binds them to a DOM target for the life of the component.
 */
import { DEFAULT_SHORTCUTS, type Shortcut } from "@adapttable/core";
import { useEffect } from "react";

export type { Shortcut } from "@adapttable/core";
export { DEFAULT_SHORTCUTS } from "@adapttable/core";

import { createShortcutHandler } from "@adapttable/core/binding";

/**
 * What {@link useShortcuts} needs.
 *
 * @public
 */
export interface UseShortcutsOptions {
  /** Off unless the host armed it; nothing is bound when false. */
  enabled: boolean;
  /** The shortcuts. Defaults to {@link DEFAULT_SHORTCUTS}. */
  shortcuts?: readonly Shortcut[];
  /** Run a command by key. Returning nothing is fine. */
  onCommand: (command: string) => void;
  /**
   * Where to listen. Defaults to the document, which is what a
   * table-scoped palette wants: the shortcut has to work when focus is on
   * the table, in its toolbar, or nowhere in particular.
   */
  target?: () => EventTarget | null;
}

/**
 * Bind a table's shortcuts.
 *
 * @param options - The shortcuts and what to do when one fires.
 *
 * @public
 */
export function useShortcuts(options: UseShortcutsOptions): void {
  const { enabled, onCommand } = options;
  const shortcuts = options.shortcuts ?? DEFAULT_SHORTCUTS;
  const getTarget = options.target;
  useEffect(() => {
    if (!enabled || shortcuts.length === 0) return;
    const handle = createShortcutHandler(shortcuts, onCommand);
    const node = getTarget?.() ?? document;
    const onKeyDown = (event: Event) => {
      if (event instanceof KeyboardEvent) handle(event);
    };
    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, shortcuts, onCommand, getTarget]);
}
