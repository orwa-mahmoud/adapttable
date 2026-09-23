---
title: "React table SSR & server components — Next.js (v2)"
description: "Render AdaptTable on the server: where the client boundary goes in
  the Next.js App Router, DOM-free SSR, hydration without mismatches, and
  Suspense."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table SSR & server components —
      Next.js","item":"https://orwa-mahmoud.github.io/adapttable/v2/ssr-rsc/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/ssr-rsc.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/ssr-rsc.png
slug: v2/ssr-rsc
---

AdaptTable renders on the server, hydrates without mismatches, and sits inside
Suspense and streaming boundaries — provided the client boundary goes in the
right place. This page says where that is and why.

**Related:** [Data tiers](/adapttable/v2/data-tiers/) · [URL state](/adapttable/v2/url-state/) ·
[Getting started](/adapttable/v2/getting-started/)

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

**`@adapttable/i18n` is deliberately the exception.** It is plain data and pure
functions — no hooks, no directive — so locale labels can be imported and
resolved in a server component and passed down as props.
`@adapttable/core/query` (the React-free URL codecs) and `@adapttable/server`
carry no directive either, so a route handler can decode a shared link.

## Server rendering without a DOM

During SSR there is no `window`, `document`, `matchMedia` or `localStorage`.
The engine renders through `renderToString` with none of them present — the
frontend tier, the server tier, and the table shell are each covered by a test
that runs in a DOM-free environment.

Two seams matter when you render on a server:

* **`forceMobile`** decides the card/table layout explicitly. The automatic
  choice comes from a media query, which a server cannot answer; passing the
  value you want makes the server and the first client render agree.
* **`urlAdapter`** defaults to the browser History API. On the server, pass
  `createMemoryAdapter(searchParamsString)` so the table restores state from
  the request's query string instead of reaching for a `window` that is not
  there.

```tsx
import { createMemoryAdapter } from "@adapttable/core";

const urlAdapter =
  typeof window === "undefined"
    ? createMemoryAdapter(searchParams.toString())
    : undefined; // the browser default
```

## Hydration

The rule is the ordinary React one: the server's markup and the first client
render must match. Two things in a table can break it, and both have an answer
above:

* **Layout** — if the server guesses desktop and the client is a phone, the
  first render disagrees. Pass `forceMobile` when you render on a server.
* **URL-restored state** — sort, filters and page come from the query string.
  Give the server the same query string the browser has, through
  `createMemoryAdapter`, and both renders start from the same state.

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

* Works the same in **Next.js (App and Pages Router), Remix, and Vite SSR**.
* Server components can fetch, sort and filter before the table ever sees the
  data — pass the finished rows and let the table page them, or use the
  [server tier](/adapttable/v2/data-tiers/) and let it drive your endpoint.
* The `"use client"` directive is in the published build; you never add it to
  your own imports of AdaptTable.
