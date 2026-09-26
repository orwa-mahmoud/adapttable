/**
 * The injectable seam that decouples AdaptTable's URL-synced state from
 * any particular router. A `UrlStateAdapter` is a tiny store over the
 * current query string; the table reads it via `useSyncExternalStore`
 * and writes through it.
 *
 * The adapters themselves — History API and in-memory — live in
 * `@adapttable/core`. This module adds the hook that resolves one per
 * piece of URL state.
 */
import {
  createMemoryAdapter,
  resolveUrlAdapter,
  type UrlStateAdapter,
} from "@adapttable/core";
import { useRef } from "react";

export type { UrlStateAdapter } from "@adapttable/core";
export {
  createHistoryAdapter,
  createMemoryAdapter,
  getHistoryAdapter,
  resetHistoryAdapter,
} from "@adapttable/core";

/**
 * Resolve which `UrlStateAdapter` a URL-synced hook should use: an
 * explicit `adapter` wins; otherwise the shared history adapter in the
 * browser, or a stable per-hook memory adapter when disabled or under SSR.
 *
 * @param adapter - Optional explicit adapter (router integration).
 * @param enabled - When false, always use the local memory adapter.
 * @returns The adapter to read/write the query string through.
 *
 * @public
 */
export function useResolvedAdapter(
  adapter: UrlStateAdapter | undefined,
  enabled: boolean
): UrlStateAdapter {
  // A per-hook memory adapter, created once, used when disabled or SSR.
  const memoryRef = useRef<UrlStateAdapter | null>(null);
  memoryRef.current ??= createMemoryAdapter();
  return resolveUrlAdapter(adapter, enabled, memoryRef.current);
}
