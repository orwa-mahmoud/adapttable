<script setup lang="ts" generic="TRow">
import {
  FilterHeaderControlChrome,
  type FilterHeaderControlOptions,
  type FilterHeaderSlots,
  FULLSCREEN_MODEL,
  useFeatureState,
  useFilterHeaderControl,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { Popover, Space } from "ant-design-vue";
import { computed, h, shallowRef, watch } from "vue";

import AntdCheckbox from "../controls/AntdCheckbox.vue";
import AntdInput from "../controls/AntdInput.vue";
import AntdSelect from "../controls/AntdSelect.vue";
import { antdButton } from "../controls/button";
import { popupContainer } from "../controls/popupContainer";
import { presentPopoverContent } from "../overlays/AnchoredPopover";

defineOptions({ name: "AntdFilterHeaderControl" });
const { closeOnSelect = undefined, ...props } =
  defineProps<FilterHeaderControlOptions<TRow>>();
const model = useFilterHeaderControl(() => ({ ...props, closeOnSelect }));
const active = useScopeActivity();
const fullscreen = useFeatureState(FULLSCREEN_MODEL);
const open = shallowRef(false);
// A different definition is a different control, so its popup starts closed.
watch(
  () => `${props.def.key}:${props.def.type}`,
  () => {
    open.value = false;
  }
);
const trigger = shallowRef<HTMLElement | null>(null);
const inheritedDirection = shallowRef<"ltr" | "rtl">();
const popupDirection = computed(() => props.dir ?? inheritedDirection.value);
const setTrigger = (element: HTMLElement | null) => {
  trigger.value = element;
};
const readInheritedDirection = () => {
  if (props.dir !== undefined || !trigger.value) return;
  const target = trigger.value;
  const direction =
    target.ownerDocument.defaultView?.getComputedStyle(target).direction;
  inheritedDirection.value =
    direction === "rtl" || direction === "ltr" ? direction : undefined;
};
const dismiss = (event: KeyboardEvent) => {
  if (
    event.key !== "Escape" ||
    event.defaultPrevented ||
    event.isComposing ||
    trigger.value?.getAttribute("aria-expanded") !== "true"
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  open.value = false;
  if (active.value && trigger.value?.isConnected) trigger.value.focus();
};
const renderChoices = (control: Parameters<FilterHeaderSlots["Multi"]>[0]) =>
  control.options.map((option) =>
    h(AntdCheckbox, {
      key: option.value,
      label: option.label,
      labelVisible: true,
      checked: control.selected.includes(option.value),
      onChange: (checked) => control.onToggle(option.value, checked),
    })
  );
const controls: FilterHeaderSlots = {
  Search: (control) =>
    h(AntdInput, {
      type: "search",
      dir: props.dir,
      value: control.value,
      "data-adapttable-part": "filter-header-input",
      "aria-label": control.label,
      placeholder: control.placeholder,
      class: control.className,
      onChange: control.onChange,
    }),
  Select: (control) =>
    h(AntdSelect, {
      value: control.value,
      dir: props.dir,
      options: control.options,
      "data-adapttable-part": "filter-header-input",
      "aria-label": control.label,
      class: control.className,
      onChange: control.onChange,
    }),
  Range: (control) =>
    h(AntdInput, {
      value: control.value,
      type: control.type,
      dir: props.dir,
      "aria-label": control.label,
      onChange: control.onChange,
    }),
  Multi: (control) =>
    h(
      Popover,
      {
        key: `${props.def.key}:${props.def.type}`,
        open: open.value,
        trigger: ["click"],
        arrow: false,
        destroyTooltipOnHide: true,
        getPopupContainer: popupContainer(
          true,
          fullscreen.value?.container ?? undefined
        ),
        placement:
          popupDirection.value === "rtl" ? "bottomRight" : "bottomLeft",
        overlayStyle: { direction: popupDirection.value },
        onOpenChange: (value: boolean) => {
          open.value = value;
        },
        afterVisibleChange: (visible: boolean) => {
          if (visible) readInheritedDirection();
        },
      },
      {
        default: () =>
          antdButton(
            {
              ref: setTrigger,
              dir: props.dir,
              "data-adapttable-part": "filter-header-input",
              class: control.className,
              "aria-label": control.label,
              "aria-haspopup": "dialog",
              "aria-expanded": open.value,
              onKeydown: dismiss,
            },
            control.summary
          ),
        content: () =>
          h(
            Space,
            {
              direction: "vertical",
              align: "start",
              role: "dialog",
              ref: (instance: unknown) => {
                const host =
                  instance && typeof instance === "object" && "$el" in instance
                    ? instance.$el
                    : null;
                if (!(host instanceof Element)) return;
                presentPopoverContent(host);
                readInheritedDirection();
              },
              dir: popupDirection.value,
              "data-adapttable-part": "filter-header-menu",
              class: control.menuClassName,
              "aria-label": control.label,
              onKeydown: dismiss,
              style: { maxBlockSize: "14rem", overflow: "auto" },
            },
            {
              default: () => renderChoices(control),
            }
          ),
      }
    ),
};
const Render = () =>
  FilterHeaderControlChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
