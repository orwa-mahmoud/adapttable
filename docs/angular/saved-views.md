# Angular saved views

`savedViews({ storageKey })` adds a toolbar menu that captures and restores
the table's view under a name. A view contains recognized URL state, such as
search, sort, filters and layout. It does not copy rows or persist an edit.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { filters } from "@adapttable/angular-unstyled/filters";
import { savedViews } from "@adapttable/angular-unstyled/saved-views";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "app-saved-people",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      urlKey="people"
    />
  `,
})
export class SavedPeople {
  readonly rows: Person[] = [{ id: "ada", name: "Ada" }];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", header: "Name", filter: "text" },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [
    filters<Person>(),
    savedViews({ storageKey: "people-views" }),
  ];
}
```

Use the corresponding `@adapttable/ng-zorro` imports for NG-ZORRO.
See [getting started](./getting-started.md) for installation
and first-release status.

The shell supplies its actual URL backend and namespace to the menu. This
also works with `[urlSync]="false"`: the view captures the table's private
memory backend. An explicit `urlAdapter` or `urlKey` in the feature options
overrides those supplied values, so keep overrides aligned with the table.

## Storage and failures

The default list lives in `localStorage` under `storageKey`. `storage: null`
keeps it in memory. Blocked or absent storage also falls back to memory;
unreadable or corrupt stored data yields an empty list.

For shared views, provide a `SavedViewsStore` from `@adapttable/core` with
async `list()`, `save(view)` and `remove(name)`. Optional
`reorder(names)` persists list order. Without it, moving a view changes only
the current session's order. `store` replaces the local-storage backend.
`visibility: "team"` records scope metadata; your service must enforce access
and supply `readOnly` for views the reader cannot change.

Updates appear immediately and write through in the background. A rejected
write does not roll back the displayed list or produce a built-in save-error
panel. A failed list load yields an empty list. Add error reporting in your
store implementation when persistence matters. Late loads are ignored after
a newer load or injector destruction.

## A management panel

The kit's `/saved-views` entry also exports `AdaptSavedViewsPanel`. Connect
it to an `injectSavedViews()` controller in a component injection context:

```ts
import { Component } from "@angular/core";
import { injectSavedViews } from "@adapttable/angular";
import { AdaptSavedViewsPanel } from "@adapttable/angular-unstyled/saved-views";

@Component({
  selector: "app-view-manager",
  imports: [AdaptSavedViewsPanel],
  template: `
    <adapt-saved-views-panel
      [views]="views.views()"
      [onApply]="views.apply"
      [onRename]="views.rename"
      [onMove]="move"
      [onSetDefault]="views.setDefault"
      [onRemove]="views.remove"
    />
  `,
})
export class ViewManager {
  readonly views = injectSavedViews({
    storageKey: "people-views",
    urlKey: "people",
  });
  readonly move = (name: string, delta: number) =>
    this.views.move(name, delta < 0 ? -1 : 1);
}
```

This standalone controller must use the same backend and namespace as the
table whose state it manages. Two controller instances do not become a
shared live list merely by using the same storage key; call `reload()` after
an external change or make one controller the owner of a custom interface.

The panel focuses its rename input. Enter commits and Escape cancels. It
shows read-only/default labels and disables unavailable management actions.
The default flag is exposed as `defaultView()`; if the application wants to
apply it automatically, the host must choose when to call `apply`. Stored
schema upgrades use `migrate(view, from)`; returning `null` drops that view.

See [URL state](./url-state.md) for namespace isolation and
[customization](./customization.md) for Angular renderers and labels.
