import {
  type EditableCellEditorProps,
  editorInputType,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  computed,
  createVNode,
  defineComponent,
  h,
  nextTick,
  onMounted,
  type PropType,
  shallowRef,
  watch,
} from "vue";

import NuxtCheckbox from "../controls/NuxtCheckbox.vue";
import NuxtInput from "../controls/NuxtInput.vue";
import NuxtMultiSelect from "../controls/NuxtMultiSelect";
import NuxtSelect from "../controls/NuxtSelect.vue";

const editorRuntimeProps = {
  controller: {
    type: Object as PropType<
      (EditableCellEditorProps<unknown> & {
        className?: string;
      })["controller"]
    >,
  },
  label: {
    type: String as PropType<
      (EditableCellEditorProps<unknown> & { className?: string })["label"]
    >,
  },
  attrs: {
    type: Object as PropType<
      (EditableCellEditorProps<unknown> & { className?: string })["attrs"]
    >,
  },
  editorRef: {
    type: Function as PropType<
      (EditableCellEditorProps<unknown> & {
        className?: string;
      })["editorRef"]
    >,
  },
  onChange: {
    type: Function as PropType<
      (EditableCellEditorProps<unknown> & {
        className?: string;
      })["onChange"]
    >,
  },
  onBlur: {
    type: Function as PropType<
      (EditableCellEditorProps<unknown> & { className?: string })["onBlur"]
    >,
  },
  onKeyDown: {
    type: Function as PropType<
      (EditableCellEditorProps<unknown> & {
        className?: string;
      })["onKeyDown"]
    >,
  },
  className: {
    type: String as PropType<
      (EditableCellEditorProps<unknown> & {
        className?: string;
      })["className"]
    >,
  },
};

const NuxtCellEditorPresentation = defineComponent(
  (props: EditableCellEditorProps<unknown> & { className?: string }) => {
    const active = useScopeActivity();
    const mounted = shallowRef(false);
    onMounted(() => {
      mounted.value = true;
    });
    const present = computed(() => !mounted.value || active.value);
    const host = shallowRef<HTMLElement | null>(null);
    const popup = shallowRef(false);
    watch(
      active,
      (live) => {
        // Deactivation removes the vendor control without emitting update:open.
        // A newly mounted trigger must not inherit the retired popup's state.
        if (!live) popup.value = false;
      },
      { flush: "sync" }
    );
    function keydown(event: KeyboardEvent): void {
      if (!popup.value && !event.defaultPrevented) props.onKeyDown(event);
    }
    function focusout(event: FocusEvent): void {
      if (
        event.relatedTarget instanceof Node &&
        host.value?.contains(event.relatedTarget)
      )
        return;
      const commit = props.onBlur;
      // A Select closes by moving focus back to its trigger. Commit only after
      // focus has left the complete public control, using the captured owner.
      void nextTick(() => {
        if (
          active.value &&
          !popup.value &&
          host.value &&
          !host.value.contains(document.activeElement)
        )
          commit();
      });
    }
    function control() {
      const editor = props.controller.editor;
      const common = {
        label: props.label,
        onChange: props.onChange,
        focusRef: props.editorRef,
      };
      if (editor === "boolean")
        return h(NuxtCheckbox, {
          control: {
            attrs: props.attrs,
            label: props.label,
            checked: props.controller.draft === "true",
            onChange: (value) => props.onChange(String(value)),
            focusRef: props.editorRef,
          },
          className: props.className,
        });
      const attrs = {
        ...props.attrs,
        "onUpdate:open": (open: boolean) => {
          popup.value = open;
        },
      };
      if (
        editor &&
        typeof editor === "object" &&
        editor.type === "multi-select"
      )
        return h(NuxtMultiSelect, {
          ...common,
          attrs,
          draft: props.controller.draft,
          options: props.controller.selectOptions,
          className: props.className,
        });
      if (editor && typeof editor === "object")
        return h(NuxtSelect, {
          control: {
            ...common,
            attrs,
            value: props.controller.draft,
            options: props.controller.selectOptions,
          },
          className: props.className,
        });
      return h(NuxtInput, {
        control: {
          ...common,
          attrs: props.attrs,
          value: props.controller.draft,
          type: editorInputType(editor),
        },
        className: props.className,
      });
    }
    return () =>
      h(
        "div",
        {
          ref: host,
          class: "adapttable-nuxt-editor-host",
          onKeydownCapture: keydown,
          onFocusout: focusout,
        },
        present.value ? [control()] : []
      );
  },
  {
    name: "NuxtCellEditor",
    inheritAttrs: false,
    props: editorRuntimeProps,
  }
);

// Keep the row type at the functional boundary; the presentation validates
// values and owns the editor's reactive lifecycle.
function NuxtCellEditor<TRow>(
  props: EditableCellEditorProps<TRow> & { className?: string }
) {
  return createVNode(NuxtCellEditorPresentation, { ...props });
}
NuxtCellEditor.props = Object.keys(
  editorRuntimeProps
) as (keyof typeof editorRuntimeProps)[];
NuxtCellEditor.inheritAttrs = false;
export default NuxtCellEditor;
