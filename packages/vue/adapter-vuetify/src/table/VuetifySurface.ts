import type { Attrs, ElementRef } from "@adapttable/vue";
import { useElementRef } from "@adapttable/vue/adapter";
import {
  type Component,
  type ComponentPublicInstance,
  defineComponent,
  h,
  shallowRef,
} from "vue";

import { controlAttrs } from "../controls/controlRef";

/** A stable owner for the native root exposed by a Vuetify surface. */
export const VuetifySurface = defineComponent(
  (
    props: { readonly component: Component; readonly attrs: Attrs },
    { slots }
  ) => {
    const instance = shallowRef<ComponentPublicInstance | null>(null);
    useElementRef(
      () => {
        const root: unknown = instance.value?.$el;
        if (!root) return null;
        return root instanceof HTMLElement ? root : null;
      },
      () =>
        typeof props.attrs.ref === "function"
          ? (props.attrs.ref as ElementRef)
          : null
    );
    return () =>
      h(
        props.component,
        { ...controlAttrs(props.attrs), ref: instance },
        slots
      );
  },
  { props: ["component", "attrs"], inheritAttrs: false }
);
