---
"@adapttable/ngx-bootstrap": minor
---

Add the first public Angular 22 zoneless ngx-bootstrap adapter with scoped
Bootstrap styles, native overlays, feature entries and assistant controls.

With ngx-bootstrap 22.0.0 and Angular 22.2, early pagination-anchor clicks queued
before hydration can fail during event replay. Ordinary hydration and paging
after hydration work. Users must click again after hydration; the adapter does
not automatically retry the lost early click.
