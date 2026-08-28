/**
 * The table's URL adapter, for whatever router the app already has.
 *
 * Every router recipe — React Router, TanStack Router, Next.js App Router —
 * was the same twelve lines with two names changed, copied into each app's
 * codebase where nobody could fix it centrally. They are the same because the
 * question is the same: given a way to READ the current query string and a
 * way to NAVIGATE to a new one, what does a correct adapter look like?
 *
 * So that is the function. It takes no dependency on any router, which is the
 * point: a package that imported `next/navigation` would work for one
 * framework and break the build of every other.
 *
 * The subtle part it gets right is `subscribe`. A router re-renders its tree
 * on navigation, which means the hook holding this adapter runs again and
 * reads the new search itself — so subscribing to anything would be a second
 * notification for a change already delivered, and a second render for free.
 * The adapter therefore reports no external changes and relies on the caller
 * rebuilding it when `search` changes. Hand it a `search` that does not
 * update and the table will look frozen; that is the one way to hold it
 * wrong, and it is why `search` is a value rather than a getter.
 */
import type { UrlStateAdapter } from "./adapter";

/**
 * What {@link routerUrlAdapter} needs from the router.
 *
 * @internal
 */
export interface RouterUrlAdapterOptions {
  /**
   * The current query string, WITHOUT the leading `"?"`. Must come from the
   * router's own reactive source — `useSearchParams().toString()`,
   * `location.search.slice(1)` — so it changes when the route does.
   */
  search: string;
  /**
   * Go to a new query string. `push` adds a history entry; the default is a
   * replace, because a table's every keystroke is not a page a user wants to
   * walk back through.
   */
  navigate: (search: string, options: { push: boolean }) => void;
}

/**
 * Build a `UrlStateAdapter` from a router's search string and navigate.
 *
 * Memoize it on `search` — the adapter is a value, and rebuilding it is how
 * the table learns the route changed.
 *
 * @example React Router
 * ```tsx
 * const [params] = useSearchParams();
 * const navigate = useNavigate();
 * const adapter = useMemo(
 *   () =>
 *     routerUrlAdapter({
 *       search: params.toString(),
 *       navigate: (search, { push }) =>
 *         navigate({ search }, { replace: !push }),
 *     }),
 *   [params, navigate]
 * );
 * ```
 *
 * @example Next.js App Router
 * ```tsx
 * const searchParams = useSearchParams();
 * const pathname = usePathname();
 * const router = useRouter();
 * const adapter = useMemo(
 *   () =>
 *     routerUrlAdapter({
 *       search: searchParams.toString(),
 *       navigate: (search, { push }) => {
 *         const url = search ? `${pathname}?${search}` : pathname;
 *         (push ? router.push : router.replace)(url, { scroll: false });
 *       },
 *     }),
 *   [searchParams, pathname, router]
 * );
 * ```
 *
 * @param options - The router's current search, and how to navigate.
 * @returns An adapter to hand the table as `urlAdapter`.
 *
 * @internal
 */
export function routerUrlAdapter({
  search,
  navigate,
}: RouterUrlAdapterOptions): UrlStateAdapter {
  return {
    // Tolerate a caller who passed the string with its "?" — every router
    // spells this differently and none of them are wrong.
    getSearch: () => (search.startsWith("?") ? search.slice(1) : search),
    setSearch: (next, options) => {
      navigate(next, { push: options?.push === true });
    },
    // See the note at the top of the file: the router's own re-render is the
    // notification, and subscribing would double it.
    subscribe: () => () => undefined,
  };
}
