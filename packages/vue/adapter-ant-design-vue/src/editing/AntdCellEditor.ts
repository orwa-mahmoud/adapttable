import {
  type EditableCellEditorProps,
  editorInputType,
  formatMultiDraft,
  readMultiDraft,
  scheduleTick,
  useScopeActivity,
  withProps,
} from "@adapttable/vue/adapter";
import {
  computed,
  createVNode,
  defineComponent,
  h,
  onMounted,
  type PropType,
  shallowRef,
  watch,
} from "vue";

import AntdCheckbox from "../controls/AntdCheckbox.vue";
import AntdInput from "../controls/AntdInput.vue";
import AntdMultiSelect from "../controls/AntdMultiSelect.vue";
import AntdSelect from "../controls/AntdSelect.vue";
import { focusControlRef } from "../controls/focusRef";

/** The kit owns its nested popup; draft and commit transitions stay in Chrome. */
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

const AntdCellEditorPresentation = defineComponent(
  (props: EditableCellEditorProps<unknown> & { className?: string }) => {
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
      scheduleTick(() => {
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
        return h(AntdCheckbox, {
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
          return h(AntdMultiSelect, {
            ...select,
            value: readMultiDraft(props.controller.draft),
            onChange: (values) => props.onChange(formatMultiDraft(values)),
          });
        return h(AntdSelect, {
          ...select,
          value: props.controller.draft,
          onChange: props.onChange,
        });
      }
      return h(AntdInput, {
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
          class: "adapttable-ant-design-vue-editor-host",
          onKeydownCapture: keydown,
          onFocusinCapture: focusin,
          onFocusout: focusout,
        },
        present.value ? [control()] : []
      );
  },
  {
    name: "AntdCellEditor",
    inheritAttrs: false,
    props: editorRuntimeProps,
  }
);

// Keep the row type at the functional boundary; the presentation validates
// values and owns the editor's reactive lifecycle.
const AntdCellEditor = /* @__PURE__ */ withProps(
  function AntdCellEditor<TRow>(
    props: EditableCellEditorProps<TRow> & { className?: string }
  ) {
    return createVNode(AntdCellEditorPresentation, { ...props });
  },
  Object.keys(editorRuntimeProps) as (keyof typeof editorRuntimeProps)[],
  { inheritAttrs: false }
);
export default AntdCellEditor;
