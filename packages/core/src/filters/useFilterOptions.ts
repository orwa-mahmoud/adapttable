import { useEffect, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";
import { devWarn } from "../utils/devWarn";
import type { FilterDef, FilterOption } from "./filterDefs";

/** Resolved choices for a select/multiSelect control. */
export interface ResolvedFilterOptions {
  /** The choices to render (empty while an async loader is in flight). */
  options: readonly FilterOption[];
  /** True while an async loader is fetching. */
  loading: boolean;
}

const EMPTY: readonly FilterOption[] = [];

/**
 * Resolve a definition's option source for the auto-built form: arrays are
 * used as-is, async loaders run once on mount (kit forms show their native
 * loading affordance meanwhile), and a leftover `"auto"` — possible only on
 * the server/source tiers, where there is no full dataset to derive from —
 * resolves to no options with a development warning.
 */
export function useFilterOptions<TRow>(
  def: Pick<FilterDef<TRow>, "key" | "options">
): ResolvedFilterOptions {
  const source = def.options;
  const isLoader = typeof source === "function";
  const [loaded, setLoaded] = useState<readonly FilterOption[] | null>(null);
  const [loading, setLoading] = useState(isLoader);

  // The load reads the LATEST loader (callers routinely pass it inline, a
  // fresh identity every render) without restarting — only a key change
  // re-runs the effect.
  const startLoad = useEventCallback(() => {
    const loader = source;
    if (typeof loader !== "function") return undefined;
    let alive = true;
    setLoading(true);
    void loader().then(
      (options) => {
        if (!alive) return;
        setLoaded(options);
        setLoading(false);
      },
      () => {
        if (!alive) return;
        devWarn(`async options for filter "${def.key}" failed to load.`);
        setLoaded(EMPTY);
        setLoading(false);
      }
    );
    return () => {
      alive = false;
    };
  });

  useEffect(() => startLoad(), [isLoader, def.key, startLoad]);

  // Warn from an effect, not the render path (render stays pure; devWarn
  // already dedupes, this just keeps StrictMode double-renders silent too).
  const isLeftoverAuto = source === "auto";
  useEffect(() => {
    if (!isLeftoverAuto) return;
    devWarn(
      `filter "${def.key}" uses options: "auto" on a tier with no full dataset — provide an options array or loader.`
    );
  }, [isLeftoverAuto, def.key]);

  if (Array.isArray(source)) return { options: source, loading: false };
  if (isLoader) return { options: loaded ?? EMPTY, loading };
  return { options: EMPTY, loading: false };
}
