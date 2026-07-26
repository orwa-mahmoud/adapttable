import { type RefObject, useEffect, useRef } from "react";

import { useEventCallback } from "./useEventCallback";

/** Options for {@link useInfiniteScroll}. */
export interface UseInfiniteScrollOptions {
  /** Whether more pages remain to be fetched. */
  hasNextPage: boolean;
  /** Whether a page fetch is currently in flight. */
  isFetchingNextPage: boolean;
  /** Loads the next page; called when the sentinel scrolls into view. */
  fetchNextPage: () => void;
  /**
   * Master switch. When `false` the observer is never attached (e.g. in
   * paged mode, or when the consumer wants explicit "Load more" only).
   * @defaultValue true
   */
  enabled?: boolean;
  /**
   * `IntersectionObserver` root margin — how far before the sentinel enters
   * the viewport the next page is prefetched.
   * @defaultValue "200px"
   */
  rootMargin?: string;
  /**
   * The current number of rendered rows. Pass `source.rows.length` so the
   * observer re-arms after each page loads: when freshly-loaded content is
   * still shorter than the viewport the sentinel stays in view, and
   * re-observing re-fires the callback to keep loading until the viewport
   * fills or there is no next page. Omit to disable this auto-continue.
   */
  itemCount?: number;
}

/**
 * Auto-loads the next page when a sentinel element scrolls near the viewport,
 * turning a paginated {@link TableSource} into true infinite scroll. Attach
 * the returned ref to a small element rendered after the last row.
 *
 * SSR- and jsdom-safe: when `IntersectionObserver` is unavailable it no-ops,
 * so an accompanying "Load more" button remains the fallback. The latest
 * `fetchNextPage` is read from a ref, so passing a fresh closure each render
 * never re-subscribes the observer.
 *
 * @typeParam TElement - The sentinel element type.
 * @param options - See {@link UseInfiniteScrollOptions}.
 * @returns A ref to attach to the sentinel element.
 */
export function useInfiniteScroll<
  TElement extends HTMLElement = HTMLDivElement,
>(options: UseInfiniteScrollOptions): RefObject<TElement | null> {
  const {
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    enabled = true,
    rootMargin = "200px",
    itemCount,
  } = options;

  const ref = useRef<TElement>(null);
  // The sentinel handler always sees the latest `fetchNextPage` /
  // `isFetchingNextPage` without re-subscribing the observer, so passing a
  // fresh closure each render never re-arms it.
  const onSentinelVisible = useEventCallback(() => {
    if (!isFetchingNextPage) fetchNextPage();
  });

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !hasNextPage || el === null) return undefined;
    if (typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onSentinelVisible();
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, hasNextPage, rootMargin, itemCount, onSentinelVisible]);

  return ref;
}
