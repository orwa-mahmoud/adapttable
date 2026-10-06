import {
  COMMAND_PALETTE_CONTROL,
  CommandPaletteChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { type StaticTableFeature } from "@adapttable/vue";
import { commandPalette as bindingCommandPalette } from "@adapttable/vue/features";
import { h } from "vue";

import {
  nativeActionButton,
  nativePaletteSlots,
} from "./actions/nativeControls";
export function commandPalette(
  options: Parameters<typeof bindingCommandPalette>[0] = true
): StaticTableFeature {
  return extendFeature(bindingCommandPalette(options), [
    slotRender(COMMAND_PALETTE_CONTROL, (props) => [
      props.model.button
        ? nativeActionButton({
            label: props.labels.commandPalette,
            attrs: {
              type: "button",
              "data-adapttable-part": "command-palette-button",
              "aria-haspopup": "dialog",
              "aria-expanded": props.model.open,
              class: props.classNames?.commandPaletteButton,
              onClick: props.model.show,
            },
          })
        : null,
      h(CommandPaletteChrome, {
        commands: props.model.commands,
        open: props.model.open,
        onClose: props.model.close,
        labels: props.labels,
        className: props.classNames?.commandPalette,
        slots: nativePaletteSlots(props.classNames),
      }),
    ]),
  ]);
}
export type { CommandPaletteOptions } from "@adapttable/vue/features";
