import { getCurrentInstance, useId } from "vue";

/**
 * A stable id inside component setup. Outside a component the caller supplies
 * the id, and `useId` still runs so every setup takes the same hook path.
 */
export function useInstanceId(fallback: () => string): string {
  const generated = useId();
  return getCurrentInstance() ? generated : fallback();
}
