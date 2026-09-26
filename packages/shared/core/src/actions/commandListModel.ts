/**
 * The command palette's list: the query, the highlighted command, and what a
 * key press in the search input does — the combobox pattern, shared by every
 * binding.
 *
 * Focus stays in the input while the arrows move a highlight through the
 * filtered commands, so typing never loses the highlight and arrowing never
 * loses the caret. Enter runs the highlighted command and Escape closes. A
 * binding renders the surface, the input and the rows, and keeps focus inside
 * with {@link tabTrapTarget}.
 */
import { type Command, filterCommands } from "./commandRegistry";

/**
 * The list's state at one moment.
 *
 * @public
 */
export interface CommandListSnapshot {
  /** What the reader typed. */
  readonly query: string;
  /** The highlighted row, before clamping to the matches. */
  readonly active: number;
}

/**
 * The palette list's controller.
 *
 * @public
 */
export interface CommandListController {
  /** The current state. A new object whenever anything in it changes. */
  readonly getSnapshot: () => CommandListSnapshot;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Type into the search input. The highlight returns to the first match. */
  readonly setQuery: (query: string) => void;
  /** Highlight a row — what hovering it does. */
  readonly setActive: (index: number) => void;
  /** Clear the query and the highlight — what opening the palette does. */
  readonly reset: () => void;
}

const EMPTY: CommandListSnapshot = { query: "", active: 0 };

/**
 * Create the palette list's controller.
 *
 * @returns The controller, with an empty query.
 *
 * @public
 */
export function createCommandList(): CommandListController {
  let snapshot = EMPTY;
  const listeners = new Set<() => void>();
  const write = (next: CommandListSnapshot): void => {
    if (next.query === snapshot.query && next.active === snapshot.active) {
      return;
    }
    snapshot = next;
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setQuery(query) {
      write({ query, active: 0 });
    },
    setActive(active) {
      write({ ...snapshot, active });
    },
    reset() {
      write(EMPTY);
    },
  };
}

/**
 * What the list shows: the commands matching the query, and the highlighted
 * row clamped to them.
 *
 * @public
 */
export interface CommandListView {
  /** The commands matching the query, in list order. */
  readonly matches: readonly Command[];
  /** The highlighted row, within the matches. */
  readonly active: number;
}

/**
 * The list a snapshot shows over a set of commands.
 *
 * @param commands - Every command the palette offers.
 * @param snapshot - The query and the highlight.
 * @returns The matches and the clamped highlight.
 *
 * @public
 */
export function commandListView(
  commands: readonly Command[],
  snapshot: CommandListSnapshot
): CommandListView {
  const matches = filterCommands(commands, snapshot.query);
  return {
    matches,
    active: Math.min(snapshot.active, Math.max(0, matches.length - 1)),
  };
}

/**
 * Move the highlight for a navigation key, wrapping at both ends.
 *
 * @param key - The key pressed.
 * @param at - The highlighted row.
 * @param count - How many rows there are.
 * @returns The next row, or `undefined` when the key does not navigate.
 *
 * @public
 */
export function nextCommandIndex(
  key: string,
  at: number,
  count: number
): number | undefined {
  if (count === 0) return undefined;
  if (key === "ArrowDown") return (at + 1) % count;
  if (key === "ArrowUp") return (at - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
}

/**
 * What a key press in the search input does.
 *
 * @public
 */
export type CommandListKeyAction =
  | { readonly kind: "close" }
  | { readonly kind: "run"; readonly command: Command | undefined }
  | { readonly kind: "move"; readonly to: number };

/**
 * The action a key press in the search input takes: Escape closes, Enter runs
 * the highlighted command, the arrows, Home and End move the highlight.
 *
 * @param key - The key pressed.
 * @param view - The list as shown.
 * @returns The action, or `null` for a key the list leaves alone.
 *
 * @public
 */
export function commandListKeyAction(
  key: string,
  view: CommandListView
): CommandListKeyAction | null {
  if (key === "Escape") return { kind: "close" };
  if (key === "Enter") {
    return { kind: "run", command: view.matches[view.active] };
  }
  const to = nextCommandIndex(key, view.active, view.matches.length);
  return to === undefined ? null : { kind: "move", to };
}

/**
 * Run a command from the palette: close first, then select. A command that
 * opens a dialog must not do it under a palette that is still mounted. A
 * missing or disabled command does nothing.
 *
 * @param command - The command to run.
 * @param close - Close the palette.
 *
 * @public
 */
export function runCommand(
  command: Command | undefined,
  close: () => void
): void {
  if (!command || command.disabled === true) return;
  close();
  command.onSelect();
}

/**
 * Where Tab takes focus to keep it inside a modal: the first focusable
 * element after the last, the last before the first. `undefined` when focus
 * is not at an edge, or nothing inside can hold it — the browser's own Tab
 * move is then the right one.
 *
 * @param focusables - The focusable elements inside, in tab order.
 * @param current - The element holding focus.
 * @param backwards - Whether Shift is held.
 * @returns The element to focus instead, or `undefined`.
 *
 * @public
 */
export function tabTrapTarget<T>(
  focusables: readonly T[],
  current: T | null,
  backwards: boolean
): T | undefined {
  if (focusables.length === 0 || current === null) return undefined;
  const at = focusables.indexOf(current);
  const atEdge = backwards ? at === 0 : at === focusables.length - 1;
  if (!atEdge) return undefined;
  return backwards ? focusables.at(-1) : focusables[0];
}
