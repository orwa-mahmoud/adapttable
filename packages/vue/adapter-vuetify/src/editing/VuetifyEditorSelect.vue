<script setup lang="ts">
import { formatMultiDraft, readMultiDraft } from "@adapttable/vue/adapter";
import { computed, shallowRef, watch } from "vue";
import { VSelect } from "vuetify/components/VSelect";

import { useControlRef, valueControlAttrs } from "../controls/controlRef";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly value: string;
  readonly multiple?: boolean;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly onKeyDown: (event: KeyboardEvent) => void;
}>();
const select = shallowRef<InstanceType<typeof VSelect> | null>(null);
const value = computed(() =>
  props.multiple ? readMultiDraft(props.value) : props.value
);
const invalid = computed(
  () =>
    props.attrs["aria-invalid"] === true ||
    props.attrs["aria-invalid"] === "true"
);
let menuEscape: KeyboardEvent | undefined;
useControlRef(
  () => select.value?.controlRef,
  () => props.attrs
);
// VSelect's public focus state includes its portaled list, unlike input blur.
watch(
  () => select.value?.isFocused,
  (focused, previous) => {
    if (previous === true && focused === false) props.onBlur();
  },
  { flush: "post" }
);
const attrs = computed(() => ({
  ...valueControlAttrs(props.attrs),
  onKeydownCapture: (event: KeyboardEvent) => {
    menuEscape =
      event.key === "Escape" && select.value?.menu ? event : undefined;
  },
  onKeydown: (event: KeyboardEvent) => {
    if (!event.defaultPrevented && event !== menuEscape) props.onKeyDown(event);
  },
}));
function change(value: unknown): void {
  if (props.multiple) {
    const values: readonly unknown[] = Array.isArray(value) ? value : [];
    props.onChange(
      formatMultiDraft(
        values.filter((item): item is string => typeof item === "string")
      )
    );
  } else props.onChange(typeof value === "string" ? value : "");
}
</script>

<template>
  <VSelect
    ref="select"
    v-bind="attrs"
    :model-value="value"
    :multiple="multiple"
    :chips="multiple"
    :items="options"
    item-title="label"
    item-value="value"
    :error="invalid"
    density="compact"
    variant="outlined"
    hide-details
    class="adapttable-vuetify-field adapttable-vuetify-editor-select"
    @update:model-value="change"
  />
</template>
