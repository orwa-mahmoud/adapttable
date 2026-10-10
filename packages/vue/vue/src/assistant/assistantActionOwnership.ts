import { shallowRef, watch } from "vue";

import { useScopeActivity } from "../store";

/** Own view callbacks without taking ownership of the host's execution state. */
export function useAssistantActionOwnership() {
  const active = useScopeActivity();
  const generation = shallowRef(0);
  let executing = false;
  const retire = () => {
    generation.value += 1;
  };
  watch(
    active,
    (enabled) => {
      if (!enabled) retire();
    },
    { flush: "sync" }
  );
  const bind = (run: () => void, current: () => boolean = () => true) => {
    const owner = generation.value;
    return () => {
      if (
        !active.value ||
        generation.value !== owner ||
        executing ||
        !current()
      )
        return;
      // A validity reader can be reentrant too; do not admit work after it
      // synchronously removes or replaces this owner.
      if (!active.value || generation.value !== owner || executing) return;
      executing = true;
      try {
        run();
      } finally {
        executing = false;
      }
    };
  };
  return { active, retire, bind };
}
