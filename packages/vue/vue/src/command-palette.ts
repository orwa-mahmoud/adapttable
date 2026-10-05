import {
  commandPaletteCommands,
  createCommandPaletteController,
  createShortcutHandler,
  DEFAULT_SHORTCUTS,
  OPEN_PALETTE_COMMAND,
} from "@adapttable/core";
import { coreCommandPalette } from "@adapttable/core/binding";
import { computed, toValue, watch } from "vue";

import {
  COMMAND_PALETTE_CONTROL,
  COMMAND_PALETTE_MODEL,
  type CommandPaletteModel,
  type CommandPaletteOptions,
  EXPORT_MODEL,
} from "./actions/contracts";
import { featureActivity, ownsTableEvent } from "./actions/lifecycle";
import type {
  FeatureMountContext,
  StaticTableFeature,
} from "./features/tableFeature";
import { useExternalStore } from "./store";
function mountPalette<TRow>(context: FeatureMountContext<TRow>): void {
  const active = featureActivity(context);
  const controller = createCommandPaletteController({});
  const snapshot = useExternalStore(controller, { active: context.active });
  const config = () =>
    typeof context.options.value.commandPalette === "object"
      ? (context.options.value.commandPalette as CommandPaletteOptions)
      : undefined;
  const enabled = () =>
    active() && context.options.value.commandPalette !== false;
  const configure = () =>
    controller.configure({
      open: toValue(config()?.open),
      onOpenChange: config()?.onOpenChange,
    });
  const setOpen = (open: boolean) => {
    if (enabled()) {
      configure();
      controller.setOpen(open);
    }
  };
  watch(() => [toValue(config()?.open), config()?.onOpenChange], configure, {
    immediate: true,
    flush: "sync",
  });
  watch(
    context.active,
    (live) => {
      if (!live) {
        controller.configure({});
        controller.setOpen(false);
        configure();
      }
    },
    { flush: "sync" }
  );
  const exporting = context.state.get(EXPORT_MODEL);
  const model = computed<CommandPaletteModel>(() => ({
    open: enabled() && (toValue(config()?.open) ?? snapshot.value.open),
    button: config()?.button === true,
    show: () => setOpen(true),
    close: () => setOpen(false),
    commands: commandPaletteCommands({
      enabled: context.options.value.commandPalette !== false,
      labels: context.table.labels.value,
      onPrint:
        typeof context.options.value.onPrint === "function"
          ? () => {
              if (enabled()) (context.options.value.onPrint as () => void)();
            }
          : undefined,
      onExport:
        exporting.value?.exportDisabled || exporting.value?.exportBusy
          ? undefined
          : exporting.value?.onExportCsv,
      exportLabel: exporting.value?.exportLabel,
      onClearFilters: () => {
        if (enabled()) context.table.clearFilters();
      },
      hasFilters: Object.keys(context.source.value.extra).length > 0,
      commands: config()?.commands,
      registered: context.featureHost.value.commands,
    }),
  }));
  watch(model, (value) => context.state.set(COMMAND_PALETTE_MODEL, value), {
    immediate: true,
    flush: "sync",
  });
  watch(
    [context.root, context.active, () => config()?.shortcuts],
    ([root, live], _old, onCleanup) => {
      if (!root || !live) return;
      const run = createShortcutHandler(
        config()?.shortcuts ?? DEFAULT_SHORTCUTS,
        (command) => {
          if (command === OPEN_PALETTE_COMMAND) setOpen(true);
        }
      );
      const key = (event: KeyboardEvent) => {
        if (enabled() && ownsTableEvent(root, event) && !event.isComposing)
          run(event);
      };
      root.addEventListener("keydown", key);
      onCleanup(() => root.removeEventListener("keydown", key));
    },
    { immediate: true, flush: "sync" }
  );
}
export function commandPalette(
  options: boolean | CommandPaletteOptions = true
): StaticTableFeature {
  return {
    ...coreCommandPalette(options),
    mount: mountPalette,
    requiredSlots: [COMMAND_PALETTE_CONTROL],
  };
}
export type {
  CommandPaletteChromeProps,
  CommandPaletteSlots,
} from "./actions/commandPaletteChrome";
export { CommandPaletteChrome } from "./actions/commandPaletteChrome";
export type {
  CommandPaletteModel,
  CommandPaletteOptions,
} from "./actions/contracts";
export {
  COMMAND_PALETTE_CONTROL,
  COMMAND_PALETTE_MODEL,
} from "./actions/contracts";
export type * from "./index";
export type { Command, Shortcut } from "@adapttable/core";
