/**
 * Which aggregate operations the rows ON SCREEN were computed with.
 *
 * A column formatting a subtotal is told what produced it, so the answer has
 * to belong to the response being drawn rather than to whatever the table is
 * asking for now. The two come apart constantly: a reader switches sum to
 * average and the old numbers stay up while the request travels; the request
 * fails and the old numbers stay up for good; a cancelled request never
 * answers at all.
 *
 * Only provenance moves what is published. Each request's operations are
 * remembered against its own key, and a response is tied back to one of those
 * requests either because the tier is told its key or because the query
 * carries a response marker for that exact request. A `loading` flag ending
 * is not provenance — a cancellation ends it without answering — so a
 * concluded request the table cannot trace publishes nothing rather than the
 * operations of a request that may never have run. Unknown is a valid answer;
 * another response's operation is not.
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
   * host. Given this, nothing else is consulted — and a key that names no
   * remembered request publishes nothing, since a response whose operations
   * are gone is not described by another response's.
   */
  readonly responseKey?: string;
  /**
   * The query's own marker for the response it holds — TanStack's
   * `dataUpdatedAt`. Read together with `requestKey`, never on its own: two
   * cached results can carry the same timestamp, so a marker means "this
   * request has an answer of its own", and `0` means it has none.
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
  // Which request the displayed operations belong to, and the response marker
  // that established them.
  const shown = useRef<{ key: string; at: number } | null>(null);
  const concluding = useRef<{ key: string; started: boolean } | null>(null);

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
    const settled = resolveOps(
      {
        requestKey,
        requested,
        responseKey,
        respondedAt,
        hasData,
        fetching,
        failed,
      },
      byRequest.current,
      shown.current,
      concluding
    );
    if (!settled) return;
    shown.current = { key: settled.key, at: settled.at };
    concluding.current = null;
    setDisplayed((current) =>
      same(current, settled.ops) ? current : settled.ops
    );
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

/** What the displayed operations are, and the response that established them. */
interface Established {
  readonly key: string;
  readonly at: number;
}

/** A request whose start and stop are being watched, absent other provenance. */
type Concluding = { key: string; started: boolean } | null;

/** Operations to publish, or `null` to leave the displayed ones alone. */
type Settled = {
  readonly ops: GroupAggregateOps | undefined;
  readonly key: string;
  readonly at: number;
} | null;

/**
 * Which of the four kinds of provenance applies, in order of what it can
 * establish: nothing on screen, a named response, the query's own marker,
 * and — last — a request seen only to start and stop.
 */
function resolveOps(
  input: AggregateOpsForResponse,
  known: Map<string, GroupAggregateOps | undefined>,
  shown: Established | null,
  concluding: { current: Concluding }
): Settled {
  const { requestKey, requested, responseKey, respondedAt, hasData } = input;
  // Nothing on screen yet: there is no earlier answer to mislabel, so the
  // request in flight is the best description available.
  if (!hasData) return { ops: requested, key: requestKey, at: 0 };
  if (responseKey !== undefined) return named(responseKey, known, shown);
  if (respondedAt !== undefined) {
    return marked(requestKey, respondedAt, known, shown);
  }
  return concluded(input, shown, concluding);
}

/**
 * Told outright which request the data answers. A key the map no longer holds
 * is an answer whose operations are unknown — never another response's.
 */
function named(
  responseKey: string,
  known: Map<string, GroupAggregateOps | undefined>,
  shown: Established | null
): Settled {
  if (shown?.key === responseKey) return null;
  return {
    ops: known.has(responseKey) ? known.get(responseKey) : undefined,
    key: responseKey,
    at: 0,
  };
}

/**
 * The query's response marker, read against the request it belongs to. Zero
 * means this request has no answer of its own — the rows on screen are
 * another request's, and they keep its operations.
 */
function marked(
  requestKey: string,
  respondedAt: number,
  known: Map<string, GroupAggregateOps | undefined>,
  shown: Established | null
): Settled {
  if (respondedAt === 0) return null;
  if (shown?.key === requestKey && shown.at === respondedAt) return null;
  return { ops: known.get(requestKey), key: requestKey, at: respondedAt };
}

/**
 * No provenance at all. While the displayed operations are the ones this
 * request carries there is nothing to decide; once a different request has
 * been made, watching it start and stop says only that something concluded,
 * never that it answered — so the rows on screen are described as unknown
 * rather than as a request that may have been cancelled.
 */
function concluded(
  input: AggregateOpsForResponse,
  shown: Established | null,
  concluding: { current: Concluding }
): Settled {
  const { requestKey, fetching, failed } = input;
  if (shown?.key === requestKey) return null;
  const pending = concluding.current;
  if (pending?.key !== requestKey) {
    concluding.current = { key: requestKey, started: fetching };
    return null;
  }
  if (fetching) {
    pending.started = true;
    return null;
  }
  if (!pending.started || failed) return null;
  return { ops: undefined, key: requestKey, at: 0 };
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
