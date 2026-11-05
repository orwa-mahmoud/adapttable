/**
 * Feature state travels by context, so a table reads only what was published
 * above it. The context lives on its own so a source can read one key without
 * pulling the provider tree.
 */
import type { FeatureStateKey } from "@adapttable/core/binding";
import { createContext, type ReactNode, useContext, useMemo } from "react";

const FeatureStateContext = createContext<ReadonlyMap<string, unknown>>(
  new Map()
);

/**
 * Publish one feature's state to the table below it.
 *
 * A provider renders this around its children. The map is copied rather than
 * mutated so a reader re-renders when the value it asked for changes, and only
 * then.
 *
 * @public
 */
export function FeatureStateScope<T>({
  stateKey,
  value,
  children,
}: {
  readonly stateKey: FeatureStateKey<T>;
  readonly value: T;
  readonly children: ReactNode;
}): ReactNode {
  const parent = useContext(FeatureStateContext);
  const next = useMemo(() => {
    const map = new Map(parent);
    map.set(stateKey.id, value);
    return map;
  }, [parent, stateKey.id, value]);
  return (
    <FeatureStateContext.Provider value={next}>
      {children}
    </FeatureStateContext.Provider>
  );
}

/**
 * Read what a feature published, or `undefined` when it is not composed.
 *
 * `undefined` is the ordinary answer, not an error: a table without the
 * feature is a table that does not have it, and the caller renders nothing.
 *
 * @public
 */
export function useFeatureState<T>(
  stateKey: FeatureStateKey<T>
): T | undefined {
  return useContext(FeatureStateContext).get(stateKey.id) as T | undefined;
}
