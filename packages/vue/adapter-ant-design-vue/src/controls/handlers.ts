/**
 * The event handlers behind a fall-through listener attribute, which Vue
 * hands over as one function or as an array of them.
 */
export function eventHandlers<TEvent>(
  value: unknown
): ((event: TEvent) => void)[] {
  const list: unknown[] = Array.isArray(value) ? (value as unknown[]) : [value];
  return list.filter(
    (handler): handler is (event: TEvent) => void =>
      typeof handler === "function"
  );
}
