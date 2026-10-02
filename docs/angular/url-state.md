# Angular table URL state

Angular tables keep view state in the URL by default. Give each table a
distinct `urlKey` when several tables share a page; set `[urlSync]="false"`
for an isolated in-memory view.

```html
<adapt-data-table
  [data]="people"
  [columns]="peopleColumns"
  [rowKey]="personKey"
  urlKey="people"
/>
<adapt-data-table
  [data]="orders"
  [columns]="orderColumns"
  [rowKey]="orderKey"
  urlKey="orders"
/>
```

Import `AdaptDataTable` from `@adapttable/angular-unstyled` or
`@adapttable/ng-zorro` in the host component's `imports`. The first table writes
keys such as `people.q` and `people.page`;
the second writes `orders.q` and `orders.page`. Unrelated application
parameters stay intact. Tables without distinct namespaces can overwrite
each other's view and receive a development warning.

## History API or Angular Router

Without a provider, tables use the browser History API. For a Router-based
application, register the actual secondary-entry provider alongside your
existing router providers:

```ts
import { provideAdaptTableRouterUrl } from "@adapttable/angular/router";

const tableUrlProvider = provideAdaptTableRouterUrl();
// Add tableUrlProvider to bootstrapApplication's providers, or route providers.
```

`provideAdaptTableRouterUrl()` provides `ADAPTTABLE_URL_ADAPTER` from the
binding. The adapter writes through `Router.navigateByUrl`, preserving the
path and fragment, replacing the history entry unless a write requests a
push. It reads its own write immediately and observes settled
`NavigationEnd` events for back, forward and link navigation. Its Router
subscription ends with the injection context.

For another router or storage backend, provide a `UrlStateAdapter` through
`ADAPTTABLE_URL_ADAPTER`. Binding injectors also accept an explicit
`urlAdapter`; the kit shell itself has no `urlAdapter` input. A shell with
URL sync disabled uses its private memory store even when a global adapter
exists.

## State and defaults

The base store includes page, limit, search (`q`), sorting, grouping and
simple filter keys (`f_*`). The AND/OR tree uses `ft`. Feature slices include
column visibility/order/widths/pins/names, column-group collapse, collapsed
row groups, row pins (`rowPin`), density, find, pivot and formulas.
Only composed features consume their associated state.

`[defaults]` supplies values while the URL has no value for that key.
Clearing a defaulted value records an explicit empty parameter so it does
not reappear. Defaults, namespace and URL-sync changes follow the current host
inputs. In a custom integration, `injectTableUrlState` accepts signal-backed
defaults, `urlSync`, `urlAdapter` and `urlKey`, and exposes a `state()` signal with
setters such as `setSearch`, `setSort`, `setPage`, `setExtra` and `setFilterTree`.
Changing that controller's `urlSync` selects the real URL or its retained
private backend; only the selected backend keeps a subscription and namespace
claim. The table data controller similarly transfers URL ownership when its
active frontend/server tier changes, so an inactive tier cannot rewrite the
reader's query.

Use `injectColumnLayoutUrlState`, `injectDensityUrlState`,
`injectGroupCollapseUrlState` and `injectRowPinningUrlState` from the binding
when building a custom shell. Pivot and formula slices come from
`@adapttable/angular/pivot` and `@adapttable/angular/formula`. All slices for
one table must share its adapter and namespace. Debounced slice writes flush
when their injection context is destroyed.

Row data, renderers, selection and row-detail expansion are not URL
snapshots. Tree-node expansion is separate from group collapse and is not
automatically serialized by the tree feature. Use explicit host persistence
where those states matter.

## SSR and saved views

On the server, absent an explicit adapter, the binding reads the request's
query string through `PlatformLocation` into a memory adapter. It does not
access a browser history object. The client must receive the same request
state and data for hydration; see [Angular SSR](./ssr-rsc.md).

[Saved views](./saved-views.md) capture the recognized parameters for one
namespace and apply them without replacing other tables' parameters. The
shared codec validates its schema marker and limits one serialized table
slice to 8,192 characters. Unknown schema versions or oversized state do not
restore an arbitrary view. Share public filter values only; URLs may appear
in browser history, logs and copied links.
