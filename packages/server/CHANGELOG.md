# @adapttable/server

## 0.1.1

### Patch Changes

- f8ba086: The README states the query parser's measured size, 1.6 KB gzipped, and the
  bundle budget now checks that figure against the build.
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
  - @adapttable/core@2.9.0

## 0.1.0

### Minor Changes

- 96f8e42: New package: `@adapttable/server` parses and validates an AdaptTable query on
  the server.

  The table's URL is state in the browser and user input everywhere else.
  `parseTableQuery` takes the columns a client is allowed to name and drops
  anything else — a `sortBy` chosen by the caller never reaches your database.

  It never throws: a stale bookmark degrades to a simpler table rather than an
  error page, and everything refused is reported so a route that would rather
  answer 400 can. Filter trees are all-or-nothing, because dropping one condition
  out of an AND quietly widens the result set.

  Takes a `Request`, a `URL`, a query string or `URLSearchParams`, so Next.js
  route handlers, Remix loaders and Server Actions all work without an adapter.

### Patch Changes

- ce10f8e: A shared pivot keeps its subtotals, its grand totals and its folded groups.

  The `pivot` parameter carries all of it —
  `pivot=rows:region,team;cols:quarter;sum:amount;sub:0;hide:EU/Alpha` — so a link
  or a saved view reopens showing what its sender was looking at, not the axes
  with everything else switched back on. `usePivotUrlState` returns `collapsed`
  and `onCollapsedChange` beside the configuration, and `collapsed` is what
  `pivot`'s option takes, so the link and the rendering cannot disagree.

  `serializePivotState` and `deserializePivotState` are the encoding including the
  folded set, as a `PivotUrlState`; both are on `@adapttable/core/pivot` and on the
  React-free `@adapttable/core/query`. Only departures from the defaults are
  written, so a link or a view from before these fields existed reads back exactly
  as it did.

  `parseTableQuery` keeps the switches on its `pivot` and reports the folded keys
  as `pivotCollapsed`. They are dimension values rather than column names, so no
  schema vouches for them: parameterise them like a search term.

- 4cc9283: Runs in a backend with no React. The codecs come from `@adapttable/core/query`,
  so nothing in the installed graph imports React or carries a `"use client"`
  boundary — `npm install @adapttable/server` in an Express or Fastify service
  gets a 1.5 KB parser and no UI library.
- Updated dependencies [0bfd172]
- Updated dependencies [8845b98]
- Updated dependencies [1bb8ad7]
- Updated dependencies [894a534]
- Updated dependencies [e4bfb52]
- Updated dependencies [6f2be24]
- Updated dependencies [aec669e]
- Updated dependencies [fa40ade]
- Updated dependencies [d506851]
- Updated dependencies [e27bd64]
- Updated dependencies [0a2dbfc]
- Updated dependencies [2401b28]
- Updated dependencies [96a0b6e]
- Updated dependencies [eec7ebc]
- Updated dependencies [dc8dfda]
- Updated dependencies [57dde1f]
- Updated dependencies [2ac7bbd]
- Updated dependencies [31a5bf5]
- Updated dependencies [b3475de]
- Updated dependencies [42b6d58]
- Updated dependencies [96515e8]
- Updated dependencies [7fd1e26]
- Updated dependencies [0dee45f]
- Updated dependencies [5df7f9f]
- Updated dependencies [340f14b]
- Updated dependencies [8845b98]
- Updated dependencies [29d155e]
- Updated dependencies [b3475de]
- Updated dependencies [1a20be6]
- Updated dependencies [5c3d728]
- Updated dependencies [19467ec]
- Updated dependencies [31a5bf5]
- Updated dependencies [b30f8ae]
- Updated dependencies [25d4981]
- Updated dependencies [9384217]
- Updated dependencies [ce10f8e]
- Updated dependencies [2b184ca]
- Updated dependencies [d1753b2]
- Updated dependencies [50ca0c5]
- Updated dependencies [241f9d4]
- Updated dependencies [7477cde]
- Updated dependencies [aec3bf8]
- Updated dependencies [8845b98]
- Updated dependencies [d490ff8]
- Updated dependencies [853385d]
- Updated dependencies [d9bbd70]
- Updated dependencies [aa88f46]
- Updated dependencies [26d6855]
- Updated dependencies [010beb4]
- Updated dependencies [6997d72]
- Updated dependencies [adbd98e]
- Updated dependencies [44df311]
- Updated dependencies [c4ffc69]
- Updated dependencies [8e9c854]
- Updated dependencies [8359d83]
- Updated dependencies [4b8e0aa]
- Updated dependencies [0b58368]
- Updated dependencies [fb30d4a]
- Updated dependencies [2ac7bbd]
- Updated dependencies [b3475de]
- Updated dependencies [864ef5d]
- Updated dependencies [b3475de]
  - @adapttable/core@2.6.0
