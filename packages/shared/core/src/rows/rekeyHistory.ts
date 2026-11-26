import type { RowPatchEvent } from "../contracts/rows";

type RekeyUpdate = Extract<RowPatchEvent<unknown>, { type: "update" }> & {
  readonly from: string;
};

/** The net update per surviving rekeyed row, keyed by its current id. */
type RekeyUpdates = ReadonlyMap<string, RekeyUpdate>;

interface Origin {
  readonly token: WeakRef<object>;
  readonly older?: Origin;
}

interface Origins {
  readonly head: Origin;
  readonly count: number;
  readonly sweepAt: number;
}

export interface RekeyHistory {
  readonly origins: Origins;
  readonly rekeyedOrigins: readonly WeakRef<object>[];
  readonly updates: WeakMap<object, RekeyUpdates>;
  readonly targets: ReadonlySet<string>;
}

function* originRefs(head: Origin | undefined): Iterable<WeakRef<object>> {
  for (let origin = head; origin; origin = origin.older) yield origin.token;
}

function appendOrigin(
  previous: Origins | undefined,
  token: WeakRef<object>
): Origins {
  if (!previous) return { head: { token }, count: 1, sweepAt: 2 };
  const head = { token, older: previous.head };
  const count = previous.count + 1;
  if (count < previous.sweepAt)
    return { head, count, sweepAt: previous.sweepAt };
  // Sweep at geometric intervals, so ordinary updates do not walk all
  // earlier snapshots for every patch. The tokens do not keep arrays alive.
  let live: Origin = { token };
  let kept = 1;
  for (const reference of originRefs(previous.head)) {
    if (!reference.deref()) continue;
    live = { token: reference, older: live };
    kept += 1;
  }
  return { head: live, count: kept, sweepAt: kept * 2 };
}

const EMPTY_UPDATES: RekeyUpdates = new Map();

function advanceRekeys(
  previous: RekeyUpdates,
  events: readonly RowPatchEvent<unknown>[]
): RekeyUpdates {
  let changed: Map<string, RekeyUpdate> | undefined;
  for (const event of events) {
    if (event.type === "insert") continue;
    const from = event.type === "update" ? event.from : undefined;
    const id = from ?? event.id;
    const earlier = (changed ?? previous).get(id);
    if (from === undefined && !earlier) continue;
    changed ??= new Map(previous);
    changed.delete(id);
    if (event.type === "remove") continue;
    // Fold in ordinary updates of rekeyed rows so a custom selection id
    // follows the row to its final value.
    changed.set(event.id, {
      ...event,
      from: earlier?.from ?? id,
      prev: earlier ? earlier.prev : event.prev,
    });
  }
  if (!changed) return previous;
  return changed.size ? changed : EMPTY_UPDATES;
}

/**
 * Keep only the rekeys from each still-live input. Every table reads its
 * own starting point, independent of when another table commits.
 */
export function advanceRekeyHistory(
  earlier: RekeyHistory | undefined,
  base: object,
  events: readonly RowPatchEvent<unknown>[]
): RekeyHistory {
  const origins = appendOrigin(earlier?.origins, new WeakRef(base));
  const hasRekeys = events.some(
    (event) => event.type === "update" && event.from !== undefined
  );
  if (
    earlier &&
    !hasRekeys &&
    !events.some(
      (event) => event.type !== "insert" && earlier.targets.has(event.id)
    )
  ) {
    return { ...earlier, origins };
  }

  const updates = new WeakMap<object, RekeyUpdates>();
  const rekeyedOrigins: WeakRef<object>[] = [];
  const targets = new Set<string>();
  const advanced = new Map<RekeyUpdates, RekeyUpdates>();
  const candidates = hasRekeys
    ? originRefs(origins.head)
    : (earlier?.rekeyedOrigins ?? []);
  for (const candidate of candidates) {
    const token = candidate.deref();
    if (!token) continue;
    const current = earlier?.updates.get(token) ?? EMPTY_UPDATES;
    let next = advanced.get(current);
    if (!next) {
      next = advanceRekeys(current, events);
      advanced.set(current, next);
      for (const id of next.keys()) targets.add(id);
    }
    if (next.size === 0) continue;
    updates.set(token, next);
    rekeyedOrigins.push(candidate);
  }
  return { origins, updates, rekeyedOrigins, targets };
}
