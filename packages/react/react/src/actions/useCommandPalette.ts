/**
 * The palette, armed: open state, the shortcut that opens it, and the
 * commands it lists.
 *
 * Same reasoning as the context menu's composition — an adapter that
 * assembles three hooks itself is an adapter that can wire two of them and
 * ship. Here the omission would be quieter still: a palette whose shortcut
 * was never bound simply never appears, and nothing on screen is missing.
 */
import {
  type Command,
  commandPaletteCommands,
  type CommandPaletteControllerOptions,
  createCommandPaletteController,
  type FeatureHostState,
  isCommandPaletteArmed,
  OPEN_PALETTE_COMMAND,
  type TableCommandOptions,
  type TableLabels,
} from "@adapttable/core";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { useFeatureHost } from "../features/featureHostContext";
import { type Shortcut, useShortcuts } from "./useShortcuts";

export { OPEN_PALETTE_COMMAND } from "@adapttable/core";

/**
 * How a host arms the palette.
 *
 * @public
 */
export interface CommandPaletteOptions {
  /**
   * Extra commands, appended after the built-in ones. They are the same
   * objects the context menus take, so an action can be written once and
   * offered in both.
   */
  commands?: readonly Command[];
  /**
   * The shortcuts. Defaults to Cmd/Ctrl+K opening the palette; pass your
   * own to remap, or `[]` to bind nothing.
   */
  shortcuts?: readonly Shortcut[];
  /**
   * Draw a toolbar control that opens the palette, with the kit's own button.
   * Off by default; the shortcut still works beside it.
   */
  button?: boolean;
  /**
   * Controlled open state, for a host that opens the palette from its own
   * control. Pair with {@link CommandPaletteOptions.onOpenChange}.
   */
  open?: boolean;
  /**
   * Told when the palette asks to open or close — the shortcut, the toolbar
   * control, Escape, or a command having run. Works with or without `open`.
   */
  onOpenChange?: (open: boolean) => void;
}

/** One table's palette open state, shared by the palette and its trigger. */
interface PaletteOpenState {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
}

/**
 * Where a composed palette keeps its open state, so the toolbar control and
 * the dialog read the same answer.
 */
export const CommandPaletteOpenContext = createContext<PaletteOpenState | null>(
  null
);

/** A palette configured with nothing: uncontrolled, and reporting to no one. */
const UNCONFIGURED: CommandPaletteControllerOptions = {};

/**
 * Hold a palette's open state: the host's, when it controls `open`, or the
 * table's own otherwise.
 */
export function usePaletteOpenState(
  options: CommandPaletteOptions | undefined
): PaletteOpenState {
  const settings = options ?? UNCONFIGURED;
  const [controller] = useState(() => createCommandPaletteController(settings));
  controller.configure(settings);
  const { open: localOpen } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  const open = options?.open ?? localOpen;
  return useMemo(
    () => ({ open, setOpen: controller.setOpen }),
    [open, controller]
  );
}

/**
 * What {@link useCommandPalette} needs.
 *
 * @public
 */
export interface UseCommandPaletteOptions extends TableCommandOptions {
  /** The prop as the host wrote it: `true`, an options object, or absent. */
  commandPalette?: boolean | CommandPaletteOptions;
  /** Label overrides; gaps fall back to English. */
  labels: TableLabels;
  /** The host of THIS table. Omit it only under {@link FeatureHostProvider}. */
  featureHost?: FeatureHostState;
}

/**
 * What an adapter binds and renders.
 *
 * @public
 */
export interface TableCommandPalette {
  /** Whether it is showing. */
  open: boolean;
  /** Close it. */
  close: () => void;
  /** Open it — for a toolbar button or a host control. */
  show: () => void;
  /** Everything it lists. */
  commands: readonly Command[];
}

/**
 * Arm a table's command palette.
 *
 * @param options - The prop, the labels, and the handlers behind the
 *   built-in commands.
 * @returns The open state and the commands.
 *
 * @public
 */
export function useCommandPalette(
  options: UseCommandPaletteOptions
): TableCommandPalette {
  const { commandPalette } = options;
  const fromTree = useFeatureHost();
  const pluginCommands = (options.featureHost ?? fromTree)?.commands;
  const enabled = isCommandPaletteArmed(commandPalette, pluginCommands);
  const config =
    typeof commandPalette === "object" ? commandPalette : undefined;
  // A composed palette shares its state with the toolbar control through the
  // feature's provider; a hook called on its own holds its own.
  const shared = useContext(CommandPaletteOpenContext);
  const own = usePaletteOpenState(config);
  const { open, setOpen } = shared ?? own;

  const close = useCallback(() => {
    setOpen(false);
  }, [setOpen]);
  const show = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  const onCommand = useCallback(
    (command: string) => {
      if (command === OPEN_PALETTE_COMMAND) setOpen(true);
    },
    [setOpen]
  );

  useShortcuts({
    enabled,
    shortcuts: config?.shortcuts,
    onCommand,
  });

  const commands = useMemo(
    () =>
      commandPaletteCommands({
        enabled,
        labels: options.labels,
        onPrint: options.onPrint,
        onExport: options.onExport,
        exportLabel: options.exportLabel,
        onClearFilters: options.onClearFilters,
        hasFilters: options.hasFilters,
        commands: config?.commands,
        registered: pluginCommands,
      }),
    [
      enabled,
      config?.commands,
      pluginCommands,
      options.labels,
      options.onPrint,
      options.onExport,
      options.exportLabel,
      options.onClearFilters,
      options.hasFilters,
    ]
  );

  const shown = enabled && open;
  return useMemo(
    () => ({ open: shown, close, show, commands }),
    [shown, close, show, commands]
  );
}
