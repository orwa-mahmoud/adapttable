import { type RowPatchEvent, rowPatchLog, updateRow } from "@adapttable/core";
import {
  type StreamSocket,
  useChangedCellFlash,
  useRowPatchStream,
} from "@adapttable/core/stream";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useRef,
  useState,
} from "react";

import { budget, type Person, personName } from "./data";
import { type RealtimeSlotProps, RealtimeSlotProvider } from "./realtimeSlot";

/** How often the realtime page applies a patch, in ms. */
const REALTIME_INTERVAL_MS = 1200;

/** How many rows the realtime page treats as "the top of the sheet". */
const REALTIME_TOP = 6;

/** Visual order — the same Budget direction the table is showing. */
function rankByBudget(rows: readonly Person[], dir: "asc" | "desc"): Person[] {
  return [...rows].sort((left, right) => {
    const delta =
      dir === "asc"
        ? budget(left) - budget(right)
        : budget(right) - budget(left);
    return delta !== 0 ? delta : Number(left.id) - Number(right.id);
  });
}

/** A value strictly between two neighbors, so the row stays in that seat. */
function budgetBetween(left: number, right: number): number {
  const lo = Math.min(left, right);
  const hi = Math.max(left, right);
  if (hi - lo >= 2) return lo + Math.floor((hi - lo) / 2);
  return left < right ? left + 1 : left - 1;
}

/**
 * A budget that sorts `target` into `destRank` of the *visible* order
 * (0 = the row on screen first). Must sit between the two neighbors
 * already in that band — a 112k write against an ascending sheet is
 * how a patch used to vanish onto page 3.
 */
function budgetForRank(
  ranked: readonly Person[],
  destRank: number,
  targetId: string,
  dir: "asc" | "desc"
): number {
  const others = ranked.filter((row) => row.id !== targetId);
  const first = others[0];
  const last = others[others.length - 1];
  if (!first || !last) return 50_000;
  const at = Math.min(Math.max(destRank, 0), others.length);
  const beyondFirst = dir === "asc" ? -2500 : 2500;
  if (at <= 0) return budget(first) + beyondFirst;
  if (at >= others.length) return budget(last) - beyondFirst;
  return budgetBetween(budget(others[at - 1]), budget(others[at]));
}

/**
 * Apply the nth live update.
 *
 * Rank the way the table is ranked. Park the row between two people
 * already in seats 2–6 so the change stays on page 1. The stream applies
 * the patch through `useRowPatchStream`, so the incremental log stays on
 * the array the table already holds.
 */
function nextRealtimePatch(
  rows: readonly Person[],
  tick: number,
  dir: "asc" | "desc"
): {
  patch: ReturnType<typeof updateRow<Person>>;
  id: string;
  line: string;
} | null {
  if (rows.length < 2) return null;
  const ranked = rankByBudget(rows, dir);
  const belowFold = ranked.slice(REALTIME_TOP);
  const destRank = 1 + (tick % (REALTIME_TOP - 1));
  const fromBottom =
    belowFold.length === 0
      ? undefined
      : belowFold[
          belowFold.length - 1 - (Math.floor(tick / 2) % belowFold.length)
        ];
  const fromTop = ranked[(destRank + 2) % REALTIME_TOP];
  const promote = tick % 2 === 0 && fromBottom !== undefined;
  const target = promote ? fromBottom : (fromTop ?? ranked[destRank]);
  if (!target) return null;
  const nextBudget = budgetForRank(ranked, destRank, target.id, dir);
  return {
    patch: updateRow<Person>(target.id, { budget: nextBudget }),
    id: target.id,
    line: `${personName(target, "en")} · budget → ${nextBudget}`,
  };
}

/** Vite's SSE endpoint — only the dev server has it. */
const PATCH_STREAM_URL = "/__adapttable/patches";

/**
 * An EventSource stand-in for the static GitHub Pages build, where the
 * showcase has no server to stream from. Same interval, same frames as
 * the Vite middleware, so parse / apply / status stay one path.
 */
class ScriptedTickSource implements StreamSocket {
  readyState = 0;
  private readonly listeners = new Map<
    string,
    Set<(event: { data?: unknown }) => void>
  >();
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    queueMicrotask(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      this.emit("open", {});
      this.emit("message", { data: "tick" });
      this.timer = setInterval(() => {
        this.emit("message", { data: "tick" });
      }, REALTIME_INTERVAL_MS);
    });
  }

  addEventListener(
    type: string,
    listener: (event: { data?: unknown }) => void
  ): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(
    type: string,
    listener: (event: { data?: unknown }) => void
  ): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.readyState = 2;
    if (this.timer !== undefined) clearInterval(this.timer);
  }

  private emit(type: string, event: { data?: unknown }): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }
}

