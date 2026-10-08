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
import { defineComponent, h } from "vue";

import { ShadcnCommandDialog } from "./actions/CommandDialog";
import { shadcnActionButton, shadcnInput } from "./actions/controls";

const CommandPaletteControl = defineComponent(
  (props: ActionPresentation & { readonly model: CommandPaletteModel }) => {
    const slots: CommandPaletteSlots = {
      Surface: managedCommandPaletteSurface((control) =>
        h(ShadcnCommandDialog, {
          ...control,
          dir: props.dir,
          container: props.container,
        })
      ),
      Input: ({ inputProps: { value, onChange, ...attrs } }) =>
        shadcnInput({
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
            "data-slot": "command-item",
            ...toVueAttrs(itemProps),
            class: [
              "relative flex min-h-11 cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50 sm:min-h-8",
              props.classNames?.commandItem,
            ],
          },
          { default: () => command.label }
        ),
      Empty: ({ message }) =>
        h(
          "p",
          {
            "data-adapttable-part": "command-empty",
            class: [
              "py-6 text-center text-sm text-muted-foreground",
              props.classNames?.commandEmpty,
            ],
          },
          message
        ),
    };
    return () => [
      props.model.button
        ? shadcnActionButton(
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
    name: "ShadcnCommandPaletteControl",
    props: ["model", "labels", "dir", "classNames", "container"],
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
