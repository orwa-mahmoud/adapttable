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
import { NText } from "naive-ui";
import { defineComponent, h } from "vue";

import { NaivePaletteSurface } from "./actions/NaivePaletteSurface";
import { naiveButton } from "./controls/button";
import { naiveInput } from "./controls/input";

const NaiveCommandPalette = /*#__PURE__*/ defineComponent(
  (props: ActionPresentation & { readonly model: CommandPaletteModel }) => {
    // A stable surface identity lets the shared controller retain queued actions.
    const slots: CommandPaletteSlots = {
      Surface: managedCommandPaletteSurface((control) =>
        h(NaivePaletteSurface, {
          control,
          container: props.container,
          dir: props.dir,
        })
      ),
      Input: ({ inputProps }) => {
        const { value, onChange, ref, ...attrs } = inputProps;
        return naiveInput({
          value,
          onChange,
          attrs: {
            ...toVueAttrs(attrs),
            ref,
            class: props.classNames?.commandInput,
          },
        });
      },
      Item: (control) =>
        naiveButton(
          {
            ...toVueAttrs(control.itemProps),
            class: props.classNames?.commandItem,
            tabindex: -1,
            disabled: control.command.disabled,
          },
          control.command.label
        ),
      Empty: (control) =>
        h(
          NText,
          {
            "data-adapttable-part": "command-empty",
            class: props.classNames?.commandEmpty,
          },
          { default: () => control.message }
        ),
    };
    return () => [
      props.model.button
        ? naiveButton(
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
    name: "NaiveCommandPalette",
    props: ["model", "labels", "dir", "classNames", "container"],
  }
);
export function commandPalette(
  options: Parameters<typeof bindingCommandPalette>[0] = true
): StaticTableFeature {
  return extendFeature(bindingCommandPalette(options), [
    slotRender(COMMAND_PALETTE_CONTROL, (props) =>
      h(NaiveCommandPalette, props)
    ),
  ]);
}
export type { CommandPaletteOptions } from "@adapttable/vue/features";
