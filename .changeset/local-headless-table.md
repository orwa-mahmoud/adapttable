---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/vue": minor
"@adapttable/angular": minor
---

A headless table that keeps its view state in memory no longer bundles the URL code. React and Vue gain `useLocalFrontendData` and `useLocalTableViewState`, Angular `injectLocalFrontendData` and `injectLocalTableViewState`, over core's `createLocalTableViewStore`. Search, sort, filters, grouping and paging behave as with `urlSync: false`; the table measures about 2.3 KiB smaller in React and Vue and 2.5 KiB smaller in Angular.
