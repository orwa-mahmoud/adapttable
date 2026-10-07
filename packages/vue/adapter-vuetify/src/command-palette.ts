import type { StaticTableFeature } from "@adapttable/vue";
import {
  type ActionPresentation,
  COMMAND_PALETTE_CONTROL,
  CommandPaletteChrome,
  type CommandPaletteModel,
  type CommandPaletteSlots,
  extendFeature,
  managedCommandPaletteSurface,
  slotRender,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import { commandPalette as bindingCommandPalette } from "@adapttable/vue/features";
import { defineComponent, h } from "vue";
import { VListItem } from "vuetify/components/VList";

import VuetifyCommandInput from "./actions/VuetifyCommandInput.vue";
import { VuetifyCommandSurface } from "./actions/VuetifyCommandSurface";
import { vuetifyButton } from "./controls";

export const CommandPalette = defineComponent(
  (props: ActionPresentation & { readonly model: CommandPaletteModel }) => {
    const slots: CommandPaletteSlots = {
      Surface: managedCommandPaletteSurface((control) =>
        h(VuetifyCommandSurface, {
          control,
          dir: props.dir,
          container: props.container,
        })
      ),
      Input: ({ inputProps }) =>
        h(VuetifyCommandInput, {
          control: inputProps,
          className: props.classNames?.commandInput,
        }),
      Item: ({ command, active, itemProps }) =>
        h(
          VListItem,
          {
            ...toVueAttrs(itemProps),
            link: true,
            disabled: command.disabled,
            active,
            tabindex: -1,
            class: props.classNames?.commandItem,
          },
          () => command.label
        ),
      Empty: ({ message }) =>
        h(
          "p",
          {
            "data-adapttable-part": "command-empty",
            class: props.classNames?.commandEmpty,
          },
          message
        ),
    };
    return () => [
      props.model.button
        ? vuetifyButton(
            {
              "data-adapttable-part": "command-palette-button",
              "aria-haspopup": "dialog",
              "aria-expanded": props.model.open,
              class: props.classNames?.commandPaletteButton,
              onClick: props.model.show,
            },
            props.labels.commandPalette
          )
        : null,
      h(CommandPaletteChrome, {
        commands: props.model.commands,
        open: props.model.open,
        onClose: props.model.close,
        labels: props.labels,
        className: props.classNames?.commandPalette,
        slots,
      }),
    ];
  },
  {
    name: "VuetifyCommandPalette",
    props: ["model", "labels", "dir", "classNames", "container"],
  }
);
export function commandPalette(
  options: Parameters<typeof bindingCommandPalette>[0] = true
): StaticTableFeature {
  return extendFeature(bindingCommandPalette(options), [
    slotRender(COMMAND_PALETTE_CONTROL, (props) => h(CommandPalette, props)),
  ]);
}
export type { CommandPaletteOptions } from "@adapttable/vue/features";
