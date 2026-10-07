import {
  type EditableCellEditorProps,
  editorInputType,
  formatMultiDraft,
  readMultiDraft,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  computed,
  defineComponent,
  h,
  nextTick,
  onMounted,
  shallowRef,
  watch,
} from "vue";

import ElementCheckbox from "../controls/ElementCheckbox.vue";
import ElementInput from "../controls/ElementInput.vue";
import ElementMultiSelect from "../controls/ElementMultiSelect.vue";
import ElementSelect from "../controls/ElementSelect.vue";
import { focusControlRef } from "../controls/focusRef";

/** The kit owns its nested popup; draft and commit transitions stay in Chrome. */
export default defineComponent(
  <TRow>(props: EditableCellEditorProps<TRow> & { className?: string }) => {
    const active = useScopeActivity();
    const mounted = shallowRef(false);
    const host = shallowRef<HTMLElement | null>(null);
    const field = shallowRef<HTMLInputElement | HTMLTextAreaElement | null>(
      null
    );
    const popup = shallowRef(false);
    onMounted(() => {
      mounted.value = true;
    });
    const present = computed(() => !mounted.value || active.value);
    watch(
      active,
      (live) => {
        if (!live) popup.value = false;
      },
      { flush: "sync" }
    );
    function validation(): void {
      const target = field.value;
      if (!target || !active.value || !target.isConnected) return;
      for (const name of ["aria-invalid", "aria-describedby"] as const) {
        const value = props.attrs[name];
        if (typeof value === "string" || typeof value === "boolean")
          target.setAttribute(name, String(value));
        else target.removeAttribute(name);
      }
    }
    watch([field, active, () => props.attrs], validation, { flush: "post" });
    function focusin(event: FocusEvent): void {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // The native focus event identifies Select's field without private refs.
        field.value = target;
        validation();
      }
    }
    function keydown(event: KeyboardEvent): void {
      if (
        active.value &&
        !popup.value &&
        !event.defaultPrevented &&
        !event.isComposing
      )
        props.onKeyDown(event);
    }
    function focusout(event: FocusEvent): void {
      if (
        event.relatedTarget instanceof Node &&
        host.value?.contains(event.relatedTarget)
      )
        return;
      const commit = props.onBlur;
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
      const owner = props.editorRef;
      const inputRef = (
        target: HTMLInputElement | HTMLTextAreaElement | null
      ): void => {
        field.value = target;
        owner(target);
      };
      const attrs = {
        ...props.attrs,
        class: props.className,
        "aria-label": props.label,
      };
      if (editor === "boolean")
        return h(ElementCheckbox, {
          ...attrs,
          label: props.label,
          checked: props.controller.draft === "true",
          inputRef,
          onChange: (checked) => props.onChange(String(checked)),
        });
      if (editor && typeof editor === "object") {
        const select = {
          ...attrs,
          ref: focusControlRef(props.editorRef),
          options: props.controller.selectOptions,
          onVisibleChange: (open: boolean) => {
            popup.value = open;
          },
        };
        if (editor.type === "multi-select")
          return h(ElementMultiSelect, {
            ...select,
            value: readMultiDraft(props.controller.draft),
            onChange: (values) => props.onChange(formatMultiDraft(values)),
          });
        return h(ElementSelect, {
          ...select,
          value: props.controller.draft,
          onChange: props.onChange,
        });
      }
      return h(ElementInput, {
        ...attrs,
        type: editorInputType(editor),
        value: props.controller.draft,
        inputRef,
        onChange: props.onChange,
      });
    }
    return () =>
      h(
        "div",
        {
          ref: host,
          class: "adapttable-element-plus-editor-host",
          onKeydownCapture: keydown,
          onFocusinCapture: focusin,
          onFocusout: focusout,
        },
        present.value ? [control()] : []
      );
  },
  {
    name: "ElementCellEditor",
    inheritAttrs: false,
    props: [
      "controller",
      "label",
      "attrs",
      "editorRef",
      "onChange",
      "onBlur",
      "onKeyDown",
      "className",
    ],
  }
);
