---
"@adapttable/core": minor
---

Every focused subpath now exports the types its own signatures hand back.
`@adapttable/core/pivot` returned a `ColumnDef` whose `header`, `footer`,
`filter` and `editor` types could not be named from `/pivot`; `/xlsx` and
`/pdf` returned an `ExportWriter` the same way. Reaching for
`@adapttable/core` to name part of what a subpath already gave you is the
detour this removes — 413 routes across the nine entries, of which 380 are
types core already supported and 33 were previously unreachable from anywhere.

`useOverlayTransition`, `OverlayTransition`, `OVERLAY_MOTION`,
`stopEditKeys` and `hasActiveHeaderFilter` are supported on
`@adapttable/core/adapter`, which the versioning policy already described as
having no private channel behind it. `editableCellController` is exported from
the main entry beside the type of the same name.
