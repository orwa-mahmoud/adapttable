import { type Component, defineComponent, h, type PropType } from "vue";

/**
 * Headless UI for Vue ships no stand-alone button, text field, label or
 * checkbox. Where a slot needs one of those, the kit renders the native
 * element through this single component, so every such control keeps one
 * public element (`$el`) for refs and one place that names the tag.
 */
export const HeadlessPrimitive: Component = defineComponent({
  name: "HeadlessPrimitive",
  inheritAttrs: false,
  props: {
    as: { type: String as PropType<string>, default: "div" },
  },
  setup(props, { attrs, slots }) {
    return () => h(props.as, attrs, slots.default?.());
  },
});

/** A native label, for the same reason as {@link HeadlessPrimitive}. */
export const HeadlessLabel: Component = defineComponent({
  name: "HeadlessLabel",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h("label", attrs, slots.default?.());
  },
});
