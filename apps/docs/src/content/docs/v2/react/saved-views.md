---
title: "React table saved views, shareable by URL (v2)"
description: Save filters, sort and column layout as named React table views
  users can restore and share by URL — built into AdaptTable across every
  adapter.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table saved views, shareable by
      URL","item":"https://adapttable.orwamahmoud.com/v2/react/saved-views/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/saved-views.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/saved-views.png
slug: v2/react/saved-views
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/55da84f73ec078c0a075b812710f1619ec300875/starters/mantine?file=src%2FApp.tsx) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](/v2/react/getting-started/#try-it-in-stackblitz)

Let users capture the table's current state under a name and re-apply it
later. One prop mounts a ready-made menu; a headless hook backs custom UIs.

A view captures **everything the table can put in a URL**: search, the
multi-sort chain, page and page size, the simple filters and the advanced
filter tree, grouping and which groups are collapsed, the whole column layout
(order, hidden, pinned, widths, collapsed column groups), pinned rows, density,
the [pivot configuration](/v2/react/pivot/) and typed
[formula columns](/v2/react/formulas/). The parts that take longest to
rebuild by hand are exactly the parts worth capturing.

## Managing the list

`useSavedViews` returns the list plus the operations a management UI needs:

```tsx
const { views, save, apply, remove, rename, move, setDefault, defaultView } =
  useSavedViews({ storageKey: "people-views" });
```

`rename(from, to)` keeps the view's place in the list, and refuses a name that
is already taken — silently merging two views is how a rename loses one.
`move(name, -1 | 1)` steps a view through the list and stops at either end
rather than wrapping. `setDefault(name)` marks the default view, which the hook returns as
`defaultView` for the host to apply on open; naming the same view again clears it, and only one view can ever hold it.
Rename, move, set-default and delete all refuse a view this reader does not own,
so the panel's disabled controls and the hook agree.

Every operation is a no-op on a name that is not there, so a management UI
cannot get the list into a state the table will not accept.

## Views outliving the table that saved them

A saved view outlives the code that saved it — that is the point of saving one
— so each carries the schema version it was written at, and the table upgrades
what it reads.

```tsx
const views = useSavedViews({
  storageKey: "people-views",
  migrate: (view, from) => {
    if (from < 2) {
      // A column this table renamed since that view was saved.
      return {
        ...view,
        search: view.search.replace("colHide=email", "colHide=contact"),
      };
    }
    return view;
  },
});
```

`migrate` runs only for views behind `SAVED_VIEW_VERSION`, and is told which
version each came from. Views saved before versioning existed have no number
and are treated as version 1, which is what they are.

Returning `null` drops a view. That is a real answer: a view whose columns no
longer exist restores a table nobody asked for, and applying it silently is
worse than losing it. A migration that throws costs that view alone — one bad
entry in storage should not take the whole list with it.

Loading happens on mount and when `storageKey` changes. A `store` or a
`migrate` written inline changes identity on every render, so neither can be
allowed to trigger a reload; call `reload()` when you want the list read again.

## Keeping views on a server

`localStorage` is the zero-config default: a table that passes nothing keeps
working offline with no server at all. Pass a `store` and it takes over
completely — two sources of truth for one list is how a view comes back after
being deleted.

```tsx
const views = useSavedViews({
  storageKey: "people-views",
  visibility: "team", // what `save` marks a new view as
  store: {
    list: () => fetch("/api/views").then((r) => r.json()),
    save: (view) =>
      fetch("/api/views", { method: "POST", body: JSON.stringify(view) }),
    remove: (name) => fetch(`/api/views/${name}`, { method: "DELETE" }),
    reorder: (names) =>
      fetch("/api/views/order", {
        method: "PUT",
        body: JSON.stringify(names),
      }),
  },
});
```

The store is asked for **one view at a time**, never the whole list: sending
the list back would overwrite whatever other people changed between the load
and the save. A store that cannot be reached leaves the list empty rather than
throwing into a render — the table still works, the views simply are not there.

One gesture can be more than one write. Switching the default saves **two**
views — the one that gains the flag and the one that loses it — because a
cleared flag that never reached the store comes back set, and then two views
claim to be the default.

### Order

`reorder` is where the list's order lives. Order belongs to the list rather than
to any one view, so it has nowhere to go through `save`, and it travels as names
so that persisting an order carries no view contents with it and cannot overwrite
someone else's edit. It arrives after the same operation's own `save` and
`remove` writes have landed, so a renamed view's new name is already known by
the time its place in the list turns up.

`reorder` is **optional**, and a store without it keeps working: `list`, `save`
and `remove` carry saving, renaming, deleting and the default exactly as before.
What such a store cannot do is remember an order — `move` reorders the list on
screen for that session, and the next `list()` decides the order again, as does
where a renamed view lands. Implement `reorder` when reordering has to survive a
reload.

### Views you may not change

A view carries `visibility` (`"private"` or `"team"`) and `readOnly`. A team
view someone else owns arrives read-only, and both halves honour it: the panel
shows a **Read-only** badge with its rename, reorder, set-default and delete
controls disabled, and the hook refuses those operations too. Applying it stays
enabled, since that is the point of a shared view.

Disabled rather than absent is deliberate. An absent control reads as "no such
feature"; a disabled one reads as "not yours". A control that silently does
nothing is a bug the user gets blamed for.

## The management panel

The saved-views *menu* answers "switch to a view". Keeping the list in order is
a different job, and putting both in one dropdown makes the common one harder —
so management is a panel:

```tsx
import { SavedViewsPanelChrome } from "@adapttable/core/adapter";

<SavedViewsPanelChrome
  views={views}
  onApply={apply}
  onRename={rename}
  onMove={move}
  onSetDefault={setDefault}
  onRemove={remove}
  slots={slots}
/>;
```

`SavedViewsPanelSlots` names the four kit-supplied pieces —
`SavedViewsPanelSurfaceProps` (the titled card), `SavedViewsPanelRowProps` (one
view and its controls), `SavedViewsPanelInputProps` (the inline rename box) and
`SavedViewsPanelEmptyProps`. `SavedViewsPanelChromeProps` is what the panel
itself takes.

Every adapter ships it pre-wired as `SavedViewsPanel`:

```tsx
import { SavedViewsPanel } from "@adapttable/mantine";

<SavedViewsPanel
  views={views}
  onApply={apply}
  onRename={rename}
  onMove={move}
  onSetDefault={setDefault}
  onRemove={remove}
  footer={<span>Upgraded on load: Legacy view (v1)</span>}
/>;
```

`footer` puts anything of yours inside the card, under the list — a note about
where the views came from, a link to your own docs. Outside the card a line
like that reads as a caption belonging to whatever follows it on the page.

The panel is a card with a title, and each view is one row inside it. The row
has a single primary action: **applying a view is clicking its name**, which is
the widest target on the row and the thing a reader wants nine times out of
ten. Rename, move up, move down, set-default and delete are icons in a compact
cluster at the end of the line, each with its own localized accessible name.
`SavedViewRowControl` describes one of them and `SavedViewControlKey` names
which — an adapter maps over `controls` rather than hand-writing five buttons,
so no kit can render four of them or put them in a different order.

Reordering is buttons rather than drag, because a list you can only reorder by
dragging is a list some people cannot reorder. The move a row cannot make is
disabled rather than removed, so the row does not jump as the list is
reordered. Renaming is an inline input rather than a dialog: the name is
already on screen, and Escape abandons the edit without changing anything.

The card names four parts for styling and testing: `saved-views-panel` and
`saved-views-title` on the card, `saved-view-row` on each view, and
`saved-views-footer` on your note.

## Example

```tsx
// Needs your kit's provider once at the root (e.g. <MantineProvider>).
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, shadcn, unstyled

interface Person {
  id: string;
  name: string;
  department: { name: string };
  status: string;
  salary: number;
}

const data: Person[] = [
  {
    id: "1",
    name: "Amira Haddad",
    department: { name: "Engineering" },
    status: "active",
    salary: 98000,
  },
  {
    id: "2",
    name: "Jonas Weber",
    department: { name: "Design" },
    status: "onleave",
    salary: 76000,
  },
  {
    id: "3",
    name: "Priya Nair",
    department: { name: "Engineering" },
    status: "active",
    salary: 112000,
  },
  {
    id: "4",
    name: "Sam Ortiz",
    department: { name: "Sales" },
    status: "left",
    salary: 64000,
  },
];

export function PeopleTable() {
  return (
    <DataTable
      data={data}
      rowKey={(r) => r.id}
      columns={[
        { key: "name", sortable: true },
        {
          key: "department.name",
          header: "Department",
          filter: { type: "select", options: "auto" },
        },
        { key: "status", filter: { type: "multiSelect", options: "auto" } },
        { key: "salary", filter: "numberRange", sortable: true },
      ]}
      enableColumnMenu
      savedViews={{ storageKey: "people-views" }}
    />
  );
}
```

## How it works

* Setting `savedViews` renders the kit's built-in Saved-views menu in the
  toolbar next to the Columns button: click a name to apply it, the trailing
  ✕ to delete it, or type a name and Save to capture the current state.
* A view stores the table-scoped query string — search, sort, page and
  page-size, every `f_*` filter param, and the URL-persisted column layout.
  Only this table's params are captured; saving under an existing name
  replaces it.
* Applying first drops this table's current params, then lays the view's
  over — other tables sharing the URL are untouched, and anything the view
  doesn't mention returns to its default.
* The list persists as JSON under `storageKey` (localStorage by default).
* `urlAdapter` and `urlKey` default to the table's own `urlAdapter` / `urlKey`,
  so usually only `storageKey` is needed.
* The same options also mount the menu through the feature factory:
  `features={[savedViews(options)]}` from `@adapttable/<kit>/saved-views`.

## Options

`savedViews` takes `UseSavedViewsOptions` (the same options as the headless
hook):

| Prop         | Type                  | Default                                | Description                                                                       |
| ------------ | --------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| `storageKey` | `string`              | — (required)                           | Storage key for the view list, e.g. `"people-table-views"`.                       |
| `storage`    | `LayoutStorage`       | `localStorage` (memory-only under SSR) | Storage backend — supply your own to persist elsewhere.                           |
| `store`      | `SavedViewsStore`     | —                                      | Keep views elsewhere (a server); replaces `storage` entirely.                     |
| `visibility` | `"private" \| "team"` | `"private"`                            | What `save` marks a new view as.                                                  |
| `migrate`    | `SavedViewMigration`  | —                                      | Upgrade or drop (`null`) views saved at an older version.                         |
| `urlAdapter` | `UrlStateAdapter`     | the table's `urlAdapter`               | The table's URL-state backend.                                                    |
| `urlKey`     | `string`              | the table's `urlKey`                   | The table's URL namespace — must match the table's `urlKey`.                      |
| `urlSync`    | `boolean`             | `true`                                 | `false` (with no `urlAdapter`) captures and applies against an in-memory backend. |

## Notes

* **SSR-safe**: stored views hydrate in an effect after mount (no
  hydration mismatch); blocked storage is tolerated.

* With `urlSync={false}` the menu captures and applies the table's
  IN-MEMORY state — the address bar never changes and foreign query
  params are never touched (`apply` writes only params the table owns).

* For custom UIs, use the headless hook and wire any menu into the `toolbar`
  slot (each adapter also exports its `SavedViewsMenu` component to pair with
  it):

  ```tsx
  import { useSavedViews } from "@adapttable/core";

  const views = useSavedViews({ storageKey: "people-views", urlKey: "people" });
  // views.views, views.save("Active EU"), views.apply("Active EU"),
  // views.remove("Active EU")
  ```

* Column layout is part of a view only when it lives in the URL (wire
  `useColumnLayoutUrlState`); the localStorage-backed layout from
  `useColumnLayoutStorageState` is not captured.

* Views are local to the browser by default. Pass `storage` to persist them
  elsewhere; a full or denied storage degrades gracefully — the in-memory
  list keeps working for the session.

* Multiple tables on one page: give each table its own `urlKey` (so params
  are namespaced, `left.q`, `left.f_status`, …) and a distinct `storageKey`.
  Each menu captures and applies only its own namespace.

* A view stores state, not rows — applying one re-runs the usual
  search/filter/sort pipeline (or re-fires `onQueryChange` on the server
  tier).

* The menu's `savedViews` / `saveView` / `viewName` / `deleteView` labels are
  overridable via `labels` and localized by the `@adapttable/i18n` presets.

See it live in the [demo](https://adapttable.orwamahmoud.com/react/demo/).
