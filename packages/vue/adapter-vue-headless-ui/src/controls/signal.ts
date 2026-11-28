import { defineComponent, type PropType, watch } from "vue";

/** Reports a Headless UI component's own open state to the host that follows it. */
export const OpenSignal = defineComponent({
  name: "HeadlessOpenSignal",
  props: {
    open: { type: Boolean },
    onOpen: { type: Function as PropType<(open: boolean) => void> },
  },
  setup(props) {
    watch(
      () => props.open,
      (open) => props.onOpen?.(open),
      { flush: "sync" }
    );
    return () => null;
  },
});
