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
} from "@adapttable/vue/adapter";
import { commandPalette as bindingCommandPalette } from "@adapttable/vue/features";
import { QItem, QItemSection } from "quasar";
import { defineComponent, h, type PropType } from "vue";

import { QuasarCommandSurface } from "./actions/QuasarCommandSurface";
import { quasarAttrs } from "./controls/controlAttrs";
import QuasarButton from "./controls/QuasarButton.vue";
import QuasarInput from "./controls/QuasarInput.vue";

export const CommandPalette = defineComponent(
  (props: ActionPresentation & { readonly model: CommandPaletteModel }) => {
    const slots: CommandPaletteSlots = {
      Surface: managedCommandPaletteSurface((control) =>
        h(QuasarCommandSurface, { control, dir: props.dir })
      ),
      Input: ({ inputProps: { value, onChange, ref, ...attrs } }) =>
        h(QuasarInput, {
          control: {
            value,
            onChange,
            label: attrs["aria-label"],
            attrs: {
              ...attrs,
              autofocus: true,
              class: props.classNames?.commandInput,
              ref,
            },
          },
        }),
      Item: ({ command, active, itemProps }) =>
        h(
          QItem,
          {
            ...quasarAttrs(itemProps),
            clickable: true,
            disable: command.disabled,
            active,
            tabindex: -1,
            class: props.classNames?.commandItem,
          },
          () => h(QItemSection, {}, () => command.label)
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
        ? h(QuasarButton, {
            label: props.labels.commandPalette,
            attrs: {
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
        slots,
      }),
    ];
  },
  {
    name: "QuasarCommandPalette",
    props: {
      model: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: CommandPaletteModel;
          })["model"]
        >,
      },
      labels: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: CommandPaletteModel;
          })["labels"]
        >,
      },
      dir: {
        type: String as PropType<
          (ActionPresentation & { readonly model: CommandPaletteModel })["dir"]
        >,
      },
      classNames: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: CommandPaletteModel;
          })["classNames"]
        >,
      },
      container: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: CommandPaletteModel;
          })["container"]
        >,
      },
    },
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
