import type { Attrs } from "@adapttable/vue";

/** Remove only attributes consumed by a component's controlled-value API. */
export function withoutAttributes(
  attrs: Attrs,
  names: readonly string[]
): Attrs {
  return Object.fromEntries(
    Object.entries(attrs).filter(([name]) => !names.includes(name))
  );
}

/** Vue may merge DOM listeners into arrays; preserve their order and event identity. */
export function eventHandler<TEvent extends Event>(
  value: unknown
): ((event: TEvent) => void) | undefined {
  if (typeof value === "function") return value as (event: TEvent) => void;
  if (!Array.isArray(value)) return undefined;
  const listeners = value.map((entry: unknown) => eventHandler<TEvent>(entry));
  return (event) => {
    for (const listener of listeners) listener?.(event);
  };
}
