---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/angular": patch
"@adapttable/vue": patch
---

Add optional tree-shape readers to export contexts. React, Angular and Vue all
and selected exports include loaded descendants across filtered roots/pages;
page files follow visible expansion. File, hook and request data agree, while
summary callbacks and page request metadata retain original source-shaped rows.

Headless contexts without shape readers retain conservative membership filtering.
Runtime tree inventories and server export routes keep their existing behavior.
