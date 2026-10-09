import type { TableAssistantComposerProps } from "@adapttable/vue/adapter";
import { defineComponent, h, nextTick, onScopeDispose, shallowRef } from "vue";
import { VField } from "vuetify/components/VField";

/**
 * The assistant composer: a native textarea inside Vuetify's VField, the
 * field VTextarea itself is built on. The textarea carries the part, the
 * accessible name and the Chrome's key handling, and the host owns the draft:
 * a change it rejects repaints from the host's value.
 */
export const VuetifyAssistantComposer = defineComponent(
  (props: TableAssistantComposerProps) => {
    const textarea = shallowRef<HTMLTextAreaElement | null>(null);
    let live = true;
    onScopeDispose(() => {
      live = false;
    });
    const input = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement)) return;
      props.onChange(target.value);
      void nextTick(() => {
        const element = textarea.value;
        if (live && element && element.value !== props.value)
          element.value = props.value;
      });
    };
    return () =>
      h(
        VField,
        {
          variant: "outlined",
          density: "compact",
          active: true,
          disabled: props.disabled,
          class: ["adapttable-vuetify-assistant-input", props.className],
        },
        {
          default: ({
            props: field,
            focus,
            blur,
          }: {
            props: Record<string, unknown>;
            focus: () => void;
            blur: () => void;
          }) =>
            h("textarea", {
              ...field,
              ref: textarea,
              value: props.value,
              rows: 2,
              placeholder: props.placeholder,
              disabled: props.disabled,
              "data-adapttable-part": props.part,
              "aria-label": props.label,
              onInput: input,
              onKeydown: props.onKeyDown,
              onFocus: focus,
              onBlur: blur,
            }),
        }
      );
  },
  {
    name: "VuetifyAssistantComposer",
    props: [
      "value",
      "label",
      "placeholder",
      "part",
      "className",
      "disabled",
      "onChange",
      "onKeyDown",
    ],
  }
);
