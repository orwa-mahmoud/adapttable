/**
 * The palette, armed: open state, the shortcut that opens it, and the
 * commands it lists.
 *
 * Same reasoning as the context menu's composition — an adapter that
 * assembles three hooks itself is an adapter that can wire two of them and
 * ship. Here the omission would be quieter still: a palette whose shortcut
 * was never bound simply never appears, and nothing on screen is missing.
 */
import { useCallback, useMemo, useState } from "react";

import { appendByKey, currentFeatureHost } from "../features/currentHost";
import type { TableLabels } from "../types";
import {
  type Command,
  type TableCommandOptions,
  tableCommands,
} from "./commandRegistry";
import { type Shortcut, useShortcuts } from "./useShortcuts";

/** The command key the default shortcut runs. */
export const OPEN_PALETTE_COMMAND = "command-palette";

/** How a host arms the palette. */
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
}

/** What {@link useCommandPalette} needs. */
export interface UseCommandPaletteOptions extends TableCommandOptions {
  /** The prop as the host wrote it: `true`, an options object, or absent. */
  commandPalette?: boolean | CommandPaletteOptions;
  labels: TableLabels;
}

/** What an adapter binds and renders. */
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
 */
export function useCommandPalette(
  options: UseCommandPaletteOptions
): TableCommandPalette {
  const { commandPalette } = options;
  const pluginCommands = currentFeatureHost()?.commands;
  const enabled =
    commandPalette !== false &&
    (commandPalette !== undefined || Boolean(pluginCommands?.length));
  const [open, setOpen] = useState(false);
  const config =
    typeof commandPalette === "object" ? commandPalette : undefined;

  const close = useCallback(() => {
    setOpen(false);
  }, []);
  const show = useCallback(() => {
    setOpen(true);
  }, []);

  const onCommand = useCallback((command: string) => {
    if (command === OPEN_PALETTE_COMMAND) setOpen(true);
  }, []);

  useShortcuts({
    enabled,
    shortcuts: config?.shortcuts,
    onCommand,
  });

  const commands = useMemo(
    () =>
      !enabled
        ? []
        : [
            ...tableCommands({
              labels: options.labels,
              onPrint: options.onPrint,
              onExport: options.onExport,
              onClearFilters: options.onClearFilters,
              hasFilters: options.hasFilters,
            }),
            ...appendByKey(
              config?.commands ?? [],
              pluginCommands ?? [],
              (command) => command.key
            ),
          ],
    [
      enabled,
      config?.commands,
      pluginCommands,
      options.labels,
      options.onPrint,
      options.onExport,
      options.onClearFilters,
      options.hasFilters,
    ]
  );

  return { open: enabled && open, close, show, commands };
}
