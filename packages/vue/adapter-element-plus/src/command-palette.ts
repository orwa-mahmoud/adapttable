import type { StaticTableFeature } from "@adapttable/vue";
import {
  type ActionPresentation,
  COMMAND_PALETTE_CONTROL,
  CommandPaletteChrome,
  type CommandPaletteModel,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { commandPalette as bindingCommandPalette } from "@adapttable/vue/features";
import { defineComponent, h, type PropType } from "vue";

import {
  elementActionButton,
  elementPaletteSlots,
} from "./actions/elementRemainingControls";
const ElementCommandPaletteControl = defineComponent(
  (props: ActionPresentation & { readonly model: CommandPaletteModel }) => {
    const slots = elementPaletteSlots(
      () => props.classNames ?? {},
      () => props.container,
      () => props.dir
    );
    return () => [
      props.model.button
        ? elementActionButton({
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
        slots,
      }),
    ];
  },
  {
    name: "ElementCommandPaletteControl",
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
      container: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: CommandPaletteModel;
          })["container"]
        >,
      },
      classNames: {
        type: Object as PropType<
          (ActionPresentation & {
            readonly model: CommandPaletteModel;
          })["classNames"]
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
      h(ElementCommandPaletteControl, props)
    ),
  ]);
}
export type { CommandPaletteOptions } from "@adapttable/vue/features";
