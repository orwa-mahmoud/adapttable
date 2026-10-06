---
"@adapttable/core": minor
"@adapttable/react": minor
"@adapttable/angular": patch
"@adapttable/vue": patch
---

Add optional tree shape readers to export contexts and use them in the React,
Angular and Vue bindings to export loaded descendants across filtered roots and
pages. All and selected exports now resolve the complete available hierarchy;
page files follow visible expansion while page hook and request metadata retain
source rows. All/selected file, hook and request data rows agree, while summary
callbacks retain the original source-shaped rows, preserving root rollups.
Headless contexts without shape readers retain conservative source membership
filtering. Runtime tree inventories and server export routes are
unchanged.
