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
import { Primitive } from "reka-ui";
import { defineComponent, h, type PropType } from "vue";

import { RekaCommandDialog } from "./actions/CommandDialog";
import { rekaButton, rekaInput } from "./controls/basic";

const CommandPaletteControl = defineComponent(
  (props: ActionPresentation & { readonly model: CommandPaletteModel }) => {
    const slots: CommandPaletteSlots = {
      Surface: managedCommandPaletteSurface((control) =>
        h(RekaCommandDialog, {
          ...control,
          dir: props.dir,
          container: props.container,
        })
      ),
      Input: ({ inputProps: { value, onChange, ...attrs } }) =>
        rekaInput({
          value,
          onChange,
          attrs: {
            ...toVueAttrs(attrs),
            class: props.classNames?.commandInput,
          },
        }),
      Item: ({ command, itemProps }) =>
        h(
          Primitive,
          {
            as: "div",
            ...toVueAttrs(itemProps),
            class: ["at-reka-command-item", props.classNames?.commandItem],
          },
          { default: () => command.label }
        ),
      Empty: ({ message }) =>
        h(
          "p",
          {
            "data-adapttable-part": "command-empty",
            class: ["at-reka-command-empty", props.classNames?.commandEmpty],
          },
          message
        ),
    };
    return () => [
      props.model.button
        ? rekaButton(
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
    name: "RekaCommandPaletteControl",
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
    slotRender(COMMAND_PALETTE_CONTROL, (props) =>
      h(CommandPaletteControl, props)
    ),
  ]);
}
export type { CommandPaletteOptions } from "@adapttable/vue/features";
