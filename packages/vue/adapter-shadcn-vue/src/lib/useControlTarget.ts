import { useElementRef } from "@adapttable/vue/adapter";
import { type ComponentPublicInstance, shallowRef, type VNodeRef } from "vue";

/** One setup-scoped owner follows the real target and changing callback props. */
export function useControlTarget(
  owner: () => ((element: Element | null) => void) | undefined
): VNodeRef {
  const current = shallowRef<Element | ComponentPublicInstance | null>(null);
  useElementRef(() => {
    const instance = current.value;
    const target: unknown =
      instance && "$el" in instance ? instance.$el : instance;
    return typeof Element !== "undefined" && target instanceof Element
      ? target
      : null;
  }, owner);
  return (instance: Element | ComponentPublicInstance | null): void => {
    current.value = instance;
  };
}
