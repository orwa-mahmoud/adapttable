/**
 * The aggregate operations the response ON SCREEN was asked for.
 *
 * A reader who switches a column from sum to average changes the request
 * before the answer arrives. Until it does, the rows and groups being drawn
 * are still the previous ones, and a column formatting them must be told what
 * produced THOSE — telling it about the request in flight would label the old
 * numbers with the new operation for as long as the fetch takes.
 *
 * So the published value only moves when a response settles: while a request
 * is in flight the previous answer stands.
 */
import type { GroupAggregateOps } from "@adapttable/core";
import { useEffect, useState } from "react";

/**
 * Hold the operations that produced what is currently displayed.
 *
 * @param effective - The operations the current request carries.
 * @param settled - The data now on screen; a new reference means a response
 *   landed. Pass the query's data in a fetching tier, the rows in a
 *   controlled one.
 * @param fetching - Whether a request is in flight.
 * @returns The operations behind the displayed response.
 *
 * @internal
 */
export function useSettledAggregateOps(
  effective: GroupAggregateOps | undefined,
  settled: unknown,
  fetching: boolean
): GroupAggregateOps | undefined {
  const [displayed, setDisplayed] = useState(effective);

  useEffect(() => {
    // In flight: what is drawn belongs to the answer before this one, and it
    // keeps the description it came with.
    if (fetching) return;
    setDisplayed((current) =>
      sameOps(current, effective) ? current : effective
    );
    // `settled` is here so a response that lands with the same operations —
    // a refetch, a next page — still confirms them.
  }, [settled, fetching, effective]);

  return displayed;
}

/** Whether two operation maps say the same thing. */
function sameOps(
  left: GroupAggregateOps | undefined,
  right: GroupAggregateOps | undefined
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => left[key] === right[key]);
}
