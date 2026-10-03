# Angular server rendering and hydration

Angular tables can render their initial rows on the server and hydrate those
same elements in the browser. This page keeps the cross-framework `ssr-rsc`
URL, but its APIs are Angular SSR and hydration; React Server Components are not
an Angular integration requirement.

## Render deterministic initial data

```ts
import { Component, type ApplicationConfig } from "@angular/core";
import { provideClientHydration } from "@angular/platform-browser";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface City {
  id: string;
  name: string;
}

@Component({
  selector: "app-root",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Cities"
      urlKey="cities"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [defaults]="{ limit: 2 }"
    />
  `,
})
export class CityApp {
  readonly rows: readonly City[] = [
    { id: "c1", name: "Amman" },
    { id: "c2", name: "Dubai" },
    { id: "c3", name: "Irbid" },
  ];
  readonly columns: readonly ColumnDef<City>[] = [
    { key: "name", header: "City", sortable: true },
  ];
  readonly rowKey = (row: City) => row.id;
}

export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration()],
};
```

Merge the hydration provider into your existing application configuration and
use the server bootstrap generated for your Angular SSR application. The table
does not replace that bootstrap. The equivalent NG-ZORRO root component is
`@adapttable/ng-zorro`; load its global stylesheet in the host.
See [getting started](./getting-started.md) for installation
and first-release status.

## Match the request and client state

The initial rows, stable row IDs, columns, labels, direction and query state
must agree between server and browser. Transfer or reuse the initial server
result instead of issuing a second unrelated query before hydration. Avoid
random IDs, render-time timestamps and browser-only value formatting that
changes the first markup.

URL state reads the request's URL on the server. A request for page two can
therefore render page two, rather than sending page one and correcting it only
after JavaScript starts. Use the same namespaced `urlKey` and defaults on both
sides. With Angular Router, use the binding's `/router` integration consistently
for your source state; see [URL state](./url-state.md).

Table SSR checks use Angular's platform identity rather than the presence of a
window-like global. Server rendering does not attach media-query or browser
event listeners. Keep that boundary in your own callbacks: defer direct DOM,
clipboard, fullscreen and microphone access until a client interaction or
`afterNextRender`.

## Client activation and cleanup

Hydration should adopt server rows and then activate sorting, pagination and
the other composed controls. The kit's hydration tests assert node reuse,
matching query state and a working page action; they also exercise replay of
an action made before hydration using Angular's event-dispatch setup. Let the
Angular application own that event infrastructure rather than adding a second
table-specific replay system.

The ngx-bootstrap 22.0.0 kit has a narrow
[upstream pagination replay limitation](./ngx-bootstrap.md#known-upstream-event-replay-limitation):
an early pagination-link click is rejected during replay. Rendering, ordinary
hydration and a manual click after hydration work; the early click is not
retried automatically. Its explicit known-failure test does not relax the
other kits' replay checks or its own normal hydration and recovery checks.

Viewport-dependent card layout and virtualization measurement belong to the
client. Do not guess a phone width on the server and render a different tree
from the browser's initial tree. If your app deliberately fixes a layout with
`forceMobile`, keep that input consistent across the initial render.

Injection functions such as `injectTableData`, `injectPivotUrlState` and
`injectRowPatchStream` need an Angular injection context, or their documented
explicit injector option. Do not create a long-lived global injector to retain
a per-request table. Signal subscriptions, event listeners, measurements and
transport connections must end with their owner. For a browser-only realtime
feed, keep it disabled during SSR and enable it after client render.

Loading and error states should be deterministic too. Render the available
initial page or an honest loading/error state; do not claim that a mounted
empty table proves the server request completed. Keep authentication and row
authorization in the server data path, including export and agent endpoints.

See [Data tiers](./data-tiers.md), [Virtualization](./virtualization.md),
[Realtime](./realtime.md) and the hydration tests for
[unstyled](../../packages/angular/adapter-angular-unstyled/src/dataTable.hydration.ssr.test.ts)
and [NG-ZORRO](../../packages/angular/adapter-ng-zorro/src/dataTable.hydration.ssr.test.ts).
