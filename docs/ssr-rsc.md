# React table with SSR, server components & streaming — Next.js App Router

AdaptTable renders on the server, hydrates without mismatches, and sits inside
Suspense and streaming boundaries — provided the client boundary goes in the
right place. This page says where that is and why.

**Related:** [Data tiers](./data-tiers.md) · [URL state](./url-state.md) ·
[Getting started](./getting-started.md)

## The short version

```tsx
// app/people/page.tsx — a server component
import { PeopleTable } from "./PeopleTable";

export default async function PeoplePage() {
  const people = await db.people.findMany(); // runs on the server
  return <PeopleTable data={people} />; // client component, see below
}
```

```tsx
// app/people/PeopleTable.tsx
"use client";

import { DataTable } from "@adapttable/mantine";

export interface Person {
  id: string;
  name: string;
  role: string;
}

const columns = [{ key: "name", sortable: true }, { key: "role" }];

export function PeopleTable({ data }: { data: Person[] }) {
  return <DataTable data={data} columns={columns} rowKey={(row) => row.id} />;
}
```

Fetch on the server, pass the rows down, render the table in a client
component. That is the whole pattern.

## Why the table is a client component

A table is interactive: it holds state for sorting, filters, the open editor,
the selection. React Server Components cannot hold state, so the table has to
sit on the client side of the boundary. That is a property of what a table is,
not a limitation of this one.

Every package that ships hooks carries the `"use client"` directive in its
build, so importing `DataTable` from a server component works without you
writing a wrapper. A test in the release gate asserts the directive is on every
built entry — if it were ever dropped, an App Router build would fail on the
first `useState` with an error pointing at your application rather than at us.

**The packages without hooks carry no directive** — every entry of
`@adapttable/core`, plus `@adapttable/i18n`, `@adapttable/server`,
`@adapttable/ai` and `@adapttable/cli`. They are plain data and pure
functions, so locale labels, URL codecs and query parsers can be imported and
run in a server component and their results passed down as props.

## Server rendering without a DOM

During SSR there is no `window`, `document`, `matchMedia` or `localStorage`.
The engine renders through `renderToString` with none of them present — the
frontend tier, the server tier, and the table shell are each covered by a test
that runs in a DOM-free environment.

Two seams matter when you render on a server:

- **`forceMobile`** decides the card/table layout explicitly. The automatic
  choice comes from a media query, which a server cannot answer; passing the
  value you want makes the server and the first client render agree on the
  layout. `paginationMode="auto"` resolves from the media query on its own and
  does not read `forceMobile`, so pass `paginationMode` explicitly as well.
- **`urlAdapter`** defaults to the browser History API, whose hydration
  snapshot is an empty query string. To render the requested slice on the
  server, pass the same explicit adapter in both renders — a router adapter
  that reads the request's search params on the server and the address bar on
  the client. With an explicit adapter the hydration snapshot is that
  adapter's own search, so both renders start from the same state.

```tsx
"use client";

import { DataTable } from "@adapttable/mantine";

import { useNextAdapter } from "./useNextAdapter"; // the recipe in URL state

export interface Person {
  id: string;
  name: string;
  role: string;
}

const columns = [{ key: "name", sortable: true }, { key: "role" }];

export function PeopleTable({ data }: { data: Person[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      rowKey={(row) => row.id}
      urlAdapter={useNextAdapter()}
      forceMobile={false} // decided per request, e.g. from the user agent
      paginationMode="paged"
    />
  );
}
```

[`useNextAdapter`](./url-state.md#nextjs-app-router) wraps `useSearchParams()`,
which Next.js answers from the request during SSR. A server-only
`createMemoryAdapter(query)` (from `@adapttable/react` or the kit) with no
adapter on the client does not match: the client hydrates from `""`.

## Hydration

The rule is the ordinary React one: the server's markup and the first client
render must match. Two things in a table can break it, and both have an answer
above:

- **Layout** — if the server guesses desktop and the client is a phone, the
  first render disagrees. Pass `forceMobile` and `paginationMode` when you
  render on a server.
- **URL-restored state** — sort, filters and page come from the query string.
  Pass one explicit router adapter to both renders and they start from the
  same state.

Anything read from `localStorage` — saved views, a stored column layout —
is applied after mount by design, so the first client render matches the
server and the stored state arrives immediately afterwards.

## Suspense and streaming

The table does not suspend. It renders whatever rows it is given, including
none, so it never blocks a streaming response by itself.

What suspends is your data. Put the boundary around the component that fetches:

```tsx
<Suspense fallback={<TableSkeleton />}>
  <PeopleTable /> {/* awaits its own data */}
</Suspense>
```

For a table that fetches on the client instead, `loading` drives the built-in
skeleton, and `skeletonRows` sets how many rows it shows — a Suspense boundary
is not needed for that case and adds nothing.

The table's first paint needs no measurement — column widths, sticky offsets
and virtualization all resolve after mount — so a table inside a late-arriving
chunk renders from its props alone, exactly as it does on a normal client
render.

## Notes

- Works the same in **Next.js (App and Pages Router), Remix, and Vite SSR**.
- Server components can fetch, sort and filter before the table ever sees the
  data — pass the finished rows and let the table page them, or use the
  [server tier](./data-tiers.md) and let it drive your endpoint.
- The `"use client"` directive is in the published build; you never add it to
  your own imports of AdaptTable.
