import type { Attrs, ElementRef } from "@adapttable/vue";

/** Remove the vendor model/ref transport keys while preserving native attrs. */
export function withoutAttrs(attrs: Attrs, keys: readonly string[]): Attrs {
  return Object.fromEntries(
    Object.entries(attrs).filter(([key]) => !keys.includes(key))
  );
}

/** The headless binding uses function refs, never vendor component instances. */
export function controlRef<TElement extends Element>(
  ref: unknown
): ElementRef<TElement> | undefined {
  return typeof ref === "function" ? (ref as ElementRef<TElement>) : undefined;
}
