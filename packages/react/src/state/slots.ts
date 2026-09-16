/**
 * The React face of the neutral slot helpers.
 */
import type { ReactNode } from "react";

/**
 * A replaceable piece of chrome: a node, or a function that builds one from
 * what the built-in was showing.
 *
 * `@adapttable/core` exports the same shape typed as `DisplayValue`, for
 * headless and non-React hosts.
 *
 * @typeParam TState - What the built-in had to work with.
 *
 * @public
 */
export type Slot<TState> = ReactNode | ((state: TState) => ReactNode);

/**
 * Resolve a slot the host may have replaced.
 *
 * @param slot - The host's replacement, if any.
 * @param state - What the built-in chrome was showing.
 * @returns The host's node, or `undefined` when they left the built-in alone.
 *
 * @public
 */
export function fillSlot<TState>(
  slot: Slot<TState> | undefined,
  state: TState
): ReactNode {
  // Resolved here rather than through the neutral helper: that one answers
  // with a `DisplayValue`, and a React host needs React content back.
  return typeof slot === "function" ? slot(state) : slot;
}
