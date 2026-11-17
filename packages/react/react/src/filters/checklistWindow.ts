/**
 * The window behind a long checklist: track the list's scroll position and
 * width, and derive the window core's `checklistWindow` computes.
 */

import {
  checklistSlice,
  type ChecklistWindowState,
  nextChecklistViewport,
} from "@adapttable/core/binding";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
export type { ChecklistWindowState } from "@adapttable/core/binding";

/**
 * Track a checklist list's scroll position and width, and derive its window.
 *
 * @param count - How many options the list holds.
 * @param enabled - False below the virtualization threshold: the whole list
 *   renders, and no listener is attached.
 * @returns The slice to render plus the handlers that keep it current.
 */
export function useChecklistWindow(
  count: number,
  enabled: boolean
): ChecklistWindowState {
  const [viewport, setViewport] = useState({ scrollTop: 0, width: 0 });
  const element = useRef<HTMLDivElement | null>(null);

  const read = useCallback(() => {
    const node = element.current;
    if (!node) return;
    // Same numbers, same object: a fresh one per scroll event would re-render
    // every checkbox at 60fps for nothing.
    setViewport((current) => nextChecklistViewport(current, node));
  }, []);

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      element.current = node;
      read();
    },
    [read]
  );

  useEffect(() => {
    const node = element.current;
    if (!enabled || !node) return undefined;
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            read();
          });
    observer?.observe(node);
    return () => {
      observer?.disconnect();
    };
  }, [enabled, read]);

  const window = useMemo(
    () => checklistSlice(count, enabled, viewport.scrollTop, viewport.width),
    [enabled, count, viewport]
  );

  return { ...window, ref, onScroll: read };
}
