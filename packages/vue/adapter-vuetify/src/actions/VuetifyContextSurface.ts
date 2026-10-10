import {
  type ContextMenuSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  defineComponent,
  h,
  onMounted,
  type PropType,
  shallowRef,
  watch,
} from "vue";
import { VList } from "vuetify/components/VList";
import { VMenu } from "vuetify/components/VMenu";

/** VList owns menu keyboard navigation; the binding retires stale selections. */
export const VuetifyContextSurface = defineComponent(
  (props: {
    readonly control: ContextMenuSurfaceProps;
    readonly dir: "ltr" | "rtl";
  }) => {
    const active = useScopeActivity();
    const target = shallowRef<HTMLElement | null>(null);
    const list = shallowRef<InstanceType<typeof VList> | null>(null);
    const read = () => {
      target.value = props.control.anchorRef.current;
    };
    onMounted(read);
    watch(() => props.control.at, read, { flush: "post" });
    return () => {
      const control = props.control;
      return active.value && target.value
        ? h(
            VMenu,
            {
              modelValue: true,
              target: target.value,
              attach: control.container ?? false,
              openOnClick: false,
              openOnArrow: false,
              closeOnContentClick: false,
              transition: false,
              location: "top left",
              origin: "top left",
              offset: 0,
              maxHeight: "min(70dvh, 640px)",
              maxWidth: "min(28rem, 90vw)",
              "onUpdate:modelValue": (open: boolean) => {
                if (!open && active.value && props.control === control)
                  control.onClose();
              },
              onAfterEnter: () => {
                if (active.value && props.control === control)
                  list.value?.focus("first");
              },
            },
            () =>
              h(
                VList,
                {
                  ref: list,
                  dir: props.dir,
                  role: "menu",
                  "aria-label": control.label,
                  class: control.className,
                  "data-adapttable-part": "context-menu",
                },
                () => control.children
              )
          )
        : null;
    };
  },
  {
    name: "VuetifyContextSurface",
    props: {
      control: { type: Object as PropType<ContextMenuSurfaceProps> },
      dir: { type: String as PropType<"ltr" | "rtl"> },
    },
  }
);
