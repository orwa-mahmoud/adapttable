---
"@adapttable/vue": patch
"@adapttable/vue-unstyled": patch
---

Preserve generic native editing, filtering, grouping and row-reorder component props on Vue 3.5.0 with compiler-generated single-file component declarations. Keep the existing component scopes, root attributes, editing drafts and focus behavior.

Keep the existing editing prop contracts resolvable through bundled declarations with transparent aliases. Check every published binding and native source entry, including feature barrels, against the current Vue version and the declared peer floor with positive and exact negative consumers.
