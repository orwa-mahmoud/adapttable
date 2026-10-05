---
"@adapttable/vue": patch
---

Keep the column-menu query and row-stream status and error declarations compatible with Vue 3.5.0. Explicit shallow-ref types preserve the existing mutable query, readonly stream state and runtime behavior when the package is built with a newer Vue version.
