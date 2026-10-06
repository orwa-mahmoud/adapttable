/**
 * The command palette, armed: open state, the shortcut that opens it, and
 * the commands it lists.
 */
import { fromStore, injectShortcuts, readMaybe } from "@adapttable/angular";
import type { CommandPaletteOptions } from "@adapttable/angular/features";
import {
  type Command,
  commandPaletteCommands,
  createCommandPaletteController,
  type Direction,
  type FeatureHostState,
  isCommandPaletteArmed,
  OPEN_PALETTE_COMMAND,
  type TableCommandOptions,
  type TableLabels,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import { ADAPTTABLE_PALETTE_OPEN } from "./paletteState";

export { OPEN_PALETTE_COMMAND };

/**
 * What {@link injectCommandPalette} needs.
 *
 * @public
 */
export interface CommandPaletteInjectOptions extends TableCommandOptions {
  /** The prop as the host wrote it: `true`, an options object, or absent. */
  readonly commandPalette?: boolean | CommandPaletteOptions;
  /** Label overrides; gaps fall back to English. */
  readonly labels: TableLabels;
  /** The table's current writing direction, including portaled surfaces. */
  readonly dir?: Direction;
  /** The host of this table, for commands a feature registered. */
  readonly featureHost?: FeatureHostState;
}

/**
 * What an adapter binds and renders.
 *
 * @public
 */
export interface TableCommandPalette {
  /** Whether it is showing. */
  readonly open: boolean;
  /** Close it. */
  readonly close: () => void;
  /** Open it — for a toolbar button or a host control. */
  readonly show: () => void;
  /** Everything it lists. */
  readonly commands: readonly Command[];
}

/** The options object, when the host passed one. */
function paletteConfig(
  commandPalette: boolean | CommandPaletteOptions | undefined
): CommandPaletteOptions | undefined {
  return typeof commandPalette === "object" ? commandPalette : undefined;
}

/**
 * Arm a table's command palette.
 *
 * @param options - The prop, the labels, and the handlers behind the
 *   built-in commands.
 * @param injector - The caller's injector, when this runs outside a
 *   construction context.
 * @returns The open state and the commands.
 *
 * @public
 */
export function injectCommandPalette(
  options: Signal<CommandPaletteInjectOptions>,
  injector?: Injector
): Signal<TableCommandPalette> {
  if (injector === undefined) assertInInjectionContext(injectCommandPalette);
  const resolved = injector ?? inject(Injector);
  const controller = createCommandPaletteController({});
  const local = fromStore(controller, { injector: resolved });
  effect(
    () => {
      const config = paletteConfig(options().commandPalette);
      controller.configure({
        open: readMaybe(config?.open),
        onOpenChange: config?.onOpenChange,
      });
    },
    { injector: resolved }
  );
  const open = computed(() => {
    const config = paletteConfig(options().commandPalette);
    return readMaybe(config?.open) ?? local().open;
  });
  const setOpen = (next: boolean) => {
    controller.setOpen(next);
  };
  const token = resolved.get(ADAPTTABLE_PALETTE_OPEN, null);
  effect(
    () => {
      if (!token) return;
      const current = options();
      const enabled = isCommandPaletteArmed(
        current.commandPalette,
        current.featureHost?.commands
      );
      token.set(enabled ? { open: open(), setOpen } : null);
    },
    { injector: resolved }
  );
  injectShortcuts(
    computed(() => {
      const current = options();
      const config = paletteConfig(current.commandPalette);
      return {
        enabled: isCommandPaletteArmed(
          current.commandPalette,
          current.featureHost?.commands
        ),
        shortcuts: config?.shortcuts,
        onCommand: (command: string) => {
          if (command === OPEN_PALETTE_COMMAND) setOpen(true);
        },
      };
    }),
    resolved
  );
  return computed(() => {
    const current = options();
    const config = paletteConfig(current.commandPalette);
    const enabled = isCommandPaletteArmed(
      current.commandPalette,
      current.featureHost?.commands
    );
    const shown = enabled && open();
    return {
      open: shown,
      close: () => {
        setOpen(false);
      },
      show: () => {
        setOpen(true);
      },
      commands: commandPaletteCommands({
        enabled,
        labels: current.labels,
        onPrint: current.onPrint,
        onExport: current.onExport,
        exportLabel: current.exportLabel,
        onClearFilters: current.onClearFilters,
        hasFilters: current.hasFilters,
        commands: config?.commands,
        registered: current.featureHost?.commands,
      }),
    };
  });
}
