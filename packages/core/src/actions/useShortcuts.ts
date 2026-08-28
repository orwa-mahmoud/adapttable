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
 * Matching deliberately ignores the physical key's layout — `event.key` is
 * the character the user's layout produces, which is what they typed and
 * what the shortcut was written as. It is compared case-insensitively,
 * because Shift is part of the chord rather than part of the letter.
 */
import { useEffect } from "react";

/**
 * One shortcut: the chord, and what it runs.
 *
 * @public
 */
export interface Shortcut {
  /**
   * The chord, as `"mod+k"`. `mod` is Cmd on a Mac and Ctrl elsewhere,
   * which is the only way to write one shortcut that is right on both.
   * Also accepts `ctrl`, `meta`, `alt` and `shift`.
   */
  chord: string;
  /** The key of the command it runs. */
  command: string;
}

/**
 * The shortcuts a table has unless the host says otherwise.
 *
 * @internal
 */
export const DEFAULT_SHORTCUTS: readonly Shortcut[] = [
  { chord: "mod+k", command: "command-palette" },
];

interface Chord {
  key: string;
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

function parseChord(chord: string): Chord {
  const parts = chord.toLowerCase().split("+");
  const key = parts.at(-1) ?? "";
  return {
    key,
    mod: parts.includes("mod"),
    ctrl: parts.includes("ctrl"),
    meta: parts.includes("meta"),
    alt: parts.includes("alt"),
    shift: parts.includes("shift"),
  };
}

/** Whether an event is this chord. */
function matches(chord: Chord, event: KeyboardEvent): boolean {
  if (event.key.toLowerCase() !== chord.key) return false;
  // `mod` is satisfied by either, so one chord is right on every platform
  // without the host writing two.
  const mod = event.metaKey || event.ctrlKey;
  if (chord.mod ? !mod : false) return false;
  if (chord.ctrl && !event.ctrlKey) return false;
  if (chord.meta && !event.metaKey) return false;
  if (chord.alt !== event.altKey) return false;
  if (chord.shift !== event.shiftKey) return false;
  // A chord with no modifier must not fire while a modifier is held, or
  // "e" would trigger inside Ctrl+E.
  return chord.mod || chord.ctrl || chord.meta ? true : !mod;
}

/**
 * True while the event came from somewhere text is being typed.
 *
 * A single-key shortcut must not fire while someone is filling in the
 * search box or a cell editor. Chords with a modifier still work there,
 * because that is what a modifier is for.
 */
function inTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/** What {@link useShortcuts} needs. */
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
 * @internal
 */
export function useShortcuts(options: UseShortcutsOptions): void {
  const { enabled, onCommand } = options;
  const shortcuts = options.shortcuts ?? DEFAULT_SHORTCUTS;
  const getTarget = options.target;
  useEffect(() => {
    if (!enabled || shortcuts.length === 0) return;
    const parsed = shortcuts.map((shortcut) => ({
      chord: parseChord(shortcut.chord),
      command: shortcut.command,
    }));
    const node = getTarget?.() ?? document;
    const onKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) return;
      for (const { chord, command } of parsed) {
        const bare = !chord.mod && !chord.ctrl && !chord.meta;
        if (bare && inTextEntry(event.target)) continue;
        if (!matches(chord, event)) continue;
        event.preventDefault();
        onCommand(command);
        return;
      }
    };
    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, shortcuts, onCommand, getTarget]);
}
