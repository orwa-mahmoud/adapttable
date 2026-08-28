/**
 * The failure state, and what a host needs to replace it.
 *
 * Skeleton and empty are already slots a host can swap out, and they can be
 * plain nodes because there is nothing to say about them: a skeleton is a
 * skeleton. An error is different — it is *about* something, and the built-in
 * one carries a working retry. Handing back a node the host wrote in advance
 * would drop both, which is the same trap the `noResults` slot documents.
 *
 * So a slot here takes a node OR a function. Pass a node when the message is
 * fixed; pass a function when the replacement needs the error it is reporting
 * or the retry it should offer.
 */
import type { ReactNode } from "react";

import type { TableSource } from "../source/TableSource";

/**
 * What the error chrome is describing, and what it can do about it.
 *
 * @public
 */
export interface TableErrorState {
  /** The failure to surface. */
  error: Error;
  /**
   * Ask the source to try again, or `undefined` when it cannot — a static
   * `data` array has nothing to re-fetch, so no retry is offered rather than
   * one that does nothing.
   */
  retry?: () => void;
  /** Whether a retry is already in flight. */
  retrying: boolean;
}

/**
 * A replaceable piece of chrome: a node, or a function that builds one from
 * what the built-in was showing.
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
  return typeof slot === "function" ? slot(state) : slot;
}

/**
 * The error state a source is in, or `undefined` when it is fine.
 *
 * Every adapter derives this the same way, so it is derived once here — the
 * retry in particular, which is only offered when the source can actually
 * perform one.
 *
 * @param source - The table's source.
 * @returns The state, or `undefined` when there is no failure to report.
 *
 * @public
 */
export function tableErrorState<TRow>(
  source: TableSource<TRow>
): TableErrorState | undefined {
  if (!source.error) return undefined;
  const refetch = source.refetch;
  return {
    error: source.error,
    retry: refetch ? () => void refetch() : undefined,
    retrying: source.isFetching,
  };
}