function createDemoPatchSource(url: string): StreamSocket {
  if (import.meta.env.DEV && typeof EventSource !== "undefined") {
    return new EventSource(url);
  }
  return new ScriptedTickSource();
}

/**
 * Drive a live feed of row patches, and report what was applied.
 *
 * The ticks arrive over SSE on the Vite server (a real EventSource) and
 * from a scripted source on the static GitHub Pages build. Both go through
 * `useRowPatchStream`, so the host's setter is the only write.
 */
function useRealtimeFeed(
  enabled: boolean,
  data: readonly Person[],
  setData: Dispatch<SetStateAction<readonly Person[]>>,
  sortDir: "asc" | "desc",
  onPatched?: (id: string) => void,
  onPatchEvents?: (events: readonly RowPatchEvent<Person>[]) => void
): { lines: string[]; status: string } {
  const [feed, setFeed] = useState<string[]>([]);
  const dataRef = useRef(data);
  dataRef.current = data;
  const sortDirRef = useRef(sortDir);
  sortDirRef.current = sortDir;
  const onPatchedRef = useRef(onPatched);
  onPatchedRef.current = onPatched;
  const onPatchEventsRef = useRef(onPatchEvents);
  onPatchEventsRef.current = onPatchEvents;
  const tickRef = useRef(0);
  const pendingRef = useRef<{ id: string; line: string } | null>(null);
  const pendingEventsRef = useRef<readonly RowPatchEvent<Person>[] | null>(
    null
  );

  const stream = useRowPatchStream<Person>({
    eventSource: enabled ? PATCH_STREAM_URL : undefined,
    enabled,
    getRowId: (row) => row.id,
    onPatch: (update) => {
      setData((prev) => {
        const next = update(prev);
        const log = rowPatchLog(next);
        if (log) pendingEventsRef.current = log.events;
        return next;
      });
    },
    createEventSource: createDemoPatchSource,
    parse: () => {
      const next = nextRealtimePatch(
        dataRef.current,
        tickRef.current,
        sortDirRef.current
      );
      if (!next) return [];
      tickRef.current += 1;
      pendingRef.current = { id: next.id, line: next.line };
      return [next.patch];
    },
    onPatches: () => {
      const pending = pendingRef.current;
      if (!pending) return;
      pendingRef.current = null;
      setFeed((lines) => [pending.line, ...lines].slice(0, 4));
      onPatchedRef.current?.(pending.id);
      const events = pendingEventsRef.current;
      pendingEventsRef.current = null;
      if (events) onPatchEventsRef.current?.(events);
    },
  });

  return { lines: feed, status: stream.status };
}

/** Spoken connection state for the realtime feed's live region. */
function streamStatusLabel(status: string): string {
  if (status === "open") return "Live patch stream connected";
  if (status === "reconnecting") return "Reconnecting to the patch stream";
  if (status === "error") return "Patch stream disconnected";
  return "";
}

/** What the live feed has applied, newest first. */
function RealtimeFeed({
  lines,
  status,
}: Readonly<{ lines: readonly string[]; status: string }>) {
  return (
    <div
      className="demo-live-update demo-live-update--feed"
      data-testid="realtime-feed"
      data-stream-status={status}
    >
      <span>Applied updates</span>
      <span className="visually-hidden" aria-live="polite">
        {streamStatusLabel(status)}
      </span>
      <span className="visually-hidden" aria-live="polite">
        {lines[0] ?? ""}
      </span>
      {lines.length === 0 ? (
        <span>waiting for the first patch…</span>
      ) : (
        <ol>
          {lines.map((line, index) => (
            <li key={`${line}-${String(index)}`}>{line}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * The stream hooks and the feed list. Mounted only when the realtime
 * page provides this slot — never from the frozen `/` demo.
 */
export function RealtimeFeedSlot({
  data,
  setData,
  sortDir,
  onPatched,
  isFlashingRef,
}: Readonly<RealtimeSlotProps>) {
  const cellFlash = useChangedCellFlash({ enabled: true });
  isFlashingRef.current = cellFlash.isFlashing;
  const feed = useRealtimeFeed(
    true,
    data,
    setData,
    sortDir,
    onPatched,
    cellFlash.mark
  );
  return <RealtimeFeed lines={feed.lines} status={feed.status} />;
}

/** Wrap a demo so its table can mount {@link RealtimeFeedSlot}. */
export function RealtimeBoundary({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <RealtimeSlotProvider value={RealtimeFeedSlot}>
      {children}
    </RealtimeSlotProvider>
  );
}
