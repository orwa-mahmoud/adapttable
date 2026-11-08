import { onScopeDispose, shallowRef, watch } from "vue";

import { scheduleTick } from "../scheduleTick";

/** Repaint rejected controlled requests through the kit's public modelValue. */
export function useQuasarPresentation(
  value: () => string,
  onChange: (value: string) => void
) {
  const presentation = shallowRef(value());
  let revision = 0;
  watch(value, (next) => {
    presentation.value = next;
  });
  onScopeDispose(() => {
    revision++;
  });
  function update(next: unknown): void {
    const current = ++revision;
    presentation.value =
      typeof next === "string" || typeof next === "number" ? String(next) : "";
    try {
      onChange(presentation.value);
    } finally {
      scheduleTick(() => {
        if (current === revision) presentation.value = value();
      });
    }
  }
  return { presentation, update };
}
