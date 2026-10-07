import type { Attrs } from "@adapttable/vue";
import { useScopeActivity } from "@adapttable/vue/adapter";
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
import { defineComponent, h, mergeProps, shallowRef, watch } from "vue";

import { rekaPortal } from "./portal";
import { rekaTarget } from "./target";

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
function direction(value: unknown): "rtl" | "ltr" | undefined {
  return value === "rtl" || value === "ltr" ? value : undefined;
}

function renderSelect(
  control: RekaSelectControl,
  state: {
    readonly open: boolean;
    readonly live: () => boolean;
    readonly current: () => boolean;
    readonly isOpen: () => boolean;
    readonly onOpenChange: (open: boolean) => void;
  }
) {
  const { disabled, required, name, form, dir, ...triggerAttrs } =
    control.attrs;
  // Retained native events can outlive the item's component-level emits.
  const admitItem = (event: Event) => {
    if (!state.current() || !state.isOpen()) event.preventDefault();
  };
  const item = (option: RekaSelectControl["options"][number]) =>
    h(
      SelectItem,
      {
        key: option.value,
        value: optionKey(option.value),
        disabled: option.disabled,
        class: "at-reka-select-item",
        onSelect: admitItem,
        onKeydownCapture: admitItem,
        onPointerupCapture: admitItem,
      },
      {
        default: () => [
          h(SelectItemText, null, { default: () => option.label }),
          h(
            SelectItemIndicator,
            { "aria-hidden": true },
            { default: () => "✓" }
          ),
        ],
      }
    );
  const viewport = () =>
    h(
      SelectViewport,
      { class: "at-reka-select-viewport" },
      { default: () => control.options.map(item) }
    );
  const content = () =>
    h(
      SelectContent,
      {
        class: "at-reka-select-content",
        position: "popper",
        sideOffset: 5,
        collisionPadding: 8,
        onCloseAutoFocus: (event: Event) => {
          if (!state.live()) event.preventDefault();
        },
      },
      { default: viewport }
    );
  const value = () =>
    control.options.find((option) => option.value === control.value)?.label ??
    control.value;
  const trigger = () =>
    rekaTarget(
      SelectTrigger,
      mergeProps(triggerAttrs, { class: "at-reka-select", dir }),
      {
        default: () => [
          h(SelectValue, null, { default: value }),
          h(SelectIcon, { class: "at-reka-select-icon", "aria-hidden": true }),
        ],
      }
    );
  return h(
    SelectRoot,
    {
      disabled: disabled === true,
      required: required === true,
      name: typeof name === "string" ? name : undefined,
      form: typeof form === "string" ? form : undefined,
      dir: direction(dir),
      modelValue: optionKey(control.value),
      open: state.open,
      "onUpdate:open": state.onOpenChange,
      "onUpdate:modelValue": (value: unknown) => {
        if (!state.current()) return;
        const option = control.options.find(
          (item) => optionKey(item.value) === value
        );
        if (option) control.onChange(option.value);
      },
    },
    { default: () => [trigger(), rekaPortal(SelectPortal, content)] }
  );
}

/** Ephemeral menu visibility is scoped to the actual Select instance. */
const RekaSelect = defineComponent(
  (props: { readonly control: RekaSelectControl }) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    let generation = 0;
    watch(
      [active, () => props.control.attrs.disabled === true],
      ([live, disabled]) => {
        generation++;
        if ((!live || disabled) && open.value) {
          open.value = false;
          props.control.onOpenChange?.(false);
        }
      },
      { flush: "sync" }
    );
    return () => {
      const control = props.control;
      const ticket = generation;
      const live = () =>
        active.value &&
        props.control.attrs.disabled !== true &&
        ticket === generation;
      return renderSelect(control, {
        open: live() && open.value,
        live,
        current: () => live() && props.control === control,
        isOpen: () => open.value,
        onOpenChange: (value) => {
          if (!live()) return;
          if (value && !open.value) generation++;
          open.value = value;
          control.onOpenChange?.(value);
        },
      });
    };
  },
  { name: "RekaSelect", props: ["control"], inheritAttrs: false }
);

export function rekaSelect(control: RekaSelectControl) {
  return h(RekaSelect, { control });
}
