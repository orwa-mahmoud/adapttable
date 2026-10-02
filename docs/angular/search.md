# Angular table search and find-in-table

Search changes which rows match the table's query. Find-in-table locates text
in the rows already represented by the table without changing the query.
Choose the behavior that matches the reader's task.

## Choose the searchable text

The kit's search box is present by default. A frontend source searches row
values; supply `getSearchText` when only particular fields should participate.

```ts
import { Component, signal } from "@angular/core";
import { injectFrontendData, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { findInTable } from "@adapttable/angular-unstyled/find-in-table";

interface Person {
  id: string;
  name: string;
  email: string;
}

@Component({
  selector: "searchable-people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [source]="source"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      searchPlaceholder="Search names and email addresses"
      tableLabel="People"
    />
  `,
})
export class SearchablePeopleTable {
  readonly people = signal<Person[]>([
    { id: "ada", name: "Ada Lovelace", email: "ada@example.com" },
  ]);
  readonly columns: ColumnDef<Person>[] = [{ key: "name" }, { key: "email" }];
  readonly rowKey = (row: Person) => row.id;
  readonly source = injectFrontendData({
    data: this.people,
    columns: this.columns,
    getSearchText: (row) => `${row.name} ${row.email}`,
    urlKey: "people",
  });
  readonly features = [findInTable({ button: true })];
}
```

The shell does not expose `getSearchText` as an input; use a prebuilt frontend
source as above. `[searchable]="false"` hides the search box, but does not
clear a search restored in the source. Avoid leaving a hidden active search
unless the host provides another way to inspect and clear it.

## Typing and committed search

The search input updates its displayed text immediately and commits a trimmed
term after 300 ms without another keystroke. URL changes, clear-all and other
external committed changes update the displayed text. Timers are cleared when
the table is destroyed.

Headless `injectDataTable` accepts `searchDebounceMs`. Its `searchValue()` is
the live input, while `search()` is the committed term. `setSearchValue(text)`
debounces; `setSearch(text)` commits immediately. Bind `searchInputAttrs()`
using `AdaptAttrs` to preserve the controlled value and input handler.

On the server tier, committing search invokes `onQueryChange` and resets to
page 1. Honor its abort signal and publish only the current query's response.
A frontend `getSearchText` cannot customize a server's search implementation;
that belongs to the endpoint.

## Find within the current table

`findInTable()` is opt-in from either kit's `/find-in-table` entry.
`findInTable({ button: true })` also draws a toolbar trigger. It supplies a
find field, match navigation and marked results. Its table-scoped shortcut
is Ctrl/Cmd+F when focus is within the table; it is not an instruction to fetch
every server page.

Keep the kit's focus and scroll handling when customizing the find surface.
For a server table, unloaded rows cannot be found locally. Use query search
when the user needs to locate records across the full remote dataset.

Search state is URL-backed by default and can be part of a saved view.
Use distinct `urlKey` values when independent tables share the page.

See [Filtering](./filtering.md), [Data tiers](./data-tiers.md),
[URL state](./url-state.md) and [Saved views](./saved-views.md).
