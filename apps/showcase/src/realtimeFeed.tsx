import {
  applyRowPatchesWithLog,
  type RowPatchEvent,
  rowPatchLog,
} from "@adapttable/core";
import {
  useChangedCellFlash,
  useRowPatchStream,
} from "@adapttable/react/stream";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useRef,
  useState,
} from "react";

import type { Person } from "./data";
import { type RealtimeSlotProps, RealtimeSlotProvider } from "./realtimeSlot";
import {
  createDemoPatchSource,
  nextRealtimePatch,
  PATCH_STREAM_URL,
  REALTIME_FEED_LENGTH,
  REALTIME_TEXT,
  realtimeStartsLive,
  streamStatusLabel,
} from "./shared/realtimeScenario";

/**
 * Drive a live feed of row patches, and report what was applied.
 *
 * The ticks arrive over SSE on the Vite server (a real EventSource) and
 * from a scripted source on the static site build. Both go through
 * `useRowPatchStream`, so the host's setter is the only write.
 */
function useRealtimeFeed(
  enabled: boolean,
  data: readonly Person[],
  setData: Dispatch<SetStateAction<readonly Person[]>>,
  sortDir: "asc" | "desc",
  onPatched?: (id: string) => void,
  onPatchEvents?: (events: readonly RowPatchEvent<Person>[]) => void
): {
  lines: string[];
  status: string;
  applyNext: () => void;
} {
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
      setFeed((lines) =>
        [pending.line, ...lines].slice(0, REALTIME_FEED_LENGTH)
      );
      onPatchedRef.current?.(pending.id);
      const events = pendingEventsRef.current;
      pendingEventsRef.current = null;
      if (events) onPatchEventsRef.current?.(events);
    },
  });

  // The same update the stream applies, applied once by hand while paused.
  const applyNext = () => {
    const next = nextRealtimePatch(
      dataRef.current,
      tickRef.current,
      sortDirRef.current
    );
    if (!next) return;
    tickRef.current += 1;
    const log = applyRowPatchesWithLog(dataRef.current, [next.patch], (row) =>
      String(row.id)
    );
    setData(log.rows);
    setFeed((lines) => [next.line, ...lines].slice(0, REALTIME_FEED_LENGTH));
    onPatchedRef.current?.(next.id);
    onPatchEventsRef.current?.(log.events);
  };

  return { lines: feed, status: stream.status, applyNext };
}

/** What the live feed has applied, newest first. */
function RealtimeFeed({
  lines,
  status,
  running,
  onToggle,
  onApplyNext,
}: Readonly<{
  lines: readonly string[];
  status: string;
  running: boolean;
  onToggle: () => void;
  onApplyNext: () => void;
}>) {
  return (
    <div
      className="demo-live-update demo-live-update--feed"
      data-testid="realtime-feed"
      data-stream-status={status}
    >
      <span>{REALTIME_TEXT.feed}</span>
      <button
        type="button"
        className="seg__btn"
        aria-pressed={running}
        onClick={onToggle}
      >
        {running ? REALTIME_TEXT.pause : REALTIME_TEXT.resume}
      </button>
      <button type="button" className="seg__btn" onClick={onApplyNext}>
        {REALTIME_TEXT.applyNext}
      </button>
      <span className="visually-hidden" aria-live="polite">
        {streamStatusLabel(status)}
      </span>
      <span className="visually-hidden" aria-live="polite">
        {lines[0] ?? ""}
      </span>
      {lines.length === 0 ? (
        <span>{REALTIME_TEXT.waiting}</span>
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
  const [running, setRunning] = useState(realtimeStartsLive);
  const feed = useRealtimeFeed(
    running,
    data,
    setData,
    sortDir,
    onPatched,
    cellFlash.mark
  );
  return (
    <RealtimeFeed
      lines={feed.lines}
      status={feed.status}
      running={running}
      onToggle={() => {
        setRunning((current) => !current);
      }}
      onApplyNext={feed.applyNext}
    />
  );
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
