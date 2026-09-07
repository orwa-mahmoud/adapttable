---
"@adapttable/ai": patch
---

Three fixes to the HTTP bridge, all of them things a real model does on its
first turn.

A backend response carrying both actions and `needs` used to have its actions
discarded and a discovery round spent; after three such rounds the turn failed
with nothing done. Actions are now collected from every round and run, and
only a backend that produced nothing at all still fails that way.

Asking to describe a capability the table does not offer ended the whole turn.
It now answers "no such capability" and carries on, while a round that
produced only unknown names still counts against the discovery budget.

`AgentHttpTurnResult` carries `keys` — the capability behind each result — so
a receipt can say `view.setFilters: done` instead of `done`.

The guides for `view.setSort` and `view.setGroupBy` now name their parameter
`key` explicitly, and `view.setFilters` says plainly that the filter model
belongs to the application and has no schema to fetch.
