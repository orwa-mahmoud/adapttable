import type { Attrs } from "@adapttable/vue";
import { useScopeActivity } from "@adapttable/vue/adapter";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/vue";
import {
  defineComponent,
  h,
  mergeProps,
  nextTick,
  type PropType,
  shallowRef,
  type VNodeChild,
  watch,
} from "vue";

import { useHeadlessDirection } from "./direction";
import { closeList, elementOf, focusChoice, usePlacement } from "./overlay";
import { headlessPortal } from "./portal";
import { OpenSignal } from "./signal";
import { headlessTarget } from "./target";

interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface HeadlessSelectControl {
  readonly attrs: Attrs;
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onChange: (value: string) => void;
  readonly onOpenChange?: (open: boolean) => void;
}

export interface HeadlessMultiSelectControl {
  readonly attrs: Attrs;
  readonly summary: VNodeChild;
  readonly options: readonly SelectOption[];
  readonly selected: readonly string[];
  readonly closeOnSelect: boolean;
  readonly menuClassName?: string;
  readonly menuPart?: string;
  readonly onToggle: (value: string, checked: boolean) => void;
}

/** One normalised shape, so a single Listbox renders both kinds. */
interface ListboxControl {
  readonly attrs: Attrs;
  readonly options: readonly SelectOption[];
  readonly multiple: boolean;
  readonly value: string | readonly string[];
  readonly summary: VNodeChild;
  readonly menuClassName?: string;
  readonly menuPart?: string;
  readonly closeOnSelect: boolean;
  readonly commit: (next: string | readonly string[]) => void;
  readonly onOpenChange?: (open: boolean) => void;
}

function direction(value: unknown): "rtl" | "ltr" {
  return value === "rtl" ? "rtl" : "ltr";
}

/**
 * A Headless UI Listbox. The value is controlled by the host; the menu's
 * visibility is scoped to this instance, so a table that goes inactive or a
 * select that becomes disabled drops an open menu rather than leaving it up.
 */
function optionNode(option: SelectOption) {
  return h(
    ListboxOption,
    {
      key: option.value,
      value: option.value,
      disabled: option.disabled,
      class: "at-headless-select-item",
    },
    {
      default: ({ selected }: { selected: boolean }) => [
        h("span", option.label),
        h(
          "span",
          { "aria-hidden": true, class: "at-headless-select-check" },
          selected ? "✓" : ""
        ),
      ],
    }
  );
}

const HeadlessListbox = defineComponent(
  (props: { readonly control: ListboxControl }) => {
    const active = useScopeActivity();
    const button = shallowRef<HTMLElement | null>(null);
    const panel = shallowRef<HTMLElement | null>(null);
    const open = shallowRef(false);
    const forceClose = () => closeList(panel.value, button.value);
    const dir = shallowRef<"ltr" | "rtl">("ltr");
    const inheritedDir = useHeadlessDirection();
    const captureButton = (instance: unknown) => {
      button.value = elementOf(instance);
    };
    const capturePanel = (instance: unknown) => {
      const element = elementOf(instance);
      if (element && element !== panel.value)
        void nextTick(() =>
          focusChoice(
            element,
            '[role="option"]:not([aria-disabled="true"])',
            '[aria-selected="true"]'
          )
        );
      panel.value = element;
    };
    usePlacement(
      () => panel.value,
      () => button.value,
      () => dir.value
    );
    const report = (value: boolean) => {
      if (open.value === value) return;
      open.value = value;
      props.control.onOpenChange?.(value);
    };
    watch(
      [active, () => props.control.attrs.disabled === true],
      ([live, disabled]) => {
        if ((!live || disabled) && open.value) {
          forceClose();
          report(false);
        }
      },
      { flush: "sync" }
    );
    return () => {
      const control = props.control;
      const {
        disabled,
        name,
        form,
        dir: attrDir,
        ...buttonAttrs
      } = control.attrs;
      dir.value = direction(attrDir ?? inheritedDir());
      const current = () =>
        active.value && props.control === control && disabled !== true;
      const options = () =>
        h(
          ListboxOptions,
          {
            class: ["at-headless-select-content", control.menuClassName],
            dir: dir.value,
            "data-adapttable-part": control.menuPart,
            ref: capturePanel,
          },
          {
            default: () => control.options.map(optionNode),
          }
        );
      return h(
        Listbox,
        {
          modelValue: control.value as string,
          multiple: control.multiple,
          disabled: disabled === true,
          name: typeof name === "string" ? name : undefined,
          form: typeof form === "string" ? form : undefined,
          "onUpdate:modelValue": (value: string | string[]) => {
            if (!current()) return;
            control.commit(value);
            if (control.multiple && control.closeOnSelect) forceClose();
          },
        },
        {
          default: ({ open: expanded }: { open: boolean }) => [
            h(OpenSignal, { open: expanded, onOpen: report }),
            headlessTarget(
              ListboxButton,
              mergeProps(buttonAttrs, {
                class: "at-headless-select",
                dir: attrDir ?? (control.multiple ? undefined : "ltr"),
              }),
              {
                default: () => [
                  h("span", {}, [control.summary]),
                  h("span", {
                    class: "at-headless-select-icon",
                    "aria-hidden": true,
                  }),
                ],
              },
              captureButton
            ),
            expanded ? headlessPortal(options) : null,
          ],
        }
      );
    };
  },
  {
    name: "HeadlessSelect",
    props: {
      control: { type: Object as PropType<ListboxControl> },
    },
    inheritAttrs: false,
  }
);

export function headlessSelect(control: HeadlessSelectControl) {
  const selected = control.options.find(
    (option) => option.value === control.value
  );
  return h(HeadlessListbox, {
    control: {
      attrs: control.attrs,
      options: control.options,
      multiple: false,
      value: control.value,
      summary: selected?.label ?? control.value,
      closeOnSelect: true,
      commit: (next) => control.onChange(String(next)),
      onOpenChange: control.onOpenChange,
    },
  });
}

/** A multiple-choice Listbox: each pick is one toggle request to the host. */
export function headlessMultiSelect(
  control: HeadlessMultiSelectControl & { readonly key?: string }
) {
  return h(HeadlessListbox, {
    key: control.key,
    control: {
      attrs: control.attrs,
      options: control.options,
      multiple: true,
      value: control.selected,
      summary: control.summary,
      menuClassName: control.menuClassName,
      menuPart: control.menuPart,
      closeOnSelect: control.closeOnSelect,
      commit: (next) => {
        const chosen = new Set(Array.isArray(next) ? next : [next]);
        for (const option of control.options) {
          const was = control.selected.includes(option.value);
          const now = chosen.has(option.value);
          if (was !== now) control.onToggle(option.value, now);
        }
      },
    },
  });
}
