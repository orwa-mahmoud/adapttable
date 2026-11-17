---
"@adapttable/angular": patch
"@adapttable/element-plus": patch
"@adapttable/naive-ui": patch
"@adapttable/nuxt-ui": patch
"@adapttable/quasar": patch
"@adapttable/react": patch
"@adapttable/reka-ui": patch
"@adapttable/shadcn-vue": patch
"@adapttable/vue": minor
"@adapttable/vue-unstyled": patch
"@adapttable/vuetify": patch
---

A table redraws only what changed.

- Selecting one row or editing one cell redraws that row alone in React, Vue and Angular. An edit the host writes back into `data` redraws only the edited row, with cell navigation and with selection on.
- React's `useFrontendData`, `useServerData` and `useTableData` return the same source object while nothing in it changes, and a table with a column layout keeps its columns across renders that leave them unchanged, so a host re-rendering for its own state no longer re-renders every row.
- Vue draws each body row and card in a component of its own (`tableRowView`, `keepTableControls`, `NO_CLASS_NAMES`); `rowAttrs` and `cardAttrs` take an optional `state` whose `selected` is used in place of the table's selection.
- Angular writes row, cell and control attributes only when their value changes; a controlled `checked` or `value` the element changed is still put back.
- A Vue table's sync option copy reads the raw record, so writing one option does not schedule another copy of the same record.
