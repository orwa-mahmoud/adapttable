---
"@adapttable/core": minor
"@adapttable/antd": patch
---

antd's root table now mounts find, grid focus, export and edit history behind
the same live slots the other kits use, so those engines stay out of a plain
import. `DISABLED_FIND`, `DISABLED_EXPORT`, `disabledHistory` and
`windowedTableAria` are the inert stand-ins on `@adapttable/core/adapter`.
Every published adapter root is held to 80 KB min+gzip and the v3 consumer
fixtures refuse a leaked optional marker.
