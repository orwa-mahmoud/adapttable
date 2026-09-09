/**
 * Which aggregate operations the rows ON SCREEN were computed with.
 *
 * A column formatting a subtotal is told what produced it, so the answer has
 * to belong to the response being drawn rather than to whatever the table is
 * asking for now. The two come apart constantly: a reader switches sum to
 * average and the old numbers stay up while the request travels; the request
 * fails and the old numbers stay up for good; a cancelled request never
 * answers at all. In every one of those the retained rows keep the operations
 * they were computed with.
 *
 * Neither a loading flag nor a data reference is enough on its own. A failed
 * fetch clears `loading` without answering, a host may flip `loading` a tick
 * late, and a response can arrive as the very array that was already on
 * screen. So each set of operations is remembered against the request that
 * carried it, and only a response that can be tied back to one of those
 * requests moves what is published.
 */
import type { GroupAggregateOps } from "@adapttable/core";
import { useEffect, useRef, useState } from "react";

/** How many requests' operations to remember. */
const REMEMBERED = 8;

/**
 * What the caller knows about the request in flight and the response drawn.
 *
 * @internal
 */
export interface AggregateOpsForResponse {
  /** Identifies the request the table is making now. */
  readonly requestKey: string;
  /** The operations that request carries. */
  readonly requested: GroupAggregateOps | undefined;
  /**
   * The request the displayed data answers, when it can be known exactly: a
   * fetching tier reads it from the query, a controlled one is told by the
   * host. Given this, nothing else is consulted.
   */
  readonly responseKey?: string;
  /**
   * A monotonic marker of the last SUCCESSFUL response, when the tier has
   * one (`dataUpdatedAt`). It does not move for a failure or a cancellation,
   * which is exactly what retained rows need.
   */
  readonly respondedAt?: number;
  /** Whether anything is displayed at all. */
  readonly hasData: boolean;
  /** Whether a request is in flight. */
  readonly fetching: boolean;
  /** The failure from the last request, if it failed. */
  readonly failed: boolean;
}

/**
 * The operations behind the displayed response.
 *
 * @param input - See {@link AggregateOpsForResponse}.
 * @returns The operations, or `undefined` when nothing is known.
 *
 * @internal
 */
export function useAggregateOpsForResponse(
  input: AggregateOpsForResponse
): GroupAggregateOps | undefined {
  const {
    requestKey,
    requested,
    responseKey,
    respondedAt,
    hasData,
    fetching,
    failed,
  } = input;
  const [displayed, setDisplayed] = useState(requested);
  const byRequest = useRef(new Map<string, GroupAggregateOps | undefined>());
  const answered = useRef<number | undefined>(undefined);
  const awaiting = useRef<{ key: string; started: boolean } | null>(null);

  // Remember this request's operations before anything can answer it.
  const remembered = byRequest.current;
  if (!remembered.has(requestKey)) {
    remembered.set(requestKey, requested);
    if (remembered.size > REMEMBERED) {
      const oldest = remembered.keys().next();
      if (!oldest.done) remembered.delete(oldest.value);
    }
  }

  useEffect(() => {
    const known = byRequest.current;
    // Nothing on screen yet: there is no earlier answer to mislabel, so the
    // request in flight is the best description available.
    if (!hasData) {
      setDisplayed((current) =>
        same(current, requested) ? current : requested
      );
      awaiting.current = null;
      return;
    }
    // Told outright which request the data answers.
    if (responseKey !== undefined) {
      if (!known.has(responseKey)) return;
      const ops = known.get(responseKey);
      setDisplayed((current) => (same(current, ops) ? current : ops));
      awaiting.current = null;
      return;
    }
    // A successful-response marker: it advances only when data actually
    // arrived, so a failure or a cancellation leaves the rows described as
    // they were.
    if (respondedAt !== undefined) {
      if (respondedAt === 0 || respondedAt === answered.current) return;
      answered.current = respondedAt;
      setDisplayed((current) =>
        same(current, requested) ? current : requested
      );
      return;
    }
    // Nothing but the request/response cycle the host reports. A promotion
    // needs a request that was seen to start and then to finish without
    // failing — a `loading` flag that never rose, or one that fell because
    // the request failed, is not an answer.
    const pending = awaiting.current;
    if (pending?.key !== requestKey) {
      awaiting.current = { key: requestKey, started: fetching };
      return;
    }
    if (fetching) {
      pending.started = true;
      return;
    }
    if (!pending.started || failed) return;
    awaiting.current = null;
    setDisplayed((current) => (same(current, requested) ? current : requested));
  }, [
    requestKey,
    requested,
    responseKey,
    respondedAt,
    hasData,
    fetching,
    failed,
  ]);

  return displayed;
}

/** Whether two operation maps say the same thing. */
function same(
  left: GroupAggregateOps | undefined,
  right: GroupAggregateOps | undefined
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => left[key] === right[key]);
}
