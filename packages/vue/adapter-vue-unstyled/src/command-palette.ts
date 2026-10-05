import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import {
  COMMAND_PALETTE_CONTROL,
  commandPalette as bindingCommandPalette,
  CommandPaletteChrome,
} from "@adapttable/vue/command-palette";
import { h } from "vue";

import {
  nativeActionButton,
  nativePaletteSlots,
} from "./actions/nativeControls";
export function commandPalette(
  options: Parameters<typeof bindingCommandPalette>[0] = true
) {
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
export type * from "@adapttable/vue/command-palette";
