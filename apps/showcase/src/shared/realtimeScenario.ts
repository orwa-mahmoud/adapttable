/**
 * The realtime page, written once for React, Vue and Angular: which row the
 * next patch moves and where it lands, the tick source that drives the
 * patches, what the feed and its live region say, and whether the page
 * opens running. A framework adds its binding's patch stream, its cell
 * flash and its table.
 */
import {
  type RowPatch,
  type StreamSocket,
  type StreamSocketEvent,
  updateRow,
} from "@adapttable/core";

import { budget, type Person, personName } from "../people";
import { personEditField } from "./peopleTable";

/** How often the page applies a patch, in ms. */
export const REALTIME_INTERVAL_MS = 1200;

/** How many rows the page treats as "the top of the sheet". */
const REALTIME_TOP = 6;

/** How many applied updates the feed lists. */
export const REALTIME_FEED_LENGTH = 4;

/** The development server's patch stream; the static build has none. */
export const PATCH_STREAM_URL = "/__adapttable/patches";

/** What the page tells the reader, in order. */
export const REALTIME_HINTS: readonly string[] = [
  "a patch sits between two people already in rows 2–6",
  "same Budget sort the table is using — it stays on page 1",
  "the feed names the row that just moved",
];

/** The feed's caption, its empty state, and its controls. */
export const REALTIME_TEXT = {
  feed: "Applied updates",
  waiting: "waiting for the first patch…",
  pause: "Pause updates",
  resume: "Resume updates",
  applyNext: "Apply next update",
} as const;

/**
 * Whether the page opens applying patches: `?live=off` opens it paused, so
 * a reader (or a test) applies them one at a time.
 *
 * @returns Whether the feed starts running.
 */
export function realtimeStartsLive(): boolean {
  if (typeof window === "undefined") return true;
  return new URLSearchParams(window.location.search).get("live") !== "off";
}

/** Visual order: the same Budget direction the table is showing. */
function rankByBudget(rows: readonly Person[], dir: "asc" | "desc"): Person[] {
  return [...rows].sort((left, right) => {
    const delta =
      dir === "asc"
        ? budget(left) - budget(right)
        : budget(right) - budget(left);
    return delta === 0 ? Number(left.id) - Number(right.id) : delta;
  });
}

/** A value strictly between two neighbours, so the row stays in that seat. */
function budgetBetween(left: number, right: number): number {
  const lo = Math.min(left, right);
  const hi = Math.max(left, right);
  if (hi - lo >= 2) return lo + Math.floor((hi - lo) / 2);
  return left < right ? left + 1 : left - 1;
}

/**
 * A budget that sorts `targetId` into `destRank` of the visible order
 * (0 = the row on screen first): between the two neighbours already in that
 * band, so the patch stays on page 1.
 */
function budgetForRank(
  ranked: readonly Person[],
  destRank: number,
  targetId: string,
  dir: "asc" | "desc"
): number {
  const others = ranked.filter((row) => row.id !== targetId);
  const first = others[0];
  const last = others.at(-1);
  if (!first || !last) return 50_000;
  const at = Math.min(Math.max(destRank, 0), others.length);
  const beyondFirst = dir === "asc" ? -2500 : 2500;
  const before = others[at - 1];
  const after = others[at];
  if (at <= 0 || !before) return budget(first) + beyondFirst;
  if (at >= others.length || !after) return budget(last) - beyondFirst;
  return budgetBetween(budget(before), budget(after));
}

/** One applied update: the patch, the row it moves, and the feed's line. */
export interface RealtimePatch {
  readonly patch: RowPatch<Person>;
  readonly id: string;
  readonly line: string;
}

/**
 * The nth live update: ranked the way the table is ranked, the row parks
 * between two people already in seats 2–6, so the change stays on page 1.
 *
 * @param rows - The rows as they stand.
 * @param tick - How many updates have been applied.
 * @param dir - The direction the table sorts Budget in.
 * @returns The update, or null when there is nothing to move.
 */
export function nextRealtimePatch(
  rows: readonly Person[],
  tick: number,
  dir: "asc" | "desc"
): RealtimePatch | null {
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
    line: `${personName(target, "en")} · budget → ${String(nextBudget)}`,
  };
}

/** The live region's words for the stream's connection state. */
export function streamStatusLabel(status: string): string {
  if (status === "open") return "Live patch stream connected";
  if (status === "reconnecting") return "Reconnecting to the patch stream";
  if (status === "error") return "Patch stream disconnected";
  return "";
}

/**
 * An EventSource stand-in for the static build, where the showcase has no
 * server to stream from: the same interval and frames as the development
 * server's stream, so parsing, applying and status stay one path.
 */
class ScriptedTickSource implements StreamSocket {
  readyState = 0;
  private readonly listeners = new Map<
    string,
    Set<(event: StreamSocketEvent) => void>
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
    listener: (event: StreamSocketEvent) => void
  ): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(
    type: string,
    listener: (event: StreamSocketEvent) => void
  ): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.readyState = 2;
    if (this.timer !== undefined) clearInterval(this.timer);
  }

  private emit(type: string, event: StreamSocketEvent): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

/**
 * The page's patch source: the development server's stream where there is
 * one, the scripted ticks on the static build.
 *
 * @param url - The stream's address.
 * @returns The socket the binding's patch stream reads.
 */
export function createDemoPatchSource(url: string): StreamSocket {
  if (import.meta.env.DEV && typeof EventSource !== "undefined") {
    return new EventSource(url);
  }
  return new ScriptedTickSource();
}

/**
 * Whether a cell should flash: a patch records the row field that moved,
 * while the table asks about the column, and composite cells (Person, Load,
 * Timeline) name the two differently, so both are asked.
 *
 * @param isFlashing - The binding's flash state, by row and field.
 * @returns The table's question, by row and column.
 */
export function personCellFlashing(
  isFlashing: (rowId: string, key: string) => boolean
): (rowId: string, columnKey: string) => boolean {
  return (rowId, columnKey) =>
    isFlashing(rowId, columnKey) ||
    isFlashing(rowId, personEditField(columnKey, "en"));
}
