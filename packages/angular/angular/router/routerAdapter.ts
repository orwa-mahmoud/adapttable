/**
 * The table's URL state kept in the Angular Router's URL.
 */
import { ADAPTTABLE_URL_ADAPTER } from "@adapttable/angular";
import type { UrlStateAdapter } from "@adapttable/core";
import {
  assertInInjectionContext,
  DestroyRef,
  inject,
  Injector,
  type Provider,
} from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";

/** A router URL's path, query string (without `?`) and fragment (with `#`). */
function partsOf(url: string): {
  path: string;
  search: string;
  fragment: string;
} {
  const hashAt = url.indexOf("#");
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const fragment = hashAt === -1 ? "" : url.slice(hashAt);
  const queryAt = beforeHash.indexOf("?");
  return queryAt === -1
    ? { path: beforeHash, search: "", fragment }
    : {
        path: beforeHash.slice(0, queryAt),
        search: beforeHash.slice(queryAt + 1),
        fragment,
      };
}

/** The router URL with its query string replaced, fragment kept. */
function withSearch(url: string, search: string): string {
  const { path, fragment } = partsOf(url);
  return `${path}${search === "" ? "" : "?"}${search}${fragment}`;
}

/**
 * A URL adapter over the Angular Router.
 *
 * The table reads the query string the router last settled on and writes
 * through `navigateByUrl`, replacing the entry unless a write asks to push.
 * It reads back its own write at once — the router settles after — and it
 * tells the table about a navigation it did not make: back, forward, a link.
 *
 * @param injector - The injector to run in. Omit inside an injection context.
 * @returns The adapter.
 *
 * @public
 */
export function angularRouterAdapter(injector?: Injector): UrlStateAdapter {
  if (!injector) assertInInjectionContext(angularRouterAdapter);
  const context = injector ?? inject(Injector);
  const router = context.get(Router);
  let current = partsOf(router.url).search;
  const listeners = new Set<() => void>();
  const events = router.events.subscribe((event) => {
    if (!(event instanceof NavigationEnd)) return;
    const next = partsOf(event.urlAfterRedirects).search;
    if (next === current) return;
    current = next;
    for (const listener of listeners) listener();
  });
  context.get(DestroyRef).onDestroy(() => {
    events.unsubscribe();
  });
  return {
    getSearch: () => current,
    setSearch: (search, options) => {
      if (search === current) return;
      current = search;
      void router.navigateByUrl(withSearch(router.url, search), {
        replaceUrl: options?.push !== true,
      });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Keep every table under this injector in the Angular Router's URL: the
 * provider for {@link ADAPTTABLE_URL_ADAPTER}.
 *
 * @returns The provider, for `bootstrapApplication` or a route's `providers`.
 *
 * @public
 */
export function provideAdaptTableRouterUrl(): Provider {
  return {
    provide: ADAPTTABLE_URL_ADAPTER,
    useFactory: () => angularRouterAdapter(),
  };
}
