---
"@adapttable/core": major
"@adapttable/react": patch
"@adapttable/vue": patch
---

A feature id resolves to one declaration everywhere: when two features share an id, the last one supplies the table's options, labels, registrations and slot fills, and the earlier one contributes nothing. `resolveFeatureIds` on `@adapttable/core/binding` applies the rule and warns in development.
