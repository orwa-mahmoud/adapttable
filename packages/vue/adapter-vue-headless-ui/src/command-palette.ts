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
import { defineComponent, h, type PropType } from "vue";

import { HeadlessCommandDialog } from "./actions/CommandDialog";
import { headlessButton, headlessInput } from "./controls/basic";
import { HeadlessPrimitive } from "./controls/primitive";

const CommandPaletteControl = defineComponent(
  (props: ActionPresentation & { readonly model: CommandPaletteModel }) => {
    const slots: CommandPaletteSlots = {
      Surface: managedCommandPaletteSurface((control) =>
        h(HeadlessCommandDialog, {
          ...control,
          dir: props.dir,
          container: props.container,
        })
      ),
      Input: ({ inputProps: { value, onChange, ...attrs } }) =>
        headlessInput({
          value,
          onChange,
          attrs: {
            ...toVueAttrs(attrs),
            class: props.classNames?.commandInput,
          },
        }),
      Item: ({ command, itemProps }) =>
        h(
          HeadlessPrimitive,
          {
            as: "div",
            ...toVueAttrs(itemProps),
            class: ["at-headless-command-item", props.classNames?.commandItem],
          },
          { default: () => command.label }
        ),
      Empty: ({ message }) =>
        h(
          "p",
          {
            "data-adapttable-part": "command-empty",
            class: [
              "at-headless-command-empty",
              props.classNames?.commandEmpty,
            ],
          },
          message
        ),
    };
    return () => [
      props.model.button
        ? headlessButton(
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
    name: "HeadlessCommandPaletteControl",
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
