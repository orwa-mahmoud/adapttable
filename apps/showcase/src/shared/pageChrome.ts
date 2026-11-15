/**
 * The chrome every showcase page carries, decided once for React, Vue and
 * Angular: column resizing and the two menus a keystroke opens are always
 * there, selection statistics and find join an editing page, and find is on
 * wherever its state is worth sharing in the address bar. A framework maps
 * each switch to its kit's factory.
 */

/**
 * What a page is, as far as its chrome is concerned. A menu switch may carry
 * the kit's options for it instead of `true`.
 */
export interface PageChromeFlags<TPalette = never, TMenu = never> {
  /** Cells are editable. */
  readonly editing?: boolean;
  /** The page shows the footer strip. */
  readonly statusBar?: boolean;
  /** The page's URL namespace; the live demo and filtering share find state. */
  readonly urlKey?: string;
  /** The command palette; on unless the page turns it off. */
  readonly commandPalette?: boolean | TPalette;
  /** The context menu; on unless the page turns it off. */
  readonly contextMenu?: boolean | TMenu;
}

/** Which chrome a page composes, and the options a menu carries. */
export interface PageChrome<TPalette = never, TMenu = never> {
  /** Column edges drag to resize, on every page. */
  readonly resizableColumns: true;
  readonly statusBar: boolean;
  readonly selectionStats: boolean;
  readonly findInTable: boolean;
  readonly commandPalette: boolean | TPalette;
  readonly contextMenu: boolean | TMenu;
}

/** The URL namespaces whose find state the address bar carries. */
const FIND_IN_URL: ReadonlySet<string> = new Set(["live", "flt"]);

/**
 * The chrome a page composes.
 *
 * @param flags - What the page is.
 * @returns Each piece of chrome, on or off.
 */
export function pageChrome<TPalette = never, TMenu = never>(
  flags: PageChromeFlags<TPalette, TMenu>
): PageChrome<TPalette, TMenu> {
  const editing = flags.editing === true;
  return {
    resizableColumns: true,
    statusBar: flags.statusBar === true,
    selectionStats: editing,
    findInTable:
      editing || (flags.urlKey !== undefined && FIND_IN_URL.has(flags.urlKey)),
    commandPalette: flags.commandPalette ?? true,
    contextMenu: flags.contextMenu ?? true,
  };
}
