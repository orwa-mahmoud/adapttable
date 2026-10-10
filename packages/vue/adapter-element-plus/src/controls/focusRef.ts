import type { VNodeProps } from "vue";

interface FocusTarget {
  focus(): void;
}
function isFocusTarget(value: unknown): value is FocusTarget {
  return (
    value !== null &&
    typeof value === "object" &&
    "focus" in value &&
    typeof value.focus === "function"
  );
}
/** Keep the supported exposed focus handle, including its stable identity. */
export function focusControlRef(
  set: (target: FocusTarget | null) => void
): VNodeProps["ref"] {
  return (value) => {
    if (value === null) {
      set(null);
      return;
    }
    if (!isFocusTarget(value))
      throw new Error(
        "AdaptTable: Element Plus control must expose its supported focus method."
      );
    set(value);
  };
}
