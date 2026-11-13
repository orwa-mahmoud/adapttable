---
"@adapttable/angular": minor
"@adapttable/angular-aria": patch
"@adapttable/angular-cdk": patch
"@adapttable/angular-unstyled": patch
"@adapttable/angular-material": patch
"@adapttable/ng-bootstrap": patch
"@adapttable/ng-zorro": patch
"@adapttable/ngx-bootstrap": patch
"@adapttable/spartan": patch
"@adapttable/taiga-ui": patch
---

Slot props read rows as `unknown` (`EditableCellSlotProps<unknown>`, `TreeCellProps<unknown>`, …), and a column's `filter` is typed as the filter shorthand core reads: a filter type name or a filter spec.
