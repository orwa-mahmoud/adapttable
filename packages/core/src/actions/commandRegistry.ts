/**
 * Every action the table can perform, in one list.
 *
 * A command palette that keeps its own list of commands is a second place
 * for an action to exist, and the two drift: an action gains a condition in
 * the menu and not in the palette, or is renamed in one and not the other,
 * and the palette quietly offers something that no longer works. So there
 * is no palette-shaped command type here. A command IS a
 * {@link ContextMenuItem} — the same object the context menus already
 * render — and the palette is another way of showing the same list.
 *
 * What a palette adds is reach. A context menu is scoped to what was
 * right-clicked; a palette is scoped to the table, so it carries the
 * actions that have no particular target — print, export, clear the
 * filters — alongside the ones a menu would offer for the current
 * selection.
 *
 * Filtering is a plain substring match, case- and accent-insensitive.
 * Fuzzy matching is a good default for a file switcher with thousands of
 * paths and a poor one for a list of a dozen actions, where it mostly
 * finds the wrong entry with a high score.
 */
import type { ContextMenuItem } from "./contextMenuModel";

/**
 * A command, which is exactly a menu entry.
 *
 * @public
 */
export type Command = ContextMenuItem;

/** One command, with the text a search matches against. */
interface Searchable {
  item: Command;
  haystack: string;
}

/**
 * Fold accents and case so a search for "resume" finds "Résumé".
 *
 * Someone typing into a palette is typing quickly, from memory, in
 * whatever keyboard layout they have. Making them reproduce diacritics is
 * a way of hiding an action from them.
 */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function searchable(item: Command): Searchable {
  return { item, haystack: fold(item.label) };
}

/**
 * The commands matching a query, in the order they were registered.
 *
 * Registration order is deliberate: it is the order the host chose, which
 * is more meaningful than alphabetical and does not move under the user as
 * they type. An empty query lists everything.
 *
 * @param commands - Every command available right now.
 * @param query - What the user has typed.
 * @returns The matches.
 *
 * @internal
 */
export function filterCommands(
  commands: readonly Command[],
  query: string
): Command[] {
  const needle = fold(query.trim());
  if (needle === "") return [...commands];
  return commands
    .map(searchable)
    .filter(({ haystack }) => haystack.includes(needle))
    .map(({ item }) => item);
}

/** What {@link tableCommands} needs to build the table-wide actions. */
export interface TableCommandOptions {
  /** Labels for the built-in commands. */
  labels: {
    print?: string;
    exportCsv?: string;
    clearAll?: string;
  };
  /** Open the print dialog on the current view. */
  onPrint?: () => void;
  /** Run the export the toolbar button runs. */
  onExport?: () => void;
  /** Clear every active filter. */
  onClearFilters?: () => void;
  /** Whether there is anything to clear, so the entry can say so. */
  hasFilters?: boolean;
}

/**
 * The commands that belong to the table rather than to a target.
 *
 * Each appears only when its handler is wired, on the same rule the
 * context menus follow: an action the host has not connected is not
 * offered, because a palette entry that does nothing is worse than one
 * that is missing.
 *
 * @param options - The handlers and their labels.
 * @returns The table-wide commands, in display order.
 *
 * @internal
 */
export function tableCommands(options: TableCommandOptions): Command[] {
  const { labels } = options;
  const commands: Command[] = [];
  if (options.onPrint) {
    commands.push({
      key: "print",
      label: labels.print ?? "Print",
      onSelect: options.onPrint,
    });
  }
  if (options.onExport) {
    commands.push({
      key: "export",
      label: labels.exportCsv ?? "Export CSV",
      onSelect: options.onExport,
    });
  }
  if (options.onClearFilters) {
    commands.push({
      key: "clear-filters",
      label: labels.clearAll ?? "Clear all",
      disabled: options.hasFilters !== true,
      onSelect: options.onClearFilters,
    });
  }
  return commands;
}
