import { createContext, type ReactNode, useContext } from "react";

import type { FeatureHostState } from "./currentHost";

/**
 * The host of the table whose tree this is. Hooks under
 * {@link FeatureHostProvider} read it; they never ask a module stack.
 */
export const FeatureHostContext = createContext<FeatureHostState | undefined>(
  undefined
);

/** Provide the host this table owns to every hook under it. */
export function FeatureHostProvider({
  host,
  children,
}: Readonly<{
  host: FeatureHostState | undefined;
  children: ReactNode;
}>) {
  return (
    <FeatureHostContext.Provider value={host}>
      {children}
    </FeatureHostContext.Provider>
  );
}

/** The host of the nearest table, or nothing outside one. */
export function useFeatureHost<TRow = unknown>():
  | FeatureHostState<TRow>
  | undefined {
  return useContext(FeatureHostContext) as FeatureHostState<TRow> | undefined;
}
