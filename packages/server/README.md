# @adapttable/server

Parse and validate an [AdaptTable](https://orwa-mahmoud.github.io/adapttable/)
query on the server — one typed contract from the URL to your backend.

The table puts its whole state in the URL, which is what makes a view
shareable and a page reloadable. The moment that URL reaches a backend it
stops being state and becomes **user input**: `limit=999999`,
`sortBy=password`, a filter on a column that is not in the table at all.

## Features

- **Validation, not just parsing** — you give it the columns a client is
  allowed to name, and everything else is dropped. A column name chosen by
  the caller never reaches your database.
- **Never throws** — a stale bookmark or a hand-edited link degrades to a
  simpler table instead of an error page, and everything refused is reported
  in `rejected` so a route that would rather answer 400 can.
- **The whole query** — page, limit and offset, search, the multi-sort chain,
  grouping, column filters, the advanced filter tree, the pivot
  configuration, and the cursor.
- **All-or-nothing filter trees** — dropping one condition out of an AND
  quietly widens the result set, so an unknown field discards the tree rather
  than a branch of it.
- **Any framework** — takes a `Request`, a `URL`, a query string or
  `URLSearchParams`, so Next.js route handlers, Remix loaders and Server
  Actions all work without an adapter.
- **Backend-agnostic** — no ORM, no SQL. It describes what was asked for;
  what you do with it is yours.
- **No React** — the codecs come from `@adapttable/core/query`, the entry with
  no hooks and no client boundary, so an Express or Fastify service installs a
  1.6 KB parser and not a UI library.

## Install

```bash
npm install @adapttable/server
```

## Use

```ts
import { parseTableQuery } from "@adapttable/server";

export async function GET(request: Request) {
  const query = parseTableQuery(request, {
    columns: ["name", "team", "budget"],
    maxLimit: 100,
  });

  if (query.rejected.length > 0) {
    // Optional: be strict instead of forgiving.
    return Response.json({ error: query.rejected }, { status: 400 });
  }

  return Response.json(await people(query));
}
```

Full documentation: [Server queries](https://orwa-mahmoud.github.io/adapttable/server-queries/).

## License

MIT © Orwa Mahmoud
