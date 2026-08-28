import { useEffect, useState } from "react";

/**
 * Debounce a rapidly-changing value. The returned value only updates
 * after `delay` ms have elapsed without a new change.
 *
 * @typeParam T - The value type.
 * @param value - The source value.
 * @param delay - Debounce delay in milliseconds. Defaults to 300.
 * @returns The debounced value.
 *
 * @public
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
