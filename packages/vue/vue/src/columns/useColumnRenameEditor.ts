/** Lifecycle-aware Vue projection of the neutral rename controller. */
import {
  type ColumnRenameEditorOptions,
  createColumnRenameEditor,
} from "@adapttable/core";
import {
  computed,
  getCurrentInstance,
  type MaybeRefOrGetter,
  nextTick,
  onScopeDispose,
  toValue,
  useId,
  watch,
  watchEffect,
} from "vue";

import { elementRef } from "../attrs";
import { useExternalStore, useScopeActivity } from "../store";

let nextEditor = 0;
export function useColumnRenameEditor(
  options: MaybeRefOrGetter<ColumnRenameEditorOptions>
) {
  const active = useScopeActivity();
  const editor = createColumnRenameEditor(toValue(options));
  const snapshot = useExternalStore(editor);
  const editorId = getCurrentInstance()
    ? useId()
    : "scope-" + String(++nextEditor);
  const inputId = `adapttable-rename-${editorId}`;
  let returnFocus: HTMLElement | null = null;
  let input: HTMLElement | null = null;
  let generation = 0;
  const restore = (): void => {
    const ticket = ++generation;
    void nextTick(() => {
      if (ticket === generation && active.value && returnFocus?.isConnected)
        returnFocus.focus();
    });
  };
  watchEffect(() => editor.configure(toValue(options)), { flush: "sync" });
  watch(
    () => toValue(options).key,
    () => {
      generation += 1;
      editor.cancel();
    }
  );
  watch(
    active,
    (live) => {
      if (!live) {
        generation += 1;
        editor.cancel();
      }
    },
    { flush: "sync" }
  );
  onScopeDispose(() => {
    generation += 1;
    input = null;
    returnFocus = null;
  });
  const cancel = (): void => {
    if (!active.value) return;
    editor.cancel();
    restore();
  };
  const submit = (): boolean => {
    if (!active.value) return false;
    const outcome = editor.submit();
    if (outcome !== "invalid") restore();
    return outcome === "renamed";
  };
  return {
    snapshot,
    editing: computed(() => snapshot.value.editing),
    inputId,
    errorId: `${inputId}-error`,
    begin: (): void => {
      if (!active.value) return;
      generation += 1;
      const candidate =
        typeof document === "undefined" ? null : document.activeElement;
      returnFocus =
        typeof HTMLElement !== "undefined" && candidate instanceof HTMLElement
          ? candidate
          : null;
      editor.begin();
      const ticket = generation;
      void nextTick(() => {
        if (ticket === generation && active.value) input?.focus();
      });
    },
    submit,
    cancel,
    setDraft: (value: string): void => {
      if (active.value) editor.setDraft(value);
    },
    inputAttrs: () => ({
      id: inputId,
      "aria-invalid": snapshot.value.error ? true : undefined,
      "aria-describedby": snapshot.value.error ? `${inputId}-error` : undefined,
      onBlur: (): void => {
        if (active.value) editor.blur();
      },
      onKeydown: (event: KeyboardEvent): void => {
        if (event.isComposing) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancel();
        }
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          submit();
        }
      },
      ref: elementRef<HTMLElement>((element) => {
        input = element;
      }),
    }),
  };
}
export type ColumnRenameEditorState = ReturnType<typeof useColumnRenameEditor>;
