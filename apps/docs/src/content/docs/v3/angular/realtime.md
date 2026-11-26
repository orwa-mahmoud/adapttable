---
title: "Angular realtime table updates (v3)"
description: Apply realtime row patches to host-owned Angular signals. Preserve
  patch provenance and use changed-cell feedback without giving the table
  persistence.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Angular
      realtime table
      updates","item":"https://adapttable.orwamahmoud.com/v3/angular/realtime/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/angular/realtime.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/angular/realtime.png
slug: v3/angular/realtime
---

Keep live rows in an Angular signal and update that signal when a feed delivers
patches. `injectRowPatchStream()` under `@adapttable/angular/stream` connects a
WebSocket or server-sent-events endpoint to the host-owned array. It does not
make the table a database or a write transport.

```ts
import { Component, signal } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { injectRowPatchStream } from "@adapttable/angular/stream";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Stock {
  id: string;
  product: string;
  available: number;
}

@Component({
  selector: "app-live-stock",
  imports: [AdaptDataTable],
  template: `
    <button type="button" (click)="enabled.set(!enabled())">
      {{ enabled() ? "Pause live updates" : "Resume live updates" }}
    </button>
    <p role="status">Feed: {{ stream.status() }}</p>
    @if (stream.error(); as error) {
      <p role="alert">{{ error.message }}</p>
    }
    <adapt-data-table
      tableLabel="Live stock"
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
    />
  `,
})
export class LiveStock {
  readonly rows = signal<readonly Stock[]>([
    { id: "s1", product: "Notebook", available: 10 },
  ]);
  readonly enabled = signal(true);
  readonly rowKey = (row: Stock) => row.id;
  readonly columns: readonly ColumnDef<Stock>[] = [
    { key: "product", header: "Product" },
    { key: "available", header: "Available" },
  ];
  readonly stream = injectRowPatchStream<Stock>({
    eventSource: "/api/stock/events",
    enabled: this.enabled,
    getRowId: this.rowKey,
    onPatch: (update) => this.rows.update(update),
  });
}
```

Use a real application endpoint in place of `/api/stock/events`. The default
frame format is a JSON patch array, for example
`[{"type":"update","id":"s1","changes":{"available":9}}]`. A custom `parse`
function can adapt another protocol. Use the NG-ZORRO root table if that is your
kit; the stream entry remains on the binding.
See [getting started](/v3/angular/getting-started/) for installation
and first-release status.

## Connection lifecycle

Choose `websocket` or `eventSource`; SSE also accepts an event name and
WebSockets can supply subprotocols. URLs and `enabled` may be signals. Changing
the URL or disabling the feed closes the prior connection; destroying the
injection context closes it too. The returned `status` and `error` are signals.
`close()` closes the current connection; a later URL/enabled change can open it
again. Use `enabled: false` as the maintained paused state.

`reconnect` configures reconnection. Reopening a transport is not proof that
missed data was replayed: the host protocol must decide how to resume, refetch
or reconcile after a gap. Invalid default-format frames with no valid patches
leave the row array unchanged. Validate incoming business values and permissions
at your service boundary; do not let a feed grant new editing rights.

The injector opens the feed as part of its reactive lifecycle. On an SSR route,
enable a browser-only feed after client render when it should not connect on
the server, while keeping the initial rows identical for hydration.

## Apply a patch without a stream

`applyRowPatches`, `updateRow`, `insertRow`, `upsertRow` and `removeRow` are
neutral helpers from `@adapttable/core`. Apply them inside `rows.update(...)`
for a save response, timer or an existing host socket. Updates preserve
untouched row objects and no-op patches preserve the array reference. Stable
keys retain selection and expansion identity; an update to a missing ID is a
no-op, while an upsert can append a missing record.

For changed-cell feedback, use `applyRowPatchesWithLog` to obtain `{ rows,
events }`, call `injectChangedCellFlash({ enabled: true }).mark(events)`, and
pass the flash reader through `[isCellFlashing]`. The shell stamps `data-flash`
on matching desktop cells and mobile values. The unstyled kit needs your CSS
for a visible tint. Reduced-motion preferences suppress the flash, and the
injector clears timers when destroyed.

Keep connection status and failures available as text, not only animation.
Pause/Resume should be reachable by touch and keyboard. For live updates that
arrive under an active edit, configure the [editing conflict policy](/v3/angular/cell-editing/)
and row version rather than silently overwriting a draft.

See [Data tiers](/v3/angular/data-tiers/), [SSR](/v3/angular/ssr-rsc/) and the
[stream implementation](https://github.com/orwa-mahmoud/adapttable/blob/efd18cf92b4e11175f673269395687617e39c2de/packages/angular/angular/stream/rowPatchStream.ts).
