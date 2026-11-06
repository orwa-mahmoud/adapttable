/**
 * Shell operations projected from the controllers that already own them.
 *
 * Find, density, fullscreen, context menus, the command palette, and print
 * each keep their controller. This module does not construct one. A runtime
 * view holds the owner's object when that operation is armed, and omits it
 * when it is not, so a capability the table did not compose is not advertised.
 *
 * FindInTableState, ResolvedDensity, FullscreenState, GridFocusState,
 * SelectionStats, and FeatureHostState stay the public shapes bindings
 * return. The contributions here are the runtime projection of those owners.
 */
import type { Command } from "../actions/commandRegistry";
import type { ContextMenuItem } from "../actions/contextMenuModel";
import type { TableDensity } from "../url/viewStateSlices";
import type { ContextMenuItemsFactory } from "./currentHost";
import type { TableRuntimeView } from "./tableRuntime";

/**
 * Which module owns each shell operation.
 *
 * The value is the owner. Nothing is imported or constructed from this map.
 *
 * @public
 */
export const SHELL_OPERATION_OWNERS = {
  find: "find/findController.ts",
  density: "layout/densityContract.ts",
  fullscreen: "layout/layoutBindingState.ts",
  contextMenu: "actions/contextMenuModel.ts",
  commandPalette: "actions/commandPaletteController.ts",
  print: "layout/shellPipeline.ts",
} as const;

/**
 * A shell operation with a named owner.
 *
 * @public
 */
export type ShellOperation = keyof typeof SHELL_OPERATION_OWNERS;

/**
 * The find bar the find controller publishes.
 *
 * `openBar` is present only while find is composed. Without it the browser
 * keeps Ctrl/Cmd+F.
 *
 * @public
 */
export interface FindContribution {
  /** Whether the bar is showing. */
  readonly open: boolean;
  /** The current query. */
  readonly query: string;
  /** Show or hide the bar. */
  readonly setOpen: (open: boolean) => void;
  /** Type into the bar. */
  readonly setQuery: (query: string) => void;
  /** Open the bar. Absent when find is not composed. */
  readonly openBar?: () => void;
}

/**
 * Density the chooser publishes.
 *
 * Present only while a density chooser is composed. A table that renders a
 * default density and offers no chooser does not publish this.
 *
 * @public
 */
export interface DensityContribution {
  /** The density the chooser is rendering. */
  readonly density: TableDensity;
  /** Request a change through the chooser's own setter. */
  readonly onDensityChange: (next: TableDensity) => void;
}

/**
 * Fullscreen the fullscreen controller publishes.
 *
 * The toolbar toggle is this object's `toggle`. A browser that cannot
 * fullscreen leaves `supported` false, and the projection omits it.
 *
 * @public
 */
export interface FullscreenContribution {
  /** Whether the browser will allow fullscreen. */
  readonly supported: boolean;
  /** Whether the table is the fullscreen element. */
  readonly active: boolean;
  /** Enter or leave fullscreen. */
  readonly toggle: () => void;
}

/**
 * The context menu the feature host or the menu model publishes.
 *
 * `items` is the host's factory list, the same array `registerContextMenuItems`
 * appends to. `entries` is the menu model a binding already resolved.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface ContextMenuContribution<TRow = unknown> {
  /** Factories the feature host collected. */
  readonly items?: readonly ContextMenuItemsFactory<TRow>[];
  /** Entries a menu model already resolved. */
  readonly entries?: readonly ContextMenuItem[];
  /** Close the open menu, when the model publishes a closer. */
  readonly close?: () => void;
}

/**
 * The command palette the controller publishes.
 *
 * `commands` is the host's list, the same array `registerCommand` appends to.
 *
 * @public
 */
export interface CommandPaletteContribution {
  /** Commands the palette lists from the host and its features. */
  readonly commands: readonly Command[];
  /** Open the palette, when the controller publishes an opener. */
  readonly open?: () => void;
  /** Close the palette, when the controller publishes a closer. */
  readonly close?: () => void;
}

/**
 * Print the host wired.
 *
 * @public
 */
export interface PrintContribution {
  /** Open the print dialog. The host owns what gets printed. */
  readonly onPrint: () => void;
}

/**
 * Shell operations a chrome or a live gate may be holding.
 *
 * Every field is optional. An absent field is an operation that is not armed.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface ShellOperationInput<TRow = unknown> {
  readonly find?: FindContribution;
  readonly density?: DensityContribution;
  readonly fullscreen?: FullscreenContribution;
  readonly contextMenu?: ContextMenuContribution<TRow>;
  readonly commandPalette?: CommandPaletteContribution;
  readonly print?: PrintContribution;
}

const shellOverlays = new WeakMap<object, object>();

/**
 * Remember the shell operations a live gate published for one chrome.
 *
 * The runtime view is built before find and fullscreen exist. The gate writes
 * them here, keyed by the chrome object the publisher already holds, so a
 * later read sees the owner's object and a nested table's chrome does not.
 *
 * @param owner - The chrome object the publisher updated.
 * @param input - The operations the live controllers currently publish.
 *
 * @public
 */
export function publishShellOverlay<TRow>(
  owner: object,
  input: ShellOperationInput<TRow>
): void {
  shellOverlays.set(owner, input);
}

/**
 * The overlay {@link publishShellOverlay} stored for this chrome, if any.
 */
export function readShellOverlay<TRow>(
  owner: object
): ShellOperationInput<TRow> | undefined {
  const stored = shellOverlays.get(owner);
  if (stored === undefined || !isShellOperationInput<TRow>(stored)) {
    return undefined;
  }
  return stored;
}

function isShellOperationInput<TRow>(
  value: object
): value is ShellOperationInput<TRow> {
  return typeof value === "object";
}

/**
 * The armed shell operations, each field the owner's own object.
 *
 * Find is armed when it can open the bar. Fullscreen is armed when the
 * browser supports it. The other operations are armed when their owner
 * published a contribution. An unarmed operation is omitted.
 *
 * @param input - What the chrome or the live gate is holding.
 * @returns The armed contributions. Each present field is the input's object.
 *
 * @public
 */
export function projectShellOperations<TRow>(
  input: ShellOperationInput<TRow>
): ShellOperationInput<TRow> {
  const projected: {
    -readonly [Key in keyof ShellOperationInput<TRow>]?: ShellOperationInput<TRow>[Key];
  } = {};
  if (input.find?.openBar) projected.find = input.find;
  if (input.density) projected.density = input.density;
  if (input.fullscreen?.supported) projected.fullscreen = input.fullscreen;
  if (input.contextMenu) projected.contextMenu = input.contextMenu;
  if (input.commandPalette) projected.commandPalette = input.commandPalette;
  if (input.print) projected.print = input.print;
  return projected;
}

/**
 * Lay armed shell operations onto a runtime view, and clear the ones that
 * are no longer armed.
 *
 * @param view - The view the chrome published.
 * @param input - The operations the owners currently publish.
 * @returns The same view fields, with shell operations replaced.
 *
 * @public
 */
export function withShellOperations<TRow>(
  view: TableRuntimeView<TRow>,
  input: ShellOperationInput<TRow>
): TableRuntimeView<TRow> {
  const projected = projectShellOperations(input);
  return {
    ...view,
    find: projected.find,
    density: projected.density,
    fullscreen: projected.fullscreen,
    contextMenu: projected.contextMenu,
    commandPalette: projected.commandPalette,
    print: projected.print,
  };
}
