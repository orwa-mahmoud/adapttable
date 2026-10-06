import type { Attrs } from "@adapttable/vue";
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from "reka-ui";
import { h, mergeProps } from "vue";

import { targetAttrs } from "./target";

export interface RekaSelectControl {
  readonly attrs: Attrs;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
    readonly disabled?: boolean;
  }[];
  readonly onChange: (value: string) => void;
  readonly onOpenChange?: (open: boolean) => void;
}

// Reka reserves "" for clearing. Encode every value, including a real empty option.
function optionKey(value: string): string {
  return `value:${value}`;
}

export function rekaSelect(control: RekaSelectControl) {
  const { disabled, required, name, form, dir, ...triggerAttrs } =
    control.attrs;
  return h(
    SelectRoot,
    {
      disabled: disabled === true,
      required: required === true,
      name: typeof name === "string" ? name : undefined,
      form: typeof form === "string" ? form : undefined,
      dir: dir === "rtl" ? "rtl" : dir === "ltr" ? "ltr" : undefined,
      modelValue: optionKey(control.value),
      "onUpdate:open": control.onOpenChange,
      "onUpdate:modelValue": (value: unknown) => {
        const option = control.options.find(
          (item) => optionKey(item.value) === value
        );
        if (option) control.onChange(option.value);
      },
    },
    {
      default: () => [
        h(
          SelectTrigger,
          mergeProps(targetAttrs(triggerAttrs), {
            class: "at-reka-select",
            dir,
          }),
          {
            default: () => [
              h(SelectValue, null, {
                default: () =>
                  control.options.find(
                    (option) => option.value === control.value
                  )?.label ?? control.value,
              }),
              h(SelectIcon, {
                class: "at-reka-select-icon",
                "aria-hidden": true,
              }),
            ],
          }
        ),
        h(SelectPortal, null, {
          default: () =>
            h(
              SelectContent,
              {
                class: "at-reka-select-content",
                position: "popper",
                sideOffset: 5,
                collisionPadding: 8,
              },
              {
                default: () =>
                  h(
                    SelectViewport,
                    { class: "at-reka-select-viewport" },
                    {
                      default: () =>
                        control.options.map((option) =>
                          h(
                            SelectItem,
                            {
                              key: option.value,
                              value: optionKey(option.value),
                              disabled: option.disabled,
                              class: "at-reka-select-item",
                            },
                            {
                              default: () => [
                                h(SelectItemText, null, {
                                  default: () => option.label,
                                }),
                                h(
                                  SelectItemIndicator,
                                  { "aria-hidden": true },
                                  { default: () => "✓" }
                                ),
                              ],
                            }
                          )
                        ),
                    }
                  ),
              }
            ),
        }),
      ],
    }
  );
}
