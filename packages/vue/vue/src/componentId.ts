import { getCurrentInstance, useId } from "vue";

/**
 * A stable id inside component setup. Outside a component the caller supplies
 * the id, and `useId` still runs so every setup takes the same hook path.
 */
export function useInstanceId(fallback: () => string): string {
  // The oldest supported Vue types `useId` as possibly undefined.
  const supportedUseId: () => string | undefined = useId;
  const generated = supportedUseId();
  return getCurrentInstance() && generated !== undefined
    ? generated
    : fallback();
}
