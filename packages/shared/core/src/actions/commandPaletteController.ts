/**
 * The command palette, armed: whether it is on, whether it is open, and the
 * commands it lists — shared by every binding.
 *
 * The open state is the host's when it controls `open`, and the palette's own
 * otherwise; either way every request to open or close is reported through
 * `onOpenChange`, so a host can follow the palette without owning it. The
 * shortcut that opens it runs {@link OPEN_PALETTE_COMMAND}, the same command
 * key a remapped shortcut names.
 *
 * The list is the table's own commands followed by the host's and then every
 * feature's, with a later command of the same key replacing an earlier one.
 */
import { appendByKey } from "../features/currentHost";
import {
  type Command,
  type TableCommandOptions,
  tableCommands,
} from "./commandRegistry";

/**
 * The command key the default shortcut runs to open the palette.
 *
 * @public
 */
export const OPEN_PALETTE_COMMAND = "command-palette";

/**
 * Whether a table's command palette is armed: the host asked for it with
 * `true` or an options object, or left the prop out while a feature
 * registered commands. An explicit `false` always wins.
 *
 * @param commandPalette - The prop as the host wrote it.
 * @param registered - The commands features registered.
 * @returns True when the palette and its shortcut should be live.
 *
 * @public
 */
export function isCommandPaletteArmed(
  commandPalette: boolean | object | undefined,
  registered: readonly unknown[] | undefined
): boolean {
  return (
    commandPalette !== false &&
    (commandPalette !== undefined || Boolean(registered?.length))
  );
}

/**
 * What {@link commandPaletteCommands} needs.
 *
 * @public
 */
export interface CommandPaletteCommandsOptions extends TableCommandOptions {
  /** Whether the palette is armed; off, it lists nothing. */
  enabled: boolean;
  /** The host's own commands, listed after the table's. */
  commands?: readonly Command[];
  /** The commands features registered, listed after the host's. */
  registered?: readonly Command[];
}

/**
 * Everything the palette lists: the table-wide commands whose handlers are
 * wired, then the host's commands, then the features', a later command of
 * the same key replacing an earlier one.
 *
 * @param options - Whether it is armed, the handlers and labels, and the
 *   extra commands.
 * @returns The commands, in display order; empty when not armed.
 *
 * @public
 */
export function commandPaletteCommands(
  options: CommandPaletteCommandsOptions
): Command[] {
  if (!options.enabled) return [];
  return [
    ...tableCommands({
      labels: options.labels,
      onPrint: options.onPrint,
      onExport: options.onExport,
      exportLabel: options.exportLabel,
      onClearFilters: options.onClearFilters,
      hasFilters: options.hasFilters,
    }),
    ...appendByKey(
      options.commands ?? [],
      options.registered ?? [],
      (command) => command.key
    ),
  ];
}

/**
 * What a command-palette controller is configured with.
 *
 * @public
 */
export interface CommandPaletteControllerOptions {
  /**
   * Controlled open state. While it is set the controller keeps no open
   * state of its own and only reports requests through `onOpenChange`.
   */
  open?: boolean;
  /** Told whenever the palette asks to open or close. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * The palette's own open state at one moment.
 *
 * @public
 */
export interface CommandPaletteSnapshot {
  /**
   * Whether the palette's own state says it is open. A controlled `open`
   * takes precedence over it.
   */
  readonly open: boolean;
}

/**
 * One palette's open state.
 *
 * @public
 */
export interface CommandPaletteController {
  /** The current state. A new object whenever it changes. */
  readonly getSnapshot: () => CommandPaletteSnapshot;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: CommandPaletteControllerOptions) => void;
  /**
   * Ask the palette to open or close: updates its own state unless `open`
   * is controlled, then tells `onOpenChange`.
   */
  readonly setOpen: (open: boolean) => void;
}

const CLOSED: CommandPaletteSnapshot = { open: false };
const OPEN: CommandPaletteSnapshot = { open: true };

/**
 * Create the open-state controller for one command palette.
 *
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createCommandPaletteController(
  initial: CommandPaletteControllerOptions
): CommandPaletteController {
  let options = initial;
  let snapshot = CLOSED;
  const listeners = new Set<() => void>();

  const setOpen = (open: boolean): void => {
    if (options.open === undefined && open !== snapshot.open) {
      snapshot = open ? OPEN : CLOSED;
      for (const listener of listeners) listener();
    }
    options.onOpenChange?.(open);
  };

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
    setOpen,
  };
}
